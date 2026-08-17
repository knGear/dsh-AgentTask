// dsh-AgentTask host 侧 — AgentTask 数据(纯任务监视, 无重启/重载)
const name = 'dsh-agenttask'
const inject = ['webServer', 'sessions', 'agents']

function apply(ctx) {
  // AgentTask 数据: 运行中计数(ctx.agents 状态) + 会话清单
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
