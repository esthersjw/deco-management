// Dashboard Module
(function() {
  'use strict';

  let data = null;
  let styleInjected = false;
  let moodboardThumbs = [];
  let moodboardLoadedProjectId = null;
  const PHASE_ORDER = ['设计', '拆除', '水电', '泥瓦', '木工', '油漆', '定制', '安装', '家具'];
  const PHASE_ALIASES = {
    '设计': ['设计', '设计规划', '规划设计', '方案设计'],
    '定制': ['定制', '定制柜', '柜体定制', '全屋定制'],
    '家具': ['家具', '软装入住', '软装', '入住']
  };

  function injectStyles() {
    if (styleInjected) return;
    styleInjected = true;
    const style = document.createElement('style');
    style.textContent = `
      .dash-board { display: grid; grid-template-columns: 340px 1fr; gap: 16px; }
      .dash-side { display: grid; gap: 14px; align-self: start; }
      .dash-right { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
      .dash-full { grid-column: 1 / -1; }
      .dash-card { background: var(--card-bg, #fffdf8); border: 1px solid rgba(26,26,46,.09); border-radius: 18px; box-shadow: 0 10px 26px rgba(26,26,46,.055); position: relative; overflow: hidden; }
      .dash-pad { padding: 22px; }
      .dash-pad-lg { padding: 28px; }
      .dash-tape::before { content: ''; position: absolute; top: 0; left: 28px; width: 74px; height: 10px; border-radius: 0 0 10px 10px; background: rgba(244,215,88,.58); }
      .dash-kicker { font-size: .72rem; letter-spacing: .16em; text-transform: uppercase; color: var(--blue); font-weight: 900; }
      .dash-title { font-family: 'Noto Serif SC', serif; font-weight: 900; font-size: 1.04rem; color: var(--ink); }
      .dash-sub { font-size: .82rem; color: var(--ink-light); }
      .dash-big { font-family: 'Fraunces', 'Noto Serif SC', serif; font-weight: 900; line-height: .92; font-size: clamp(3.6rem, 7vw, 6.6rem); color: var(--blue); margin-top: 14px; }
      .dash-blue { color: var(--blue); }
      .dash-yellow { color: #9a8100; }
      .dash-red { color: var(--red); }
      .dash-badge { display: inline-flex; align-items: center; height: 28px; padding: 0 12px; border-radius: 999px; font-size: .72rem; font-weight: 900; }
      .dash-badge-blue { background: rgba(43,127,216,.1); color: var(--blue); }
      .dash-badge-yellow { background: rgba(244,215,88,.28); color: #806a00; }
      .dash-badge-red { background: rgba(232,74,95,.08); color: var(--red); }
      .dash-ledger { display: grid; gap: 10px; margin-top: 14px; }
      .dash-ledger-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 11px 0; border-bottom: 1px dashed rgba(26,26,46,.09); font-size: .84rem; color: var(--ink-light); }
      .dash-ledger-row b { color: var(--ink); font-weight: 900; }
      .dash-judge-list { display: grid; gap: 10px; margin-top: 16px; }
      .dash-judge-item { display: grid; grid-template-columns: auto 1fr; gap: 10px; align-items: flex-start; padding: 10px; border-radius: 12px; background: var(--cream-deep); cursor: pointer; }
      .dash-judge-icon { width: 28px; height: 28px; border-radius: 10px; display: grid; place-items: center; background: rgba(43,127,216,.09); }
      .dash-judge-title { font-size: .84rem; font-weight: 900; color: var(--ink); line-height: 1.35; }
      .dash-judge-meta { font-size: .72rem; color: var(--ink-faint); margin-top: 2px; }
      .dash-mood-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 14px; }
      .dash-mood-thumb { aspect-ratio: 1; border-radius: 12px; overflow: hidden; background: rgba(43,127,216,.07); border: 1px solid rgba(43,127,216,.13); display: grid; place-items: center; color: var(--blue); font-size: 1.2rem; }
      .dash-mood-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .dash-stat-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; }
      .dash-number-card { min-height: 126px; padding: 22px 18px; cursor: pointer; transition: transform .18s, box-shadow .18s, border-color .18s; }
      .dash-number-card:hover, .dash-card-clickable:hover { transform: translateY(-2px); box-shadow: 0 14px 34px rgba(26,26,46,.08); border-color: rgba(43,127,216,.22); }
      .dash-number-card .dash-num { position: absolute; right: 8px; top: -15px; font-family: 'Fraunces', serif; font-size: 5.2rem; font-weight: 900; color: rgba(43,127,216,.06); line-height: 1; pointer-events: none; }
      .dash-number-card .dash-value { font-family: 'Fraunces', 'Noto Serif SC', serif; font-size: 2.12rem; font-weight: 900; line-height: 1; position: relative; }
      .dash-number-card .dash-label { font-weight: 900; margin-top: 12px; position: relative; color: var(--ink); }
      .dash-number-card .dash-meta { font-size: .78rem; color: var(--ink-faint); margin-top: 2px; position: relative; }
      .dash-phase-list { display: flex; align-items: flex-start; gap: 0; margin-top: 18px; overflow-x: auto; padding-bottom: 4px; }
      .dash-phase { min-width: 76px; text-align: center; position: relative; cursor: pointer; }
      .dash-phase::before { content: ''; position: absolute; top: 10px; left: 50%; right: -50%; height: 2px; background: rgba(43,127,216,.16); }
      .dash-phase:last-child::before { display: none; }
      .dash-phase-dot { width: 22px; height: 22px; border-radius: 50%; border: 3px solid rgba(43,127,216,.24); background: var(--card-bg, #fffdf8); margin: 0 auto 8px; position: relative; z-index: 1; }
      .dash-phase.done .dash-phase-dot { background: var(--blue); border-color: var(--blue); }
      .dash-phase.active .dash-phase-dot { background: var(--yellow); border-color: var(--blue); box-shadow: 0 0 0 6px rgba(244,215,88,.22); }
      .dash-phase.lag .dash-phase-dot { background: var(--red); border-color: var(--red); }
      .dash-phase-name { font-weight: 900; font-size: .74rem; white-space: nowrap; color: var(--ink); }
      .dash-phase-status { font-size: .68rem; color: var(--ink-faint); white-space: nowrap; }
      .dash-budget-row { display: flex; align-items: center; gap: 20px; margin-top: 15px; }
      .dash-pie { width: 128px; height: 128px; border-radius: 50%; position: relative; flex: none; }
      .dash-pie::after { content: attr(data-usage); position: absolute; inset: 23px; border-radius: 50%; background: var(--card-bg, #fffdf8); display: grid; place-items: center; font-family: 'Fraunces', serif; font-size: 1.8rem; font-weight: 900; color: var(--ink); }
      .dash-legend { display: grid; gap: 9px; flex: 1; }
      .dash-dot { width: 9px; height: 9px; border-radius: 50%; display: inline-block; margin-right: 6px; background: var(--blue); }
      .dash-dot-yellow { background: var(--yellow); }
      .dash-dot-red { background: var(--red); }
      .dash-photos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 13px; }
      .dash-photo { aspect-ratio: 1.1; border-radius: 14px; background: rgba(43,127,216,.07); border: 1px solid rgba(43,127,216,.13); display: grid; place-items: center; color: var(--blue); font-size: 1.35rem; overflow: hidden; cursor: pointer; }
      .dash-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .dash-activity { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
      .dash-activity-card { padding: 16px; cursor: pointer; }
      .dash-activity-head { display: flex; justify-content: space-between; align-items: center; }
      .dash-list { display: grid; gap: 9px; margin-top: 12px; }
      .dash-mini { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 10px; padding: 10px; border-radius: 12px; background: var(--cream-deep); }
      .dash-thumb { width: 40px; height: 40px; border-radius: 12px; background: rgba(43,127,216,.08); display: grid; place-items: center; overflow: hidden; }
      .dash-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .dash-item-title { font-size: .82rem; font-weight: 900; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--ink); }
      .dash-item-meta { font-size: .72rem; color: var(--ink-faint); }
      .dash-amount { font-weight: 900; color: var(--blue); font-size: .82rem; white-space: nowrap; }
      .dash-empty { padding: 14px; text-align: center; color: var(--ink-faint); font-size: .8rem; background: var(--cream-deep); border-radius: 12px; }
      .dash-report-content { background: #fff; border: 1px solid var(--border-light); border-radius: var(--radius-sm); padding: 16px; font-family: 'Noto Sans SC', sans-serif; font-size: 0.85rem; line-height: 1.7; white-space: pre-wrap; max-height: 60vh; overflow-y: auto; }
      @media (max-width: 1200px) { .dash-board { grid-template-columns: 1fr; } .dash-stat-grid { grid-template-columns: repeat(3, 1fr); } }
      @media (max-width: 900px) { .dash-right { grid-template-columns: 1fr; } .dash-activity { grid-template-columns: 1fr; } .dash-budget-row { display: block; } .dash-pie { margin: 14px auto; } }
      @media (max-width: 600px) { .dash-stat-grid { grid-template-columns: repeat(2, 1fr); } }
    `;
    document.head.appendChild(style);
  }

  function getBudgetData() { return App.getData('budget') || { totalBudget: 0, items: [], payments: [] }; }
  function getProgressData() { return App.getData('progress') || { phases: [], currentPhaseId: null }; }
  function getCommunicationsData() { return App.getData('communications') || { records: [] }; }
  function getDocumentsData() { return App.getData('documents') || { documents: [] }; }
  function getMaterialsData() { return App.getData('materials') || { items: [] }; }

  function escapeHtml(text) {
    return String(text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function formatCurrency(n) { return '¥' + (Number(n) || 0).toLocaleString('zh-CN'); }
  function formatDate(d) {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    return (date.getMonth() + 1) + '/' + date.getDate();
  }
  function formatDateFull(d) {
    const date = new Date(d);
    if (isNaN(date.getTime())) return '';
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }
  function isOverdue(deadline) {
    if (!deadline) return false;
    const d = new Date(deadline);
    if (isNaN(d.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today;
  }
  function daysDiff(a, b) {
    const da = new Date(a);
    const db = new Date(b);
    if (isNaN(da.getTime()) || isNaN(db.getTime())) return 0;
    return Math.round((db - da) / (1000 * 60 * 60 * 24));
  }
  function go(moduleId) { App.switchModule(moduleId); }
  function goMoodboard() { window.location.href = 'board.html'; }
  function photoUrl(doc) { return doc.url || doc.fileUrl || doc.publicUrl || doc.path || doc.fileName || ''; }
  function normalizePhaseName(name) { return String(name || '').replace(/[\s·・,，/／｜|_-]/g, ''); }
  function phaseMatches(displayName, phase) {
    const normalized = normalizePhaseName(phase?.name);
    const candidates = PHASE_ALIASES[displayName] || [displayName];
    return candidates.some(name => normalizePhaseName(name) === normalized);
  }
  function findPhaseByDisplayName(phases, displayName) {
    return (phases || []).find(phase => phaseMatches(displayName, phase));
  }
  function displayPhaseName(rawName) {
    const normalized = normalizePhaseName(rawName);
    const display = PHASE_ORDER.find(name => (PHASE_ALIASES[name] || [name]).some(alias => normalizePhaseName(alias) === normalized));
    return display || rawName || '未开始';
  }

  function collectDashboardState() {
    const budget = getBudgetData();
    const progress = getProgressData();
    const comm = getCommunicationsData();
    const docs = getDocumentsData();
    const materials = getMaterialsData();

    const phases = progress.phases || [];
    const currentPhase = phases.find(p => p.id === progress.currentPhaseId) || phases.find(p => p.status === '进行中') || null;
    let currentPhaseName = currentPhase ? displayPhaseName(currentPhase.name) : '未开始';
    let currentPhaseSub = currentPhase ? (currentPhase.status || '') : '';
    let lagDays = 0;
    if (currentPhase && currentPhase.status === '进行中' && currentPhase.plannedEnd) {
      lagDays = daysDiff(currentPhase.plannedEnd, new Date().toISOString());
      if (lagDays > 0) currentPhaseSub = '进行中，滞后 ' + lagDays + ' 天';
    }

    const totalBudget = Number(budget.totalBudget) || 0;
    const totalSpent = (budget.payments || []).reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const usage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;
    const remaining = Math.max(0, totalBudget - totalSpent);
    const totalOver = (budget.items || []).reduce((sum, item) => {
      const actual = Number(item.actual) || 0;
      const planned = Number(item.budget) || 0;
      return sum + (actual > planned ? actual - planned : 0);
    }, 0);
    const overBudgetCount = (budget.items || []).filter(item => (Number(item.budget) || 0) > 0 && (Number(item.actual) || 0) > (Number(item.budget) || 0)).length;

    let totalTodos = 0;
    let overdueTodos = 0;
    const allTodos = [];
    (comm.records || []).forEach(r => {
      (r.todos || []).forEach(t => {
        const done = t.status === '已完成' || t.done || t.completed;
        const overdue = !done && isOverdue(t.deadline);
        if (!done) {
          totalTodos++;
          if (overdue) overdueTodos++;
          const linkedPhase = phases.find(p => p.id === (t.phaseId || r.phaseId));
          allTodos.push({ ...t, recordId: t.sourceId || r.id, sourceType: 'communication', title: t.content, phaseName: linkedPhase ? displayPhaseName(linkedPhase.name) : '', recordTitle: r.title, recordDate: r.date, overdue });
        }
      });
    });
    (phases || []).forEach(phase => {
      (phase.tasks || []).filter(t => !t.done && !t.completed).forEach(t => {
        totalTodos++;
        allTodos.push({ ...t, phaseId: phase.id, sourceType: 'progress', title: t.title, phaseName: displayPhaseName(phase.name), module: 'progress', overdue: false });
      });
    });
    allTodos.sort((a, b) => (b.overdue ? 1 : 0) - (a.overdue ? 1 : 0) || new Date(a.deadline || '2999-12-31') - new Date(b.deadline || '2999-12-31'));

    const matItems = materials.items || [];
    const matTotal = matItems.length;
    const matPending = matItems.filter(m => m.status === '待选购').length;
    const matOrdered = matItems.filter(m => m.status === '已下单').length;

    const photos = (progress.photos || []).slice().sort((a, b) => new Date(b.date || b.uploadedAt || 0) - new Date(a.date || a.uploadedAt || 0));
    const commCount = (comm.records || []).length;
    const recentPayments = (budget.payments || []).slice().sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 2);

    return { budget, progress, comm, docs, materials, phases, currentPhase, currentPhaseName, currentPhaseSub, lagDays, totalBudget, totalSpent, usage, remaining, totalOver, overBudgetCount, totalTodos, overdueTodos, allTodos, matTotal, matPending, matOrdered, photos, commCount, recentPayments };
  }

  function buildStatCards(state) {
    const stats = [
      { num: '01', label: '当前阶段', value: state.currentPhaseName, meta: state.currentPhaseSub || '未开始', cls: 'dash-blue', module: 'progress' },
      { num: '02', label: '总预算使用率', value: state.usage + '%', meta: '已支出 ' + formatCurrency(state.totalSpent), cls: state.usage > 90 ? 'dash-red' : 'dash-blue', module: 'budget' },
      { num: '03', label: '超支项目数', value: String(state.overBudgetCount), meta: state.overBudgetCount > 0 ? '需关注' : '一切正常', cls: state.overBudgetCount > 0 ? 'dash-red' : 'dash-blue', module: 'budget' },
      { num: '04', label: '待办事项', value: String(state.totalTodos), meta: state.overdueTodos > 0 ? state.overdueTodos + ' 项逾期' : '无逾期', cls: state.overdueTodos > 0 ? 'dash-red' : 'dash-blue', module: 'communications' },
      { num: '05', label: '材料清单', value: String(state.matTotal), meta: state.matPending > 0 ? state.matPending + ' 项待选购' : (state.matOrdered > 0 ? state.matOrdered + ' 项已下单' : '全部到位'), cls: 'dash-yellow', module: 'materials' },
      { num: '06', label: '沟通记录', value: String(state.commCount), meta: '次', cls: 'dash-blue', module: 'communications' }
    ];
    return `<div class="dash-stat-grid dash-full">${stats.map(s => `
      <div class="dash-card dash-number-card" role="button" tabindex="0" onclick="MODULES.dashboard.go('${s.module}')" onkeydown="if(event.key==='Enter') MODULES.dashboard.go('${s.module}')">
        <span class="dash-num">${s.num}</span>
        <div class="dash-value ${s.cls}">${escapeHtml(s.value)}</div>
        <div class="dash-label">${escapeHtml(s.label)}</div>
        <div class="dash-meta">${escapeHtml(s.meta)}</div>
      </div>`).join('')}</div>`;
  }

  function buildPhaseList(state) {
    return `<div class="dash-phase-list">${PHASE_ORDER.map(name => {
      const phase = findPhaseByDisplayName(state.phases, name);
      let status = phase ? (phase.status || '未开始') : '未开始';
      let cls = '';
      if (phase && status === '已完成') cls = 'done';
      else if (phase && status === '进行中') {
        const lag = phase.plannedEnd && daysDiff(phase.plannedEnd, new Date().toISOString()) > 0;
        cls = lag ? 'lag' : 'active';
        if (lag) status = '滞后';
      }
      return `<div class="dash-phase ${cls}" role="button" tabindex="0" onclick="MODULES.dashboard.go('progress')" onkeydown="if(event.key==='Enter') MODULES.dashboard.go('progress')"><div class="dash-phase-dot"></div><div class="dash-phase-name">${escapeHtml(name)}</div><div class="dash-phase-status">${escapeHtml(status)}</div></div>`;
    }).join('')}</div>`;
  }

  function buildBudgetCard(state) {
    const spentDeg = state.totalBudget > 0 ? Math.min(360, (state.totalSpent / Math.max(state.totalBudget, state.totalSpent + state.totalOver)) * 360) : 0;
    const overDeg = state.totalOver > 0 ? Math.min(24, (state.totalOver / Math.max(state.totalBudget, state.totalSpent + state.totalOver)) * 360) : 0;
    const overStart = Math.max(spentDeg, 360 - overDeg);
    const gradient = `conic-gradient(var(--blue) 0deg ${spentDeg}deg, #e9e2cf ${spentDeg}deg ${overStart}deg${state.totalOver > 0 ? `, var(--red) ${overStart}deg 360deg` : ''})`;
    return `<div class="dash-card dash-pad dash-card-clickable" onclick="MODULES.dashboard.go('budget')">
      <div class="dash-title">💰 预算概览</div>
      <div class="dash-budget-row">
        <div class="dash-pie" data-usage="${state.usage}%" style="background:${gradient}"></div>
        <div class="dash-legend">
          <div class="dash-ledger-row"><span><i class="dash-dot"></i>已支出</span><b>${formatCurrency(state.totalSpent)}</b></div>
          <div class="dash-ledger-row"><span><i class="dash-dot dash-dot-yellow"></i>剩余</span><b>${formatCurrency(state.remaining)}</b></div>
          ${state.totalOver > 0 ? `<div class="dash-ledger-row"><span><i class="dash-dot dash-dot-red"></i>超支</span><b class="dash-red">${formatCurrency(state.totalOver)}</b></div>` : ''}
        </div>
      </div>
    </div>`;
  }

  function buildPhotosCard(state) {
    const recent = state.photos.slice(0, 3);
    const photosHtml = recent.length ? recent.map(d => {
      const url = photoUrl(d);
      return `<div class="dash-photo" title="${escapeHtml(d.name || d.fileName || '照片')}" onclick="event.stopPropagation();MODULES.dashboard.go('progress')">${url ? `<img src="${escapeHtml(url)}" alt="${escapeHtml(d.name || d.fileName || '照片')}">` : '📷'}</div>`;
    }).join('') : '<div class="dash-empty dash-full">暂无进度照片</div>';
    return `<div class="dash-card dash-pad dash-card-clickable" onclick="MODULES.dashboard.go('progress')">
      <div class="dash-title">📷 最新照片</div>
      <div class="dash-photos">${photosHtml}</div>
      <p class="dash-sub" style="margin-top:10px">${recent.length} 张 · 来自进度照片墙</p>
    </div>`;
  }

  function buildActivityCard(title, count, icon, items, moduleId, emptyText, renderItem) {
    return `<div class="dash-card dash-activity-card dash-card-clickable" onclick="MODULES.dashboard.go('${moduleId}')">
      <div class="dash-activity-head"><span class="dash-title">${icon} ${escapeHtml(title)}</span><span class="dash-badge dash-badge-yellow">${count}</span></div>
      <div class="dash-list">${items.length ? items.map(renderItem).join('') : `<div class="dash-empty">${escapeHtml(emptyText)}</div>`}</div>
    </div>`;
  }

  function buildRecentActivity(state) {
    const payments = state.recentPayments;
    const photos = state.photos.slice(0, 2);
    const todos = state.allTodos.slice(0, 2);
    const budgetItems = state.budget.items || [];
    return `<div class="dash-activity dash-full">
      ${buildActivityCard('近期支出', payments.length, '💸', payments, 'budget', '暂无支出记录', p => {
        const itemName = budgetItems.find(i => i.id === p.itemId)?.name || '未分类';
        return `<div class="dash-mini"><div class="dash-thumb">💸</div><div><div class="dash-item-title">${escapeHtml(itemName)}</div><div class="dash-item-meta">${formatDate(p.date)}</div></div><div class="dash-amount">${formatCurrency(p.amount)}</div></div>`;
      })}
      ${buildActivityCard('最新照片', photos.length, '📷', photos, 'documents', '暂无照片', d => {
        const url = photoUrl(d);
        return `<div class="dash-mini"><div class="dash-thumb">${url ? `<img src="${escapeHtml(url)}" alt="">` : '📷'}</div><div><div class="dash-item-title">${escapeHtml(d.name || '未命名')}</div><div class="dash-item-meta">${formatDate(d.uploadedAt)} · ${escapeHtml(d.category || '未分类')}</div></div><div></div></div>`;
      })}
      ${buildActivityCard('待办提醒', todos.length, '⏳', todos, 'communications', '暂无待办，太棒了！', t => {
        return `<div class="dash-mini"><div class="dash-thumb">${t.overdue ? '🔴' : '⏳'}</div><div><div class="dash-item-title">${escapeHtml(t.content || '未命名待办')}</div><div class="dash-item-meta">${escapeHtml(t.recordTitle || '')} · 截止 ${formatDate(t.deadline)}</div></div><div class="dash-amount ${t.overdue ? 'dash-red' : ''}">${t.overdue ? '逾期' : ''}</div></div>`;
      })}
    </div>`;
  }

  function generateWeeklyReport() {
    const state = collectDashboardState();
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    const weekSpent = (state.budget.payments || []).reduce((sum, p) => {
      const pd = new Date(p.date || 0);
      return sum + (pd >= weekStart && pd <= weekEnd ? (Number(p.amount) || 0) : 0);
    }, 0);
    const weekRecords = (state.comm.records || []).filter(r => {
      const rd = new Date(r.date || 0);
      return rd >= weekStart && rd <= weekEnd;
    });
    const weekPhotos = state.photos.filter(d => {
      const ud = new Date(d.uploadedAt || 0);
      return ud >= weekStart && ud <= weekEnd;
    });
    let md = `# 🏠 装修周报 — ${App.config.projectName || '我们的家'}\n`;
    md += `**报告周期：** ${formatDateFull(weekStart)} ~ ${formatDateFull(weekEnd)}\n\n---\n\n`;
    md += `## 📊 本周概览\n\n`;
    md += `- **当前阶段：** ${state.currentPhaseName}（${state.currentPhaseSub || '未开始'}）\n`;
    md += `- **本周支出：** ${formatCurrency(weekSpent)}\n`;
    md += `- **累计支出：** ${formatCurrency(state.totalSpent)} / ${formatCurrency(state.totalBudget)}（${state.usage}%）\n`;
    md += `- **超支项目：** ${state.overBudgetCount} 项\n`;
    md += `- **待办事项：** ${state.totalTodos} 项${state.overdueTodos > 0 ? '，' + state.overdueTodos + ' 项逾期' : ''}\n`;
    md += `- **本周沟通：** ${weekRecords.length} 次记录\n`;
    md += `- **本周照片：** ${weekPhotos.length} 张上传\n\n`;
    md += `## 📅 装修进度\n\n`;
    PHASE_ORDER.forEach(name => {
      const phase = findPhaseByDisplayName(state.phases, name);
      md += `- **${name}：** ${phase ? (phase.status || '未开始') : '未开始'}\n`;
    });
    md += `\n*由 装修指挥官 自动生成 · ${formatDateFull(new Date())}*`;
    return md;
  }

  function showReportModal() {
    const md = generateWeeklyReport();
    const overlay = document.getElementById('modalOverlay');
    const content = document.getElementById('modalContent');
    content.innerHTML = `
      <div class="modal-header"><div class="modal-title">📄 本周周报</div><button class="modal-close" onclick="closeModal()">×</button></div>
      <div class="modal-body"><div class="dash-report-content">${escapeHtml(md)}</div></div>
      <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">关闭</button><button class="btn btn-primary" id="btnCopyReport">📋 复制 Markdown</button></div>`;
    overlay.classList.add('show');
    document.getElementById('btnCopyReport').addEventListener('click', () => navigator.clipboard.writeText(md).then(() => App.showToast('周报已复制到剪贴板', 'success')).catch(() => App.showToast('复制失败，请手动复制', 'error')));
  }

  function buildTodayJudgment(state) {
    const items = [];
    state.allTodos.slice(0, 3).forEach(todo => {
      const module = todo.sourceType === 'progress' ? 'progress' : 'communications';
      const meta = todo.sourceType === 'progress' ? `${todo.phaseName || '进度阶段'} · 本阶段要做` : `${todo.phaseName || todo.recordTitle || '沟通待办'}${todo.deadline ? ' · 截止 ' + formatDate(todo.deadline) : ''}`;
      items.push({ type: todo.sourceType, id: todo.id, phaseId: todo.phaseId || '', recordId: todo.recordId || '', title: todo.title || todo.content || '未命名待办', meta, module, actionable: todo.sourceType === 'progress' || todo.sourceType === 'communication' });
    });
    if (state.matPending > 0) items.push({ icon: '🧱', title: `${state.matPending} 项材料待选购`, meta: '先处理会卡工期的主材', module: 'materials' });
    if (state.overBudgetCount > 0) items.push({ icon: '💰', title: `${state.overBudgetCount} 个预算项目超支`, meta: '去预算里确认是否要调整', module: 'budget' });
    if (!items.length) items.push({ icon: '🧭', title: `${state.currentPhaseName}阶段进行中`, meta: '今天没有高风险，检查阶段节点即可', module: 'progress' });
    return `<div class="dash-card dash-pad-lg dash-tape"><span class="dash-badge dash-badge-yellow">To Do</span><div class="dash-judge-list">${items.slice(0, 4).map(item => item.actionable ? `<label class="dash-judge-item" style="grid-template-columns:auto 1fr;cursor:pointer" onclick="event.stopPropagation()"><input type="checkbox" style="width:18px;height:18px;margin-top:2px;accent-color:var(--blue)" onchange="MODULES.dashboard.toggleTodo('${item.type}','${item.id}','${item.phaseId}','${item.recordId}',this.checked)"><div><div class="dash-judge-title">${escapeHtml(item.title)}</div><div class="dash-judge-meta">${escapeHtml(item.meta)}</div></div></label>` : `<div class="dash-judge-item" onclick="MODULES.dashboard.go('${item.module}')"><div class="dash-judge-icon">${item.icon}</div><div><div class="dash-judge-title">${escapeHtml(item.title)}</div><div class="dash-judge-meta">${escapeHtml(item.meta)}</div></div></div>`).join('')}</div></div>`;
  }

  function buildMoodboardCard() {
    const thumbs = moodboardThumbs.slice(0, 6);
    const body = thumbs.length ? `<div class="dash-mood-grid">${thumbs.map(item => `<div class="dash-mood-thumb" title="${escapeHtml(item.title || '情绪板图片')}">${item.url ? `<img src="${escapeHtml(item.url)}" alt="${escapeHtml(item.title || '情绪板图片')}">` : '🖼️'}</div>`).join('')}</div>` : '<div class="dash-empty" style="margin-top:14px">暂无情绪板图片</div>';
    return `<div class="dash-card dash-pad dash-card-clickable" onclick="MODULES.dashboard.goMoodboard()"><div class="dash-title">🎨 情绪板缩略图</div><p class="dash-sub" style="margin-top:4px">来自情绪板画布</p>${body}</div>`;
  }

  function toggleTodo(type, id, phaseId, recordId, checked) {
    if (type === 'progress') {
      const progress = App.getData('progress') || { phases: [] };
      const phase = (progress.phases || []).find(p => p.id === phaseId);
      const task = phase?.tasks?.find(t => t.id === id);
      if (!task) return;
      task.done = checked;
      App.setData('progress', progress);
    } else if (type === 'communication') {
      const comm = App.getData('communications') || { records: [] };
      const record = (comm.records || []).find(r => r.id === recordId);
      const todo = record?.todos?.find(t => t.id === id);
      if (!todo) return;
      todo.status = checked ? '已完成' : '待办';
      todo.completedAt = checked ? new Date().toISOString() : null;
      App.setData('communications', comm);
    }
    render();
  }

  async function loadMoodboardThumbs() {
    if (!App.supabase || !App.currentProject?.id || moodboardLoadedProjectId === App.currentProject.id) return;
    moodboardLoadedProjectId = App.currentProject.id;
    try {
      const { data: row, error } = await App.supabase.from('module_data').select('data').eq('project_id', App.currentProject.id).eq('module_key', 'board').maybeSingle();
      if (error) throw error;
      const boardData = row?.data || {};
      const cards = (boardData.cards || []).filter(card => card.type === 'image' && card.imgData && !(boardData.deletedCardIds || []).includes(card.id));
      const archived = (boardData.imageArchive || []).filter(item => item.imgData);
      moodboardThumbs = [...cards, ...archived].slice(-12).reverse().map(item => ({ url: item.imgData, title: item.title || item.content || '情绪板图片' }));
      if (App.currentModule === 'dashboard') render();
    } catch (e) {
      console.warn('Failed to load moodboard thumbs:', e);
    }
  }

  function render() {
    const container = document.getElementById('dashboard-content');
    if (!container) return;
    injectStyles();
    const state = collectDashboardState();
    loadMoodboardThumbs();
    container.innerHTML = `<div class="dash-board">
      <aside class="dash-side">
        ${buildTodayJudgment(state)}
        ${buildMoodboardCard()}
      </aside>
      <div class="dash-right">
        ${buildStatCards(state)}
        <div class="dash-card dash-pad dash-full dash-card-clickable" onclick="MODULES.dashboard.go('progress')"><div class="dash-title">📅 装修进度</div>${buildPhaseList(state)}</div>
        ${buildBudgetCard(state)}
        ${buildPhotosCard(state)}
      </div>
    </div>`;
  }

  function init() {
    const btn = document.getElementById('btnGenerateReport');
    if (btn) btn.addEventListener('click', showReportModal);
  }

  registerModule('dashboard', {
    name: '总览',
    init,
    render,
    onShow() { this.render(); },
    onHide() {},
    setData(d) { data = d; },
    go,
    goMoodboard,
    toggleTodo
  });
})();
