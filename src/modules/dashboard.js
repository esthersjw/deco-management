// Dashboard Module
(function() {
  'use strict';

  // Module internal state
  let data = null;
  let styleInjected = false;

  // ==================== STYLE INJECTION ====================

  function injectStyles() {
    if (styleInjected) return;
    styleInjected = true;
    const style = document.createElement('style');
    style.textContent = `
      /* Dashboard Layout */
      .dash-section { margin-bottom: 24px; }
      .dash-section-title { font-family: 'Noto Serif SC', serif; font-size: 1rem; font-weight: 700; color: var(--ink); margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }

      /* Stat Cards Grid */
      .dash-stats-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 14px; }
      @media (max-width: 1200px) { .dash-stats-grid { grid-template-columns: repeat(3, 1fr); } }
      @media (max-width: 600px) { .dash-stats-grid { grid-template-columns: repeat(2, 1fr); } }

      /* Budget & Progress Row */
      .dash-row-2 { display: grid; grid-template-columns: 1fr 1.6fr; gap: 20px; }
      @media (max-width: 900px) { .dash-row-2 { grid-template-columns: 1fr; } }

      .dash-card { background: var(--card-bg); border-radius: var(--radius); padding: 20px; box-shadow: var(--card-shadow); }
      .dash-card-title { font-family: 'Noto Serif SC', serif; font-size: 0.95rem; font-weight: 700; color: var(--ink); margin-bottom: 16px; }

      /* Pie Chart */
      .dash-pie-wrap { display: flex; flex-direction: column; align-items: center; gap: 16px; }
      .dash-pie { width: 140px; height: 140px; border-radius: 50%; position: relative; }
      .dash-pie-center { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; }
      .dash-pie-value { font-size: 1.5rem; font-weight: 700; color: var(--ink); line-height: 1; }
      .dash-pie-label { font-size: 0.7rem; color: var(--ink-faint); margin-top: 2px; }
      .dash-pie-legend { display: flex; gap: 16px; flex-wrap: wrap; justify-content: center; }
      .dash-pie-legend-item { display: flex; align-items: center; gap: 6px; font-size: 0.78rem; color: var(--ink-light); }
      .dash-pie-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }

      /* Timeline */
      .dash-timeline { display: flex; align-items: center; gap: 4px; overflow-x: auto; padding-bottom: 8px; }
      .dash-tl-item { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
      .dash-tl-node { display: flex; flex-direction: column; align-items: center; gap: 6px; min-width: 80px; }
      .dash-tl-dot { width: 14px; height: 14px; border-radius: 50%; border: 2px solid var(--border-light); background: #fff; position: relative; }
      .dash-tl-dot.completed { background: var(--green); border-color: var(--green); }
      .dash-tl-dot.active { background: var(--blue); border-color: var(--blue); box-shadow: 0 0 0 3px rgba(43,127,216,0.2); }
      .dash-tl-dot.lag { background: var(--red); border-color: var(--red); }
      .dash-tl-dot.pending { background: var(--ink-faint); border-color: var(--border-light); }
      .dash-tl-name { font-size: 0.78rem; font-weight: 600; color: var(--ink); white-space: nowrap; }
      .dash-tl-status { font-size: 0.7rem; color: var(--ink-faint); white-space: nowrap; }
      .dash-tl-line { width: 28px; height: 2px; background: var(--border-light); flex-shrink: 0; }
      .dash-tl-line.completed { background: var(--green); }
      .dash-tl-line.active { background: var(--blue); }

      /* Activity Section */
      .dash-activity-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
      @media (max-width: 900px) { .dash-activity-grid { grid-template-columns: 1fr; } }

      .dash-activity-card { background: var(--card-bg); border-radius: var(--radius); padding: 16px; box-shadow: var(--card-shadow); }
      .dash-activity-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border-light); }
      .dash-activity-title { font-size: 0.85rem; font-weight: 600; color: var(--ink); }
      .dash-activity-count { font-size: 0.7rem; color: var(--ink-faint); background: var(--cream-deep); padding: 2px 8px; border-radius: 10px; }

      .dash-activity-list { display: flex; flex-direction: column; gap: 10px; }
      .dash-activity-item { display: flex; align-items: flex-start; gap: 10px; padding: 10px; border-radius: var(--radius-sm); background: var(--cream); transition: var(--transition); }
      .dash-activity-item:hover { background: var(--blue-light); }
      .dash-activity-icon { font-size: 1.1rem; flex-shrink: 0; margin-top: 2px; }
      .dash-activity-body { flex: 1; min-width: 0; }
      .dash-activity-text { font-size: 0.8rem; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .dash-activity-meta { font-size: 0.72rem; color: var(--ink-faint); margin-top: 2px; }
      .dash-activity-amount { font-size: 0.8rem; font-weight: 600; color: var(--red); flex-shrink: 0; }
      .dash-activity-amount.income { color: var(--green); }

      .dash-photo-thumb { width: 48px; height: 48px; border-radius: var(--radius-sm); background: var(--cream-deep); object-fit: cover; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }

      .dash-todo-overdue { color: var(--red); font-size: 0.7rem; font-weight: 600; margin-left: 4px; }

      /* Report Modal */
      .dash-report-content { background: #fff; border: 1px solid var(--border-light); border-radius: var(--radius-sm); padding: 16px; font-family: 'Noto Sans SC', sans-serif; font-size: 0.85rem; line-height: 1.7; white-space: pre-wrap; max-height: 60vh; overflow-y: auto; }
      .dash-report-content h1 { font-family: 'Noto Serif SC', serif; font-size: 1.2rem; margin-bottom: 12px; color: var(--ink); }
      .dash-report-content h2 { font-family: 'Noto Serif SC', serif; font-size: 1rem; margin-top: 16px; margin-bottom: 8px; color: var(--ink); border-bottom: 1px solid var(--border-light); padding-bottom: 4px; }
      .dash-report-content ul { margin: 8px 0; padding-left: 20px; }
      .dash-report-content li { margin: 4px 0; }
      .dash-report-content strong { color: var(--blue); }

      /* Empty state inside dashboard */
      .dash-empty { text-align: center; padding: 20px; color: var(--ink-faint); font-size: 0.8rem; }
    `;
    document.head.appendChild(style);
  }

  // ==================== DATA HELPERS ====================

  function getBudgetData() {
    return App.getData('budget') || { totalBudget: 0, items: [], payments: [] };
  }

  function getProgressData() {
    return App.getData('progress') || { phases: [], currentPhaseId: null };
  }

  function getCommunicationsData() {
    return App.getData('communications') || { records: [] };
  }

  function getDocumentsData() {
    return App.getData('documents') || { documents: [] };
  }

  function formatCurrency(n) {
    if (n === undefined || n === null) return '¥0';
    return '¥' + Number(n).toLocaleString('zh-CN');
  }

  function formatDate(d) {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
    return (date.getMonth() + 1) + '/' + date.getDate();
  }

  function formatDateFull(d) {
    if (!d) return '';
    const date = new Date(d);
    if (isNaN(date.getTime())) return d;
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

  // ==================== STAT CARD BUILDERS ====================

  function buildStatCards(container) {
    const budget = getBudgetData();
    const progress = getProgressData();
    const comm = getCommunicationsData();
    const docs = getDocumentsData();

    // 1. Current Phase
    let currentPhaseName = '未开始';
    let currentPhaseSub = '';
    const currentPhase = progress.phases.find(p => p.id === progress.currentPhaseId);
    if (currentPhase) {
      currentPhaseName = currentPhase.name;
      if (currentPhase.status === '进行中') {
        const lagDays = currentPhase.plannedEnd && currentPhase.actualStart
          ? daysDiff(currentPhase.plannedEnd, new Date().toISOString())
          : 0;
        if (lagDays > 0) {
          currentPhaseSub = '进行中，滞后 ' + lagDays + ' 天';
        } else {
          currentPhaseSub = '进行中';
        }
      } else {
        currentPhaseSub = currentPhase.status || '';
      }
    }

    // 2. Budget usage
    let totalSpent = 0;
    let totalBudget = budget.totalBudget || 0;
    (budget.payments || []).forEach(p => { totalSpent += Number(p.amount) || 0; });
    const budgetUsage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

    // 3. Over-budget items
    let overBudgetCount = 0;
    (budget.items || []).forEach(item => {
      const actual = Number(item.actual) || 0;
      const planned = Number(item.budget) || 0;
      if (planned > 0 && actual > planned) overBudgetCount++;
    });

    // 4. Todos
    let totalTodos = 0;
    let overdueTodos = 0;
    (comm.records || []).forEach(r => {
      (r.todos || []).forEach(t => {
        totalTodos++;
        if (t.status !== '已完成' && isOverdue(t.deadline)) overdueTodos++;
      });
    });

    // 5. Photos
    const photoCount = (docs.documents || []).filter(d => d.type && d.type.startsWith('image/')).length;

    // 6. Communication records
    const commCount = (comm.records || []).length;

    const stats = [
      { label: '当前阶段', value: currentPhaseName, sub: currentPhaseSub, cls: '' },
      { label: '总预算使用率', value: budgetUsage + '%', sub: '已支出 ' + formatCurrency(totalSpent), cls: budgetUsage > 90 ? 'danger' : (budgetUsage > 70 ? 'warning' : '') },
      { label: '超支项目数', value: String(overBudgetCount), sub: overBudgetCount > 0 ? '需关注' : '一切正常', cls: overBudgetCount > 0 ? 'danger' : 'success' },
      { label: '待办事项', value: String(totalTodos), sub: overdueTodos > 0 ? overdueTodos + ' 项逾期' : '无逾期', cls: overdueTodos > 0 ? 'danger' : '' },
      { label: '已上传照片', value: String(photoCount), sub: '张', cls: '' },
      { label: '沟通记录', value: String(commCount), sub: '次', cls: '' }
    ];

    const grid = document.createElement('div');
    grid.className = 'dash-stats-grid';

    stats.forEach(s => {
      const card = document.createElement('div');
      card.className = 'stat-card';
      card.innerHTML = `
        <div class="stat-value ${s.cls}">${s.value}</div>
        <div class="stat-label">${s.label}</div>
        <div class="stat-sublabel">${s.sub}</div>
      `;
      grid.appendChild(card);
    });

    container.appendChild(grid);
  }

  // ==================== BUDGET PIE CHART ====================

  function buildBudgetPie(container) {
    const budget = getBudgetData();
    const totalBudget = budget.totalBudget || 0;

    let totalSpent = 0;
    let totalOver = 0;
    (budget.payments || []).forEach(p => { totalSpent += Number(p.amount) || 0; });
    (budget.items || []).forEach(item => {
      const actual = Number(item.actual) || 0;
      const planned = Number(item.budget) || 0;
      if (actual > planned) totalOver += (actual - planned);
    });

    const remaining = Math.max(0, totalBudget - totalSpent);
    const usage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

    // conic-gradient angles
    const total = totalSpent + remaining + totalOver;
    let spentDeg = 0, remainDeg = 0, overDeg = 0;
    if (total > 0) {
      spentDeg = (totalSpent / total) * 360;
      remainDeg = (remaining / total) * 360;
      overDeg = (totalOver / total) * 360;
    }

    const gradParts = [];
    let currentAngle = 0;
    if (spentDeg > 0) {
      gradParts.push(`#2B7FD8 ${currentAngle}deg ${currentAngle + spentDeg}deg`);
      currentAngle += spentDeg;
    }
    if (remainDeg > 0) {
      gradParts.push(`#e5e7eb ${currentAngle}deg ${currentAngle + remainDeg}deg`);
      currentAngle += remainDeg;
    }
    if (overDeg > 0) {
      gradParts.push(`#E84A5F ${currentAngle}deg ${currentAngle + overDeg}deg`);
    }

    const gradient = gradParts.length > 0
      ? `conic-gradient(${gradParts.join(', ')})`
      : 'conic-gradient(#e5e7eb 0deg 360deg)';

    const card = document.createElement('div');
    card.className = 'dash-card';

    const title = document.createElement('div');
    title.className = 'dash-card-title';
    title.textContent = '💰 预算概览';
    card.appendChild(title);

    const wrap = document.createElement('div');
    wrap.className = 'dash-pie-wrap';

    const pie = document.createElement('div');
    pie.className = 'dash-pie';
    pie.style.background = gradient;

    const center = document.createElement('div');
    center.className = 'dash-pie-center';
    center.innerHTML = `
      <div class="dash-pie-value">${usage}%</div>
      <div class="dash-pie-label">已使用</div>
    `;
    pie.appendChild(center);
    wrap.appendChild(pie);

    const legend = document.createElement('div');
    legend.className = 'dash-pie-legend';
    legend.innerHTML = `
      <div class="dash-pie-legend-item"><span class="dash-pie-dot" style="background:#2B7FD8"></span>已支出 ${formatCurrency(totalSpent)}</div>
      <div class="dash-pie-legend-item"><span class="dash-pie-dot" style="background:#e5e7eb"></span>剩余 ${formatCurrency(remaining)}</div>
      ${totalOver > 0 ? `<div class="dash-pie-legend-item"><span class="dash-pie-dot" style="background:#E84A5F"></span>超支 ${formatCurrency(totalOver)}</div>` : ''}
    `;
    wrap.appendChild(legend);

    card.appendChild(wrap);
    container.appendChild(card);
  }

  // ==================== PROGRESS TIMELINE ====================

  function buildProgressTimeline(container) {
    const progress = getProgressData();
    const phases = progress.phases || [];
    const phaseOrder = ['拆除', '水电', '泥瓦', '木工', '油漆', '安装'];

    const card = document.createElement('div');
    card.className = 'dash-card';

    const title = document.createElement('div');
    title.className = 'dash-card-title';
    title.textContent = '📅 装修进度';
    card.appendChild(title);

    const timeline = document.createElement('div');
    timeline.className = 'dash-timeline';

    phaseOrder.forEach((name, idx) => {
      const phase = phases.find(p => p.name === name);
      let status = '未开始';
      let dotClass = 'pending';
      let lineClass = '';

      if (phase) {
        status = phase.status || '未开始';
        if (status === '已完成') dotClass = 'completed';
        else if (status === '进行中') {
          const isLag = phase.plannedEnd && daysDiff(phase.plannedEnd, new Date().toISOString()) > 0;
          dotClass = isLag ? 'lag' : 'active';
          if (isLag) status = '滞后';
        }
      }

      const item = document.createElement('div');
      item.className = 'dash-tl-item';

      const node = document.createElement('div');
      node.className = 'dash-tl-node';
      node.innerHTML = `
        <div class="dash-tl-dot ${dotClass}"></div>
        <div class="dash-tl-name">${name}</div>
        <div class="dash-tl-status">${status}</div>
      `;
      item.appendChild(node);

      if (idx < phaseOrder.length - 1) {
        const line = document.createElement('div');
        line.className = 'dash-tl-line ' + (dotClass === 'completed' || dotClass === 'active' ? 'completed' : '');
        item.appendChild(line);
      }

      timeline.appendChild(item);
    });

    card.appendChild(timeline);
    container.appendChild(card);
  }

  // ==================== RECENT ACTIVITY ====================

  function buildRecentActivity(container) {
    const budget = getBudgetData();
    const docs = getDocumentsData();
    const comm = getCommunicationsData();

    const grid = document.createElement('div');
    grid.className = 'dash-activity-grid';

    // 1. Recent payments
    const paymentsCard = document.createElement('div');
    paymentsCard.className = 'dash-activity-card';
    const recentPayments = (budget.payments || []).slice().sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 3);
    paymentsCard.innerHTML = `
      <div class="dash-activity-header">
        <span class="dash-activity-title">💸 近期支出</span>
        <span class="dash-activity-count">${recentPayments.length}</span>
      </div>
      <div class="dash-activity-list" id="dash-payments-list"></div>
    `;
    const paymentsList = paymentsCard.querySelector('#dash-payments-list');
    if (recentPayments.length === 0) {
      paymentsList.innerHTML = '<div class="dash-empty">暂无支出记录</div>';
    } else {
      recentPayments.forEach(p => {
        const item = document.createElement('div');
        item.className = 'dash-activity-item';
        const itemName = (budget.items || []).find(i => i.id === p.itemId)?.name || '未分类';
        item.innerHTML = `
          <span class="dash-activity-icon">💸</span>
          <div class="dash-activity-body">
            <div class="dash-activity-text">${itemName}</div>
            <div class="dash-activity-meta">${formatDate(p.date)}</div>
          </div>
          <span class="dash-activity-amount">-${formatCurrency(p.amount)}</span>
        `;
        paymentsList.appendChild(item);
      });
    }
    grid.appendChild(paymentsCard);

    // 2. Recent photos
    const photosCard = document.createElement('div');
    photosCard.className = 'dash-activity-card';
    const recentPhotos = (docs.documents || []).filter(d => d.type && d.type.startsWith('image/')).slice().sort((a, b) => new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0)).slice(0, 3);
    photosCard.innerHTML = `
      <div class="dash-activity-header">
        <span class="dash-activity-title">📷 最新照片</span>
        <span class="dash-activity-count">${recentPhotos.length}</span>
      </div>
      <div class="dash-activity-list" id="dash-photos-list"></div>
    `;
    const photosList = photosCard.querySelector('#dash-photos-list');
    if (recentPhotos.length === 0) {
      photosList.innerHTML = '<div class="dash-empty">暂无照片</div>';
    } else {
      recentPhotos.forEach(d => {
        const item = document.createElement('div');
        item.className = 'dash-activity-item';
        item.innerHTML = `
          <div class="dash-photo-thumb">📷</div>
          <div class="dash-activity-body">
            <div class="dash-activity-text">${d.name || '未命名'}</div>
            <div class="dash-activity-meta">${formatDate(d.uploadedAt)} · ${d.category || '未分类'}</div>
          </div>
        `;
        photosList.appendChild(item);
      });
    }
    grid.appendChild(photosCard);

    // 3. Recent todos
    const todosCard = document.createElement('div');
    todosCard.className = 'dash-activity-card';
    let allTodos = [];
    (comm.records || []).forEach(r => {
      (r.todos || []).forEach(t => {
        allTodos.push({ ...t, recordTitle: r.title, recordDate: r.date });
      });
    });
    allTodos = allTodos.filter(t => t.status !== '已完成').sort((a, b) => {
      const aOver = isOverdue(a.deadline) ? 1 : 0;
      const bOver = isOverdue(b.deadline) ? 1 : 0;
      if (aOver !== bOver) return bOver - aOver;
      return new Date(a.deadline || 0) - new Date(b.deadline || 0);
    }).slice(0, 3);

    todosCard.innerHTML = `
      <div class="dash-activity-header">
        <span class="dash-activity-title">✅ 待办提醒</span>
        <span class="dash-activity-count">${allTodos.length}</span>
      </div>
      <div class="dash-activity-list" id="dash-todos-list"></div>
    `;
    const todosList = todosCard.querySelector('#dash-todos-list');
    if (allTodos.length === 0) {
      todosList.innerHTML = '<div class="dash-empty">暂无待办，太棒了！</div>';
    } else {
      allTodos.forEach(t => {
        const item = document.createElement('div');
        item.className = 'dash-activity-item';
        const overdue = isOverdue(t.deadline);
        item.innerHTML = `
          <span class="dash-activity-icon">${overdue ? '🔴' : '⏳'}</span>
          <div class="dash-activity-body">
            <div class="dash-activity-text">${t.content || '未命名待办'}${overdue ? '<span class="dash-todo-overdue">逾期</span>' : ''}</div>
            <div class="dash-activity-meta">${t.recordTitle || ''} · 截止 ${formatDate(t.deadline)}</div>
          </div>
        `;
        todosList.appendChild(item);
      });
    }
    grid.appendChild(todosCard);

    container.appendChild(grid);
  }

  // ==================== WEEKLY REPORT ====================

  function generateWeeklyReport() {
    const budget = getBudgetData();
    const progress = getProgressData();
    const comm = getCommunicationsData();
    const docs = getDocumentsData();

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const weekRange = formatDateFull(weekStart) + ' ~ ' + formatDateFull(weekEnd);

    // Budget stats
    let totalSpent = 0;
    let weekSpent = 0;
    (budget.payments || []).forEach(p => {
      const amt = Number(p.amount) || 0;
      totalSpent += amt;
      const pd = new Date(p.date || 0);
      if (pd >= weekStart && pd <= weekEnd) weekSpent += amt;
    });
    const totalBudget = budget.totalBudget || 0;
    const usage = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

    // Over-budget items
    const overItems = (budget.items || []).filter(item => {
      const actual = Number(item.actual) || 0;
      const planned = Number(item.budget) || 0;
      return planned > 0 && actual > planned;
    });

    // Phase status
    const currentPhase = progress.phases.find(p => p.id === progress.currentPhaseId);
    const completedPhases = (progress.phases || []).filter(p => p.status === '已完成').length;

    // Weekly records
    const weekRecords = (comm.records || []).filter(r => {
      const rd = new Date(r.date || 0);
      return rd >= weekStart && rd <= weekEnd;
    });

    // Weekly photos
    const weekPhotos = (docs.documents || []).filter(d => {
      if (!d.type || !d.type.startsWith('image/')) return false;
      const ud = new Date(d.uploadedAt || 0);
      return ud >= weekStart && ud <= weekEnd;
    });

    // Todos
    let totalTodos = 0;
    let doneTodos = 0;
    let overdueTodos = 0;
    (comm.records || []).forEach(r => {
      (r.todos || []).forEach(t => {
        totalTodos++;
        if (t.status === '已完成') doneTodos++;
        else if (isOverdue(t.deadline)) overdueTodos++;
      });
    });

    let md = `# 🏠 装修周报 — ${App.config.projectName || '我们的家'}\n`;
    md += `**报告周期：** ${weekRange}\n\n`;
    md += `---\n\n`;

    md += `## 📊 本周概览\n\n`;
    md += `- **当前阶段：** ${currentPhase ? currentPhase.name + '（' + (currentPhase.status || '未开始') + '）' : '未开始'}\n`;
    md += `- **已完成阶段：** ${completedPhases} / 6\n`;
    md += `- **本周支出：** ${formatCurrency(weekSpent)}\n`;
    md += `- **累计支出：** ${formatCurrency(totalSpent)} / ${formatCurrency(totalBudget)}（${usage}%）\n`;
    md += `- **超支项目：** ${overItems.length} 项\n`;
    md += `- **待办进度：** ${doneTodos} / ${totalTodos} 已完成${overdueTodos > 0 ? '，' + overdueTodos + ' 项逾期' : ''}\n`;
    md += `- **本周沟通：** ${weekRecords.length} 次记录\n`;
    md += `- **本周照片：** ${weekPhotos.length} 张上传\n\n`;

    md += `---\n\n`;

    md += `## 💰 预算详情\n\n`;
    if ((budget.items || []).length === 0) {
      md += `> 暂无预算项目数据。\n\n`;
    } else {
      md += `| 项目 | 预算 | 实际 | 状态 |\n`;
      md += `|------|------|------|------|\n`;
      (budget.items || []).forEach(item => {
        const planned = Number(item.budget) || 0;
        const actual = Number(item.actual) || 0;
        const status = actual > planned ? '🔴 超支' : (actual > 0 ? '🟢 正常' : '⚪ 未开始');
        md += `| ${item.name || '未命名'} | ${formatCurrency(planned)} | ${formatCurrency(actual)} | ${status} |\n`;
      });
      md += `\n`;
    }

    md += `---\n\n`;

    md += `## 📅 进度时间轴\n\n`;
    const phaseOrder = ['拆除', '水电', '泥瓦', '木工', '油漆', '安装'];
    phaseOrder.forEach(name => {
      const phase = progress.phases.find(p => p.name === name);
      if (!phase) {
        md += `- **${name}：** 未开始\n`;
      } else {
        const icon = phase.status === '已完成' ? '✅' : (phase.status === '进行中' ? '🔵' : '⚪');
        md += `- **${name}：** ${icon} ${phase.status || '未开始'}`;
        if (phase.plannedStart && phase.plannedEnd) {
          md += `（计划 ${formatDate(phase.plannedStart)} ~ ${formatDate(phase.plannedEnd)}）`;
        }
        md += `\n`;
      }
    });
    md += `\n`;

    md += `---\n\n`;

    md += `## 💬 本周沟通记录\n\n`;
    if (weekRecords.length === 0) {
      md += `> 本周暂无沟通记录。\n\n`;
    } else {
      weekRecords.forEach(r => {
        md += `### ${r.title || '未命名记录'} — ${formatDate(r.date)}\n\n`;
        if (r.summary) md += `${r.summary}\n\n`;
        if ((r.todos || []).length > 0) {
          md += `**待办：**\n`;
          r.todos.forEach(t => {
            const check = t.status === '已完成' ? '[x]' : '[ ]';
            const over = t.status !== '已完成' && isOverdue(t.deadline) ? ' 🔴逾期' : '';
            md += `- ${check} ${t.content || ''}${over}\n`;
          });
          md += `\n`;
        }
      });
    }

    md += `---\n\n`;

    md += `## ✅ 待办清单\n\n`;
    if (totalTodos === 0) {
      md += `> 暂无待办事项。\n\n`;
    } else {
      (comm.records || []).forEach(r => {
        const undone = (r.todos || []).filter(t => t.status !== '已完成');
        if (undone.length > 0) {
          md += `**${r.title || '未命名记录'}**\n`;
          undone.forEach(t => {
            const over = isOverdue(t.deadline) ? ' 🔴逾期' : '';
            md += `- [ ] ${t.content || ''}（截止 ${formatDate(t.deadline)}）${over}\n`;
          });
          md += `\n`;
        }
      });
    }

    md += `---\n\n`;
    md += `*由 装修指挥官 自动生成 · ${formatDateFull(new Date())}*`;

    return md;
  }

  function showReportModal() {
    const md = generateWeeklyReport();
    const overlay = document.getElementById('modalOverlay');
    const content = document.getElementById('modalContent');

    content.innerHTML = `
      <div class="modal-header">
        <div class="modal-title">📄 本周周报</div>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      <div class="modal-body">
        <div class="dash-report-content">${escapeHtml(md)}</div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">关闭</button>
        <button class="btn btn-primary" id="btnCopyReport">📋 复制 Markdown</button>
      </div>
    `;
    overlay.classList.add('show');

    document.getElementById('btnCopyReport').addEventListener('click', () => {
      navigator.clipboard.writeText(md).then(() => {
        App.showToast('周报已复制到剪贴板', 'success');
      }).catch(() => {
        App.showToast('复制失败，请手动复制', 'error');
      });
    });
  }

  function escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // ==================== RENDER ====================

  function render() {
    const container = document.getElementById('dashboard-content');
    if (!container) return;
    container.innerHTML = '';

    injectStyles();

    // Section 1: Stat Cards
    const statsSection = document.createElement('div');
    statsSection.className = 'dash-section';
    buildStatCards(statsSection);
    container.appendChild(statsSection);

    // Section 2: Budget Pie + Progress Timeline
    const row2 = document.createElement('div');
    row2.className = 'dash-row-2 dash-section';
    buildBudgetPie(row2);
    buildProgressTimeline(row2);
    container.appendChild(row2);

    // Section 3: Recent Activity
    const activitySection = document.createElement('div');
    activitySection.className = 'dash-section';
    const activityTitle = document.createElement('div');
    activityTitle.className = 'dash-section-title';
    activityTitle.textContent = '🔔 近期动态';
    activitySection.appendChild(activityTitle);
    buildRecentActivity(activitySection);
    container.appendChild(activitySection);
  }

  // ==================== INIT ====================

  function init() {
    // Bind report button
    const btn = document.getElementById('btnGenerateReport');
    if (btn) {
      btn.addEventListener('click', showReportModal);
    }
  }

  // ==================== MODULE REGISTRATION ====================

  registerModule('dashboard', {
    name: '总览',
    init: init,
    render: render,
    onShow: function() { this.render(); },
    onHide: function() {},
    setData: function(d) { data = d; }
  });
})();
