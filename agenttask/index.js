// dsh-AgentTask host 侧 — AgentTask 数据 + SSE + 进阶重启执行
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'

const name = 'dsh-agenttask'
const inject = ['webServer', 'sessions', 'agents']

function findRestartScript() {
  const candidates = [
    process.env.PREFIX ? `${process.env.PREFIX}/bin/dsh-web-restart` : '',
    '/data/data/com.termux/files/usr/bin/dsh-web-restart',
    '/usr/local/bin/dsh-web-restart',
    '/usr/bin/dsh-web-restart',
  ]
  for (const p of candidates) if (p && existsSync(p)) return p
  return null
}
const require = createRequire(import.meta.url)
const RESTART_SCRIPT = findRestartScript()

function apply(ctx) {
  let reloadClients = []
  const pendingRestarts = new Map()
  let reqSeq = 0

  // SSE 通道: reload / restart 帧
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/dshat-reload-sse',
    handler: (req, res) => {
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', 'connection': 'keep-alive' })
      res.write(': connected\n\n')
      reloadClients.push(res)
      req.on('close', () => { reloadClients = reloadClients.filter((r) => r !== res) })
    },
  })

  // 前端确认回传: allow/deny
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/dshat-restart-confirm',
    handler: (req, res) => {
      try {
        const u = new URL(req.url, 'http://x')
        const reqId = u.searchParams.get('req') || ''
        const decision = u.searchParams.get('decision') || 'deny'
        const resolve = pendingRestarts.get(reqId)
        if (resolve) resolve(decision)
        pendingRestarts.delete(reqId)
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ ok: true }))
      } catch (error) {
        res.writeHead(500, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ ok: false, message: String(error) }))
      }
    },
  })

  // agent 工具: dshat_reload — 重载前端(非截断, host 存活, 数据不丢)
  try {
    ctx.tools.register({
      name: 'dshat_reload',
      description: '重载 dsh 前端页面(host 进程存活, 对话数据不丢; 等效用户点击重载按钮)。非截断操作, reload 后可继续工作。',
      parameters: {},
      output: {
        schema: { type: 'string' },
        render: (_args, text) => [{ type: 'text', text }]
      },
      async execute() {
        for (const r of reloadClients) { try { r.write('data: reload\n\n') } catch (e) {} }
        return '前端已触发重载'
      }
    })
  } catch (e) {}

  // agent 工具: dshat_restart — await 用户允许/拒绝
  try {
    ctx.tools.register({
      name: 'dshat_restart',
      description: '重启 dsh web 服务(host 进程)。铁律：只能作为当前会话的最后一步调用；调用后 dsh 会重启，当前会话和所有其他会话都会被截断，不能继续等待、不能继续任何后续动作。有他人对话运行时前端会弹窗等待用户允许/拒绝：允许则重启，拒绝则放弃；无他人对话时可直接重启。',
      parameters: {},
      output: {
        schema: { type: 'string' },
        render: (_args, text) => [{ type: 'text', text }]
      },
      async execute() {
        if (!RESTART_SCRIPT) return '重启失败：未找到 dsh-web-restart 脚本'
        const reqId = 'r' + (++reqSeq) + '-' + Date.now().toString(36)
        let sessionId = null
        try { sessionId = ctx.sessionId || ctx.currentSessionId || (ctx.session && ctx.session.id) || (ctx.current && ctx.current.id) || null } catch (e) {}
        const frame = JSON.stringify({ type: 'restart', req: reqId, sessionId })
        const decisionPromise = new Promise((resolve) => {
          pendingRestarts.set(reqId, resolve)
          setTimeout(() => { if (pendingRestarts.has(reqId)) { pendingRestarts.delete(reqId); resolve('timeout') } }, 120000)
        })
        for (const r of reloadClients) { try { r.write('data: ' + frame + '\n\n') } catch (e) {} }
        const decision = await decisionPromise
        if (decision === 'allow') {
          setTimeout(() => {
            const child = spawn('bash', [RESTART_SCRIPT], { detached: true, stdio: 'ignore' })
            child.unref()
          }, 3000)
          return '用户已允许重启, 正在重启 dsh'
        }
        if (decision === 'timeout') return '等待用户确认超时, 未重启'
        return '用户拒绝了重启'
      }
    })
  } catch (e) {}

  // 实际重启执行(前端确认后调用; 不推帧, 无循环)
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/dshat-restart-go',
    handler: (_req, res) => {
      try {
        if (!RESTART_SCRIPT) {
          res.writeHead(500, { 'content-type': 'application/json' })
          res.end(JSON.stringify({ ok: false, message: '未找到 dsh-web-restart 脚本' }))
          return
        }
        setTimeout(() => {
          const child = spawn('bash', [RESTART_SCRIPT], { detached: true, stdio: 'ignore' })
          child.unref()
        }, 3000)
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end('{"ok":true}')
      } catch (error) {
        res.writeHead(500, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ ok: false, message: String(error) }))
      }
    },
  })

  // AgentTask 数据: 运行中计数(ctx.agents 状态)
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/dshat-agents',
    handler: async (_req, res) => {
      try {
        const items = []
        const seen = new Set()
        const sessions = ctx.sessions ? ctx.sessions.list() : []
        for (const sess of sessions) {
          let running = false
          try { const agent = ctx.agents && ctx.agents.get(sess.id); running = !!agent && agent.status === 'running' } catch (e) {}
          let pending = false
          try {
            const evs = sess.events || []
            for (let i = evs.length - 1; i >= 0; i--) {
              const t = evs[i] && evs[i].type
              if (t === 'approval/requested' || t === 'question/requested' || t === 'plan-review/requested') { pending = true; break }
              if (t === 'turn' || t === 'status') break
            }
          } catch (e) {}
          let blank = true
          try { blank = (sess.events || []).length === 0 } catch (e) {}
          let title = ''
          try {
            const p = ctx.get('sessionProjections')
            if (p) { const b = p.snapshot(sess); if (b && b.values && b.values.title) title = b.values.title }
          } catch (e) {}
          seen.add(sess.id)
          items.push({ sessionId: sess.id, running, pending, blank, title })
        }
        try {
          const pers = ctx.get('sessionPersistence')
          if (pers) {
            const cold = await pers.list()
            for (const meta of cold) {
              if (seen.has(meta.id)) continue
              if (meta.cwd === undefined) continue
              seen.add(meta.id)
              let title = ''
              try {
                const c = ctx.get('sessionProjectionCache')
                if (c) { const b = c.cachedSnapshot(meta); if (b && b.values && b.values.title) title = b.values.title }
              } catch (e) {}
              items.push({ sessionId: meta.id, running: false, pending: false, blank: false, title })
            }
          }
        } catch (e) {}
        const running = items.filter((it) => it.running).length
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ ok: true, running, items }))
      } catch (error) {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ ok: false, message: String((error && error.message) || error) }))
      }
    },
  })
}

export { name, inject, apply }
