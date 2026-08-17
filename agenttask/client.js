// dsh-AgentTask — 纯任务监视插件(胶囊 x/y + 面板三段 + 点击跳转, 全端可用)
// 数据 sessions.list.getSnapshot() 官方同源; 侧栏/本插件读同一快照 → 点消除两侧同步
window.__ModuleLoader__.load({
  id: 'dsh-agenttask',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports

    var name = 'dsh-agenttask'
    var inject = ['slots', 'sessions']
    var applyCtx = null

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
      var slots = ctx.get('slots')
      if (!slots) return
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
    }

    exports.name = name
    exports.inject = inject
    exports.apply = apply
    return module.exports
  }
})
