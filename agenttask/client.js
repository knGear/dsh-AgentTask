// dsh-AgentTask — 任务监视 + 进阶重启(独立插件, 全端可用)
// 数据 sessions.list.getSnapshot() 官方同源; 侧栏/本插件读同一快照 → 点消除两侧同步
window.__ModuleLoader__.load({
  id: 'dsh-agenttask',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports

    var name = 'dsh-agenttask'
    var inject = ['slots', 'sessions']
    var applyCtx = null

    // ── 重启 UI 流程(转圈+读秒+心跳; 5s 检测延迟; 壳 20s / 浏览器 60s) ──
    var restartFlowActive = false
    function ensureRestartUI() {
      if (restartFlowActive) return
      restartFlowActive = true
      var ov = document.createElement('div')
      ov.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;font-family:sans-serif'
      document.body.appendChild(ov)
      startRestartFlow(ov)
    }
    function isShell() {
        try {
          if (window.AndroidShell || window.dshm || window.DSHShell) return true
        } catch (e) {}
        return /dshm|dsh-mobile|dsh-agenttask|dshagenttask/i.test(navigator.userAgent || '')
      }
      function showOffline(ov) {
        ov.innerHTML = '<div style="text-align:center;color:#fff">' +
          '<div style="font-size:15px;margin-bottom:6px">dsh 未在 20s 内恢复</div>' +
          '<div style="font-size:13px;color:#9a9aaa;margin-bottom:14px">即将打开离线/引导页</div>' +
          '<button data-offline style="height:38px;padding:0 16px;border:none;border-radius:10px;background:#fff;color:#0a0a10;font-size:13px;font-weight:600;cursor:pointer">打开离线页</button>' +
          '<button data-retry style="height:38px;padding:0 16px;border:1px solid rgba(255,255,255,.2);border-radius:10px;background:transparent;color:#fff;font-size:13px;cursor:pointer;margin-left:8px">重试</button></div>'
        var openOffline = function () {
          try { location.href = 'dshm://first?mode=offline'; } catch (e) { location.reload() }
        }
        var offlineBtn = ov.querySelector('[data-offline]')
        var retryBtn = ov.querySelector('[data-retry]')
        if (offlineBtn) offlineBtn.addEventListener('click', openOffline)
        if (retryBtn) retryBtn.addEventListener('click', function () { location.reload() })
        setTimeout(openOffline, 1000)
      }
      function startRestartFlow(ov) {
      if (!document.getElementById('dshm-spin-kf')) {
        var kf = document.createElement('style')
        kf.id = 'dshm-spin-kf'
        kf.textContent = '@keyframes dshmSpin{to{transform:rotate(360deg)}}'
        document.head.appendChild(kf)
      }
      var total = isShell() ? 20 : 60
      var n = total
      ov.innerHTML = '<div style="text-align:center;color:#fff">' +
        '<div style="width:38px;height:38px;border:3px solid rgba(255,255,255,.22);border-top-color:#fff;border-radius:50%;margin:0 auto 16px;animation:dshmSpin .8s linear infinite"></div>' +
        '<div style="font-size:15px;margin-bottom:6px">正在重启 dsh…</div>' +
        '<div data-count style="font-size:13px;color:#9a9aaa">等待 ' + total + 's</div></div>'
      var done = false
      var countEl = ov.querySelector('[data-count]')
      var iv = setInterval(function () {
        n--
        if (countEl) countEl.textContent = '等待 ' + Math.max(n, 0) + 's'
        if (n > total - 5) return
        fetch('/', { method: 'GET' }).then(function (r) {
          if (done) return
          if (r.status >= 200 && r.status < 500) {
            done = true
            clearInterval(iv)
            ov.innerHTML = '<div style="text-align:center;color:#fff">' +
                '<div style="width:48px;height:48px;border-radius:14px;background:#fff;color:#0a0a10;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;margin:0 auto 12px">dsh</div>' +
                '<div style="font-size:15px;margin-bottom:6px">已就绪</div>' +
                '<div data-ready-count style="font-size:13px;color:#9a9aaa">3s 后连接</div></div>'
              var readyN = 3
              var readyEl = ov.querySelector('[data-ready-count]')
              var readyIv = setInterval(function () {
                readyN--
                if (readyEl) readyEl.textContent = Math.max(readyN, 0) + 's 后连接'
                if (readyN <= 0) { clearInterval(readyIv); location.reload() }
              }, 1000)
          }
        }).catch(function () {})
        if (n <= 0 && !done) {
          done = true
          clearInterval(iv)
          if (isShell()) {
            showOffline(ov)
          } else {
            ov.innerHTML = '<div style="text-align:center;color:#fff">' +
              '<div style="font-size:15px;margin-bottom:6px">dsh 未在 ' + total + 's 内恢复</div>' +
              '<div style="font-size:13px;color:#9a9aaa;margin-bottom:14px">即将刷新重试</div>' +
              '<button data-retry style="height:38px;padding:0 16px;border:1px solid rgba(255,255,255,.2);border-radius:10px;background:transparent;color:#fff;font-size:13px;cursor:pointer">立即刷新</button></div>'
            var retryBtn = ov.querySelector('[data-retry]')
            if (retryBtn) retryBtn.addEventListener('click', function () { location.reload() })
            setTimeout(function () { location.reload() }, 1000)
          }
        }
      }, 1000)
    }

    // ── 进阶重启: 感知运行中会话, 分级确认 ──
    function requestRestart(fromAgent, reqId, agentSessionId) {
      var anyRun = false // 任何运行(含当前)
      var others = 0 // 其他运行(排除发起方/当前)
      try {
        var sess = applyCtx ? applyCtx.get('sessions') : null
        if (sess && sess.list) {
          var snap = sess.list.getSnapshot()
          var ids = snap.ids || []
          var byId = snap.byId || {}
          var cur = snap.current || null
          // AI 发起时优先用帧里带的 sessionId；没有才退回当前打开的会话
          var excludeId = fromAgent && agentSessionId ? agentSessionId : (cur || null)
          for (var i = 0; i < ids.length; i++) {
            var s0 = byId[ids[i]]
            if (s0 && !s0.blank && (s0.running || s0.pendingInteraction)) {
              anyRun = true
              if ((s0.id || '') !== (excludeId || '')) others++
            }
          }
        }
      } catch (e) {}
      if (fromAgent) {
        // agent: 无其他 → 直接让后端 tool 执行重启; 有其他 → 确认窗
        if (others === 0) {
          try { ensureRestartUI() } catch (e) {}
          if (reqId) {
            reportConfirm(reqId, 'allow')
          } else {
            fetch('/api/dshat-restart-go', { method: 'POST' }).catch(function () {})
          }
        } else {
          try { showConfirmUI(true, reqId, agentSessionId) } catch (e) {}
        }
      } else {
        // 用户: 有任何运行(含当前) → 确认窗显示列表; 无运行 → 普通确认
        if (anyRun) {
          try { showConfirmUI(false, reqId) } catch (e) {}
        } else {
          try { showUserConfirm() } catch (e) {}
        }
      }
    }

    // 回传 AI 请求结果（allow / deny）
    function reportConfirm(reqId, decision) {
      if (!reqId) return
      fetch('/api/dshat-restart-confirm?req=' + encodeURIComponent(reqId) + '&decision=' + decision, { method: 'POST' }).catch(function () {})
    }

    // 普通确认(用户长按无其他运行时): 固定警告, 是→重启
    function showUserConfirm() {
      var ov = document.createElement('div')
      ov.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;font-family:sans-serif'
      ov.innerHTML = '<div style="width:min(300px,88vw);background:#1c1c1f;border-radius:14px;padding:20px;box-shadow:0 12px 40px rgba(0,0,0,.5);text-align:center">' +
        '<div style="font-size:16px;font-weight:600;color:#fff;margin-bottom:18px">是否重启 dsh</div>' +
        '<div style="display:flex;gap:10px">' +
        '<button data-no style="flex:1;height:44px;border:1px solid rgba(255,255,255,.2);border-radius:10px;background:transparent;color:#fff;font-size:14px;font-weight:500;cursor:pointer">否</button>' +
        '<button data-yes style="flex:1;height:44px;border:none;border-radius:10px;background:#fff;color:#0a0a10;font-size:14px;font-weight:600;cursor:pointer">是</button>' +
        '</div></div>'
      document.body.appendChild(ov)
      var locked = false
      var doRestart = function () {
        locked = true
        startRestartFlow(ov)
        fetch('/api/dshat-restart-go', { method: 'POST' }).catch(function () {})
      }
      ov.querySelector('[data-yes]').addEventListener('click', doRestart)
      ov.querySelector('[data-no]').addEventListener('click', function () { if (!locked) ov.remove() })
      ov.addEventListener('click', function (e) { if (!locked && e.target === ov) ov.remove() })
    }

    // 确认窗: 标题按来源; 是 → 二次确认(有运行黄色警告 / 无运行无标题简单)
    function showConfirmUI(fromAgent, reqId, agentSessionId) {
      var ov = document.createElement('div')
      ov.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.55);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;font-family:sans-serif'
      ov.innerHTML = '<div data-card style="width:min(300px,88vw);background:#1c1c1f;border-radius:14px;padding:20px;box-shadow:0 12px 40px rgba(0,0,0,.5);text-align:center">' +
        '<div style="font-size:16px;font-weight:600;color:#fff;margin-bottom:6px">' + (fromAgent ? 'agent 试图重启 dsh' : '是否重启 dsh') + '</div>' +
        '<div data-warn style="font-size:13px;line-height:1.6;margin-bottom:14px;display:none"></div>' +
        '<div style="display:flex;gap:10px">' +
        '<button data-no style="flex:1;height:44px;border:1px solid rgba(255,255,255,.2);border-radius:10px;background:transparent;color:#fff;font-size:14px;font-weight:500;cursor:pointer">' + (fromAgent ? '拒绝' : '否') + '</button>' +
        '<button data-yes style="flex:1;height:44px;border:none;border-radius:10px;background:#fff;color:#0a0a10;font-size:14px;font-weight:600;cursor:pointer">' + (fromAgent ? '允许' : '是') + '</button>' +
        '</div></div>' +
        '<div data-running style="width:min(300px,88vw);background:rgba(28,28,31,.92);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:14px;display:none"></div>'
      document.body.appendChild(ov)
      if (!document.getElementById('dshm-spin-kf')) {
        var kf = document.createElement('style')
        kf.id = 'dshm-spin-kf'
        kf.textContent = '@keyframes dshmSpin{to{transform:rotate(360deg)}}'
        document.head.appendChild(kf)
      }
      var sess = null
      var run = []
      var runOthers = []
      try {
        sess = applyCtx ? applyCtx.get('sessions') : null
        var curId = null
        if (sess && sess.list) {
          var snap = sess.list.getSnapshot()
          var ids = snap.ids || []
          var byId = snap.byId || {}
          curId = snap.current || null
          for (var i = 0; i < ids.length; i++) {
            var s0 = byId[ids[i]]
            if (s0 && !s0.blank && (s0.running || s0.pendingInteraction)) run.push(s0)
          }
          // AI 发起时优先排除发起会话；用户触发才排除当前打开的会话
          var excludeId = fromAgent && agentSessionId ? agentSessionId : (curId || null)
          runOthers = run.filter(function (x) { return (x.id || '') !== (excludeId || '') })
        }
      } catch (e) {}
      var wEl = ov.querySelector('[data-warn]')
      var rEl = ov.querySelector('[data-running]')
      if (run.length > 0) {
        var runCount = run.filter(function (x) { return !x.pendingInteraction }).length
        var waitCount = run.length - runCount
        wEl.innerHTML = '<div style="color:#e6b94c;font-weight:600;margin-bottom:6px">当前有 ' + run.length + ' 个对话正在运行/等待决策</div>' +
          '<div style="color:#c8c8d8;line-height:1.8">重启将中断这些对话<br>运行的服务与正在读写的文件可能会<span style="color:#ff6b6b;font-weight:600">损坏</span></div>'
        wEl.style.display = 'block'
        var rh = '<div style="color:#8a8a99;font-weight:600;margin-bottom:8px">运行中 ' + runCount + ' · 等待决策 ' + waitCount + '</div>'
        for (var k = 0; k < run.length; k++) {
          var t = (run[k].title || '').trim() || String(run[k].id || '').slice(0, 8)
          var isPending = !!(run[k].pendingInteraction)
          var dot = isPending
            ? '<span style="width:9px;height:9px;border-radius:50%;background:#e6b94c;flex:none"></span>'
            : '<span style="width:8px;height:8px;border-radius:50%;border:2px solid #4dd0e1;border-top-color:transparent;animation:dshmSpin .8s linear infinite;flex:none"></span>'
          rh += '<div data-open="' + (run[k].id || '') + '" style="display:flex;align-items:center;gap:8px;padding:7px 8px;border-radius:8px;cursor:pointer;color:#d6d6e2;min-width:0">' +
            dot +
            '<span style="text-overflow:ellipsis;white-space:nowrap;overflow:hidden;flex:1">' + t + '</span></div>'
        }
        rEl.innerHTML = rh
        rEl.style.display = 'block'
        var opens = rEl.querySelectorAll('[data-open]')
        for (var m = 0; m < opens.length; m++) {
          opens[m].addEventListener('click', function () {
            var id = this.getAttribute('data-open')
            if (ov.parentNode) ov.remove()
            try { if (sess && sess.open) sess.open(id) } catch (e) {}
          })
        }
      }
      var locked = false
      var settled = false
      var report = function (decision) {
        if (fromAgent && reqId) {
          fetch('/api/dshat-restart-confirm?req=' + encodeURIComponent(reqId) + '&decision=' + decision, { method: 'POST' }).catch(function () {})
        }
      }
      var cancelSecond = function () {
        if (fromAgent && reqId) report('deny')
        if (ov.parentNode) ov.remove()
      }
      var fireRestart = function () {
        locked = true
        settled = true
        if (fromAgent && reqId) report('allow')
        startRestartFlow(ov)
        if (!fromAgent) fetch('/api/dshat-restart-go', { method: 'POST' }).catch(function () {})
      }
      var doSecond = function () {
        locked = true
        if (runOthers.length > 0) {
          var oh = '<div style="width:min(300px,88vw);background:#2a2018;border:1px solid #e6b94c55;border-radius:14px;padding:20px;box-shadow:0 12px 40px rgba(0,0,0,.5);text-align:center">' +
            '<div style="font-size:16px;font-weight:600;color:#e6b94c;margin-bottom:8px">⚠ 将中断其他运行中/等待决策对话</div>' +
            '<div style="font-size:13px;color:#c8a86a;margin-bottom:10px">另有 ' + runOthers.length + ' 个对话正在运行/等待决策，重启会中断它们（含 AI 工具调用）</div>'
          var shown = Math.min(runOthers.length, 5)
          for (var k2 = 0; k2 < shown; k2++) {
            var t2 = (runOthers[k2].title || '').trim() || String(runOthers[k2].id || '').slice(0, 8), isPending2 = !!(runOthers[k2].pendingInteraction)
            oh += '<div style="display:flex;align-items:center;gap:8px;padding:4px 0;font-size:12px;color:#e6d5b0;min-width:0;text-align:left">' +
              (isPending2 ? '<span style="width:8px;height:8px;border-radius:50%;background:#e6b94c;flex:none"></span>' : '<span style="width:8px;height:8px;border-radius:50%;border:2px solid #4dd0e1;border-top-color:transparent;animation:dshmSpin .8s linear infinite;flex:none"></span>') +
              '<span style="text-overflow:ellipsis;white-space:nowrap;overflow:hidden">' + t2 + '</span></div>'
          }
          if (runOthers.length > 5) oh += '<div style="font-size:11px;color:#a08a55;padding:2px 0">… 等 ' + runOthers.length + ' 个</div>'
          oh += '<div style="display:flex;gap:10px;margin-top:14px">' +
            '<button data-back style="flex:1;height:44px;border:1px solid rgba(255,255,255,.2);border-radius:10px;background:transparent;color:#fff;font-size:14px;font-weight:500;cursor:pointer">再想想</button>' +
            '<button data-confirm style="flex:1;height:44px;border:none;border-radius:10px;background:#e6b94c;color:#0a0a10;font-size:14px;font-weight:600;cursor:pointer">确认重启</button>' +
            '</div></div>'
          ov.innerHTML = oh
          ov.querySelector('[data-back]').addEventListener('click', cancelSecond)
          ov.querySelector('[data-confirm]').addEventListener('click', fireRestart)
        } else {
          ov.innerHTML = '<div style="width:min(300px,88vw);background:#1c1c1f;border-radius:14px;padding:20px;box-shadow:0 12px 40px rgba(0,0,0,.5);text-align:center">' +
            '<div style="font-size:15px;font-weight:600;color:#fff;margin-bottom:16px">确认重启 dsh 服务？</div>' +
            '<div style="display:flex;gap:10px">' +
            '<button data-back style="flex:1;height:44px;border:1px solid rgba(255,255,255,.2);border-radius:10px;background:transparent;color:#fff;font-size:14px;font-weight:500;cursor:pointer">取消</button>' +
            '<button data-confirm style="flex:1;height:44px;border:none;border-radius:10px;background:#fff;color:#0a0a10;font-size:14px;font-weight:600;cursor:pointer">确认重启</button>' +
            '</div></div>'
          ov.querySelector('[data-back]').addEventListener('click', cancelSecond)
          ov.querySelector('[data-confirm]').addEventListener('click', fireRestart)
        }
      }
      ov.querySelector('[data-yes]').addEventListener('click', function () {
        // 先进入二次确认；真正“确认重启”才向 host 回传 allow
        doSecond()
      })
      ov.querySelector('[data-no]').addEventListener('click', function () {
        if (fromAgent && reqId) report('deny')
        if (!locked) ov.remove()
      })
      ov.addEventListener('click', function (e) { if (!settled && e.target === ov) ov.remove() })
      // AI 触发时点遮罩=拒绝（二次确认中点遮罩也视为取消）
      ov.addEventListener('click', function (e) {
        if (!settled && fromAgent && reqId && e.target === ov) report('deny')
      })
    }

    // ── 进阶重启按钮(priority -10 shadow dshm-ui 普通版) ──
    function ReloadButton() {
      var React = require('react')
      var ref = React.useRef(null)
      var timer = React.useRef(0)
      var suppressClick = React.useRef(false)
      var startPress = function (e) {
        if (e.button !== 0) return // 仅左键长按; 右键走 contextmenu
        timer.current = setTimeout(function () {
          suppressClick.current = true
          requestRestart(false)
          // 长按后即使没有 click 跟随，也避免永久吞掉后续点击
          setTimeout(function () { suppressClick.current = false }, 1500)
        }, 500)
      }
      var cancelPress = function () { clearTimeout(timer.current) }
      return React.createElement('button', {
        ref: ref, type: 'button',
        style: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 28, borderRadius: 6, border: 'none', background: 'transparent', color: '#fff', cursor: 'pointer', padding: '0 8px' },
        title: '点击重载前端 · 长按/右键重启',
        onClick: function () {
          if (suppressClick.current) { suppressClick.current = false; return }
          location.reload()
        },
        onPointerDown: startPress, onPointerUp: cancelPress,
        onPointerLeave: cancelPress, onPointerCancel: cancelPress,
        onContextMenu: function (e) {
          e.preventDefault()
          suppressClick.current = true
          requestRestart(false)
          setTimeout(function () { suppressClick.current = false }, 1000)
        },
      }, React.createElement('svg', { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
        React.createElement('path', { d: 'M21 12a9 9 0 1 1-2.64-6.36' }),
        React.createElement('polyline', { points: '21 3 21 9 15 9' }),
      ), React.createElement('span', { className: 'dshm-reload-label', style: { fontSize: 12, lineHeight: 1, whiteSpace: 'nowrap' } }, '刷新/重启'))
    }

    // ── Agent Task: 主页顶部 tabs 行最右侧 (x/y) + 展开面板 ──
    var AG = { running: 0, stopped: 0, warned: 0, rows: { running: [], waiting: [], done: [] } }
    var agBtn = null
    var agPanel = null
    var agMgr = null
    var AG_DISMISS_KEY = 'dsh.activity.dismissed'
    function agDismissed() {
      try { return JSON.parse(localStorage.getItem(AG_DISMISS_KEY) || '[]') } catch (e) { return [] }
    }
    function agDismiss(id) {
      try {
        var a = agDismissed()
        if (a.indexOf(id) < 0) { a.push(id); localStorage.setItem(AG_DISMISS_KEY, JSON.stringify(a)) }
      } catch (e) {}
    }
    function agSnap() {
      try { agMgr = applyCtx ? applyCtx.get('sessions') : null } catch (e) {}
      try {
        if (!agMgr || !agMgr.list) return null
        return agMgr.list.getSnapshot()
      } catch (e) { return null }
    }
    function agTitle(it) {
      var t = (it.title || '').trim()
      if (!t) t = String(it.sessionId || it.id || '').slice(0, 8)
      return t.length > 40 ? t.slice(0, 40) + '…' : t
    }
    function agDot(state) {
      if (state === 'ongoing') {
        var cells = ''
        for (var i = 0; i < 9; i++) cells += '<i style="display:block;width:2px;height:2px;background:var(--dsw-alias-state-business-primary);animation:dshmAgBlink 1s ' + (i * 125) + 'ms infinite"></i>'
        return '<span style="display:grid;grid-template-columns:repeat(3,2px);grid-auto-rows:2px;gap:1px;flex:none;align-content:center">' + cells + '</span>'
      }
      var col = state === 'warning' ? 'var(--dsw-alias-state-warn-primary)' : 'var(--dsw-alias-state-success-primary)'
      return '<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:' + col + ';flex:none"></span>'
    }
    function agRender() {
      var snap = agSnap()
      if (!snap) return
      var ids = snap.ids || []
      var byId = snap.byId || {}
      var dismissed = agDismissed()
      var run = []
      var waiting = []
      var done = []
      for (var i = 0; i < ids.length; i++) {
        var s = byId[ids[i]]
        if (!s || s.blank) continue
        if (s.pendingInteraction) waiting.push(s)
        else if (s.running) run.push(s)
        else if (s.completed && dismissed.indexOf(s.id) < 0) done.push(s)
      }
      run.sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0) })
      waiting.sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0) })
      done.sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0) })
      AG.rows.running = run
      AG.rows.waiting = waiting
      AG.rows.done = done
      AG.running = run.length
      AG.warned = waiting.length
      AG.stopped = waiting.length + done.length
      agUpdateBtn()
      if (agPanel) agRenderPanel()
    }
    function agUpdateBtn() {
      if (!agBtn) return
      var zero = AG.running === 0 && AG.stopped === 0
      var xCol = AG.running > 0 ? 'var(--dsw-alias-state-business-primary)' : 'var(--dsw-alias-label-tertiary)'
      var yCol = AG.stopped === 0 ? 'var(--dsw-alias-label-tertiary)' : (AG.warned > 0 ? 'var(--dsw-alias-state-warn-primary)' : 'var(--dsw-alias-state-success-primary)')
      agBtn.innerHTML = '<span style="display:inline-flex;align-items:center;justify-content:center;min-width:32px;height:22px;padding:0 8px;border-radius:11px;border:1px solid var(--dsw-alias-border-l2);gap:1px;font-size:12px;font-weight:600;line-height:1;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-interactive-bg-hover)">' +
        '<span style="color:' + xCol + '">' + AG.running + '</span>' +
        '<span style="color:var(--dsw-alias-label-caption)">/</span>' +
        '<span style="color:' + yCol + '">' + AG.stopped + '</span></span>'
      agBtn.dataset.zero = zero ? '1' : '0'
      agBtn.style.opacity = zero ? '.55' : '1'
      agBtn.title = zero ? '' : (AG.running + ' 运行中 · ' + AG.stopped + ' 待查看')
    }
    function agOpenPanel() {
      if (agBtn && agBtn.dataset.zero === '1') return
      if (agPanel) return
      agPanel = document.createElement('div')
      agPanel.style.cssText = 'position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,.45);display:flex;align-items:flex-start;justify-content:flex-end;font-family:sans-serif'
      agPanel.innerHTML = '<div data-card style="width:min(320px,92vw);background:var(--dsw-alias-bg-elevated,#1c1c1f);border-radius:14px 0 0 14px;box-shadow:-8px 0 30px rgba(0,0,0,.5);max-height:80vh;display:flex;flex-direction:column;margin-top:56px;border-left:1px solid var(--dsw-alias-border-l2)">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--dsw-alias-border-l2)">' +
        '<span style="font-size:14px;font-weight:600;color:var(--dsw-alias-label-primary)">Agent Task</span>' +
        '<button data-x style="border:none;background:transparent;color:var(--dsw-alias-label-tertiary);font-size:16px;cursor:pointer;padding:0 4px">✕</button></div>' +
        '<div data-list style="overflow-y:auto;flex:1;padding:8px"></div></div>'
      document.body.appendChild(agPanel)
      agPanel.addEventListener('click', function (e) { if (e.target === agPanel) agClosePanel() })
      agPanel.querySelector('[data-x]').addEventListener('click', agClosePanel)
      agRenderPanel()
    }
    function agClosePanel() { if (agPanel) { agPanel.remove(); agPanel = null } }
    function agRowHtml(it, state) {
      var id = it.sessionId || it.id
      return '<div data-id="' + id + '" style="display:flex;align-items:center;gap:9px;padding:9px 12px;border-radius:8px;cursor:pointer;font-size:13px;color:var(--dsw-alias-label-primary);min-width:0">' +
        agDot(state) + '<span style="text-overflow:ellipsis;white-space:nowrap;overflow:hidden;flex:1">' + agTitle(it) + '</span>' +
        (state === 'done' ? '<button data-dismiss data-sid="' + id + '" style="border:none;background:transparent;color:var(--dsw-alias-label-tertiary);font-size:13px;cursor:pointer;padding:0 2px;flex:none">✕</button>' : '') +
        '</div>'
    }
    function agRenderPanel() {
      var listEl = agPanel && agPanel.querySelector('[data-list]')
      if (!listEl) return
      var html = ''
      var secs = [['运行中', AG.rows.running, 'ongoing'], ['等待决策', AG.rows.waiting, 'warning'], ['已完成', AG.rows.done, 'done']]
      for (var s = 0; s < secs.length; s++) {
        var rows = secs[s][1]
        if (!rows || rows.length === 0) continue
        html += '<div style="font-size:11px;color:var(--dsw-alias-label-tertiary);padding:6px 12px 2px">' + secs[s][0] + ' ' + rows.length + '</div>'
        for (var k = 0; k < rows.length; k++) html += agRowHtml(rows[k], secs[s][2])
      }
      if (!html) html = '<div style="padding:18px;text-align:center;font-size:13px;color:var(--dsw-alias-label-tertiary)">暂无任务</div>'
      listEl.innerHTML = html
      var els = listEl.querySelectorAll('[data-id]')
      for (var i = 0; i < els.length; i++) {
        els[i].addEventListener('click', function () {
          var id = this.getAttribute('data-id')
          if (this.getAttribute('data-dismiss') !== null && this.hasAttribute('data-dismiss')) return
          agClosePanel()
          try { agMgr = applyCtx ? applyCtx.get('sessions') : null } catch (e) {}
          try { if (agMgr && agMgr.open) agMgr.open(id) } catch (e) {}
        })
      }
      var dis = listEl.querySelectorAll('[data-dismiss]')
      for (var j = 0; j < dis.length; j++) {
        dis[j].addEventListener('click', function (ev) {
          ev.stopPropagation()
          var id = this.getAttribute('data-sid')
          agDismiss(id)
          AG.rows.done = AG.rows.done.filter(function (x) { return (x.sessionId || x.id) !== id })
          AG.stopped = AG.rows.waiting.length + AG.rows.done.length
          AG.warned = AG.rows.waiting.length
          agUpdateBtn()
          agRenderPanel()
        })
      }
    }

    // ── apply ──
    function apply(ctx) {
      applyCtx = ctx
      // 标记: dshm-ui 检测到后隐藏自己的刷新按钮(本插件接管)
      try { window.__dshAgentTask = true } catch (e) {}
      // CSS: 刷新/重启文案仅侧栏展开时显示
      try {
        var st = document.createElement('style')
        st.textContent = '.hHd-Xa_root.hHd-Xa_collapsed .dshm-reload-label{display:none !important}'
        document.head.appendChild(st)
      } catch (e) {}
      // SSE: host 推 restart 帧(agent 触发) → 分级
      try {
        var es = new EventSource('/api/dshat-reload-sse')
        es.addEventListener('message', function (e) {
          var d = e.data
          if (d === 'reload') { location.reload(); return }
          try {
            var j = JSON.parse(d)
            if (j && j.type === 'restart') requestRestart(true, j.req, j.sessionId)
          } catch (er) {
            if (d === 'restart') requestRestart(true)
          }
        })
      } catch (e) {}
      var slots = ctx.get('slots')
      if (!slots) return
      // AgentTask 入口: MO 找主页顶部 tabs 行, 最右侧插入 (x/y)
      try {
        if (!document.getElementById('dshm-ag-blink-kf')) {
          var agKf = document.createElement('style')
          agKf.id = 'dshm-ag-blink-kf'
          agKf.textContent = '@keyframes dshmAgBlink{0%,100%{opacity:.15}50%{opacity:1}}'
          document.head.appendChild(agKf)
        }
        var agMo = new MutationObserver(function () {
          var tabs = document.querySelector('.wSkVaW_tabs')
          if (tabs && !document.getElementById('dshm-ag-btn')) {
            agBtn = document.createElement('button')
            agBtn.id = 'dshm-ag-btn'
            agBtn.type = 'button'
            agBtn.style.cssText = 'border:none;background:transparent;cursor:pointer;padding:0 2px 11px;margin-left:auto;display:inline-flex;align-items:center'
            agBtn.addEventListener('click', agOpenPanel)
            tabs.appendChild(agBtn)
            agUpdateBtn()
            agRender()
            try {
              var sess = ctx.get('sessions')
              if (sess && sess.list && typeof sess.list.subscribe === 'function') {
                sess.list.subscribe(function () { agRender() })
              }
            } catch (e) {}
          }
        })
        agMo.observe(document.body, { childList: true, subtree: true })
        setInterval(agRender, 2000)
      } catch (e) {}
      // 进阶重启按钮(priority -10 shadow dshm-ui 普通版)
      slots.inject('sidebar.footer.action', function () {
        return slots.register(
          { name: 'sidebar.footer.action', id: 'dsh-agenttask-reload', order: 5, priority: -10 },
          ReloadButton,
        )
      })
    }

    exports.name = name
    exports.inject = inject
    exports.apply = apply
    return module.exports
  }
})
