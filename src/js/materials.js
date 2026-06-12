(function() {
  'use strict';

  let data = { version: '1.0', updatedAt: new Date().toISOString(), items: [], categories: ['瓷砖', '地板', '涂料/油漆', '五金', '灯具', '洁具/卫浴', '门窗', '定制柜', '家电', '家具', '软装', '其他'] };
  let currentFilter = 'all';
  let currentStatusFilter = 'all';
  let searchQuery = '';
  let viewMode = 'card'; // 'card' or 'table'

  const STATUS_LIST = ['待选购', '已下单', '已到货', '已安装', '已验收', '已退货'];
  const STATUS_COLORS = {
    '待选购': 'var(--ink-faint)',
    '已下单': 'var(--blue)',
    '已到货': 'var(--yellow-dark)',
    '已安装': 'var(--green)',
    '已验收': '#16a34a',
    '已退货': 'var(--red)'
  };
  const STATUS_BG = {
    '待选购': 'var(--cream-deep)',
    '已下单': 'rgba(43,127,216,0.08)',
    '已到货': 'rgba(244,215,88,0.15)',
    '已安装': 'rgba(22,163,74,0.08)',
    '已验收': 'rgba(22,163,74,0.12)',
    '已退货': 'rgba(232,74,95,0.08)'
  };

  // ==================== DATA HELPERS ====================

  function getFilteredItems() {
    let items = [...(data.items || [])];
    if (currentFilter !== 'all') {
      items = items.filter(it => it.category === currentFilter);
    }
    if (currentStatusFilter !== 'all') {
      items = items.filter(it => it.status === currentStatusFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(it =>
        (it.name || '').toLowerCase().includes(q) ||
        (it.brand || '').toLowerCase().includes(q) ||
        (it.model || '').toLowerCase().includes(q) ||
        (it.supplier || '').toLowerCase().includes(q) ||
        (it.location || '').toLowerCase().includes(q)
      );
    }
    return items.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  }

  function getStats() {
    const items = data.items || [];
    const total = items.length;
    const totalAmount = items.reduce((sum, it) => sum + (it.totalPrice || 0), 0);
    const byStatus = {};
    STATUS_LIST.forEach(s => byStatus[s] = 0);
    items.forEach(it => {
      if (byStatus[it.status] !== undefined) byStatus[it.status]++;
    });
    return { total, totalAmount, byStatus };
  }

  function generateId() {
    return 'mat_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
  }

  function formatCurrency(n) {
    if (n === undefined || n === null) return '¥0';
    return '¥' + Number(n).toLocaleString('zh-CN');
  }

  function getPhaseName(phaseId) {
    if (!phaseId) return '';
    const progressData = App.getData('progress') || {};
    const phase = (progressData.phases || []).find(p => p.id === phaseId);
    return phase ? phase.name : '';
  }

  function save() {
    data.updatedAt = new Date().toISOString();
    App.setData('materials', JSON.parse(JSON.stringify(data)));
  }

  // ==================== RENDER: STATS ====================

  function renderStats() {
    const stats = getStats();
    return `
      <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin-bottom:20px">
        <div class="app-card" style="text-align:center;padding:14px">
          <div style="font-size:1.4rem;font-weight:700;color:var(--ink)">${stats.total}</div>
          <div style="font-size:0.75rem;color:var(--ink-faint);margin-top:2px">总项数</div>
        </div>
        <div class="app-card" style="text-align:center;padding:14px">
          <div style="font-size:1.4rem;font-weight:700;color:var(--blue)">${stats.byStatus['待选购'] || 0}</div>
          <div style="font-size:0.75rem;color:var(--ink-faint);margin-top:2px">待选购</div>
        </div>
        <div class="app-card" style="text-align:center;padding:14px">
          <div style="font-size:1.4rem;font-weight:700;color:var(--yellow-dark)">${stats.byStatus['已下单'] || 0}</div>
          <div style="font-size:0.75rem;color:var(--ink-faint);margin-top:2px">已下单</div>
        </div>
        <div class="app-card" style="text-align:center;padding:14px">
          <div style="font-size:1.4rem;font-weight:700;color:var(--green)">${stats.byStatus['已到货'] || 0}</div>
          <div style="font-size:0.75rem;color:var(--ink-faint);margin-top:2px">已到货</div>
        </div>
        <div class="app-card" style="text-align:center;padding:14px">
          <div style="font-size:1.4rem;font-weight:700;color:#16a34a">${stats.byStatus['已安装'] || 0}</div>
          <div style="font-size:0.75rem;color:var(--ink-faint);margin-top:2px">已安装</div>
        </div>
        <div class="app-card" style="text-align:center;padding:14px">
          <div style="font-size:1.4rem;font-weight:700;color:var(--red)">${formatCurrency(stats.totalAmount)}</div>
          <div style="font-size:0.75rem;color:var(--ink-faint);margin-top:2px">总金额</div>
        </div>
      </div>
    `;
  }

  // ==================== RENDER: FILTERS ====================

  function renderFilters() {
    const categories = data.categories || [];
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <select class="app-input app-select" id="matCategoryFilter" style="width:auto;min-width:100px">
            <option value="all">全部分类</option>
            ${categories.map(c => `<option value="${c}" ${currentFilter === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
          <select class="app-input app-select" id="matStatusFilter" style="width:auto;min-width:100px">
            <option value="all">全部状态</option>
            ${STATUS_LIST.map(s => `<option value="${s}" ${currentStatusFilter === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
          <input type="text" class="app-input" id="matSearch" placeholder="搜索材料..." value="${escapeHtml(searchQuery)}" style="width:160px">
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <button class="btn btn-secondary btn-sm ${viewMode === 'card' ? 'active' : ''}" id="btnCardView" style="font-size:0.8rem">⊞ 卡片</button>
          <button class="btn btn-secondary btn-sm ${viewMode === 'table' ? 'active' : ''}" id="btnTableView" style="font-size:0.8rem">☰ 表格</button>
        </div>
      </div>
    `;
  }

  // ==================== RENDER: CARD VIEW ====================

  function renderCardView(items) {
    if (items.length === 0) {
      return `<div style="text-align:center;padding:60px 20px;color:var(--ink-faint)">
        <div style="font-size:2rem;margin-bottom:8px">🧱</div>
        <div style="font-size:0.9rem;margin-bottom:4px">暂无材料</div>
        <div style="font-size:0.8rem">点击右上角添加按钮开始记录</div>
      </div>`;
    }

    return `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px">
      ${items.map(it => `
        <div class="app-card mat-card" data-id="${it.id}" style="cursor:pointer;border-left:3px solid ${STATUS_COLORS[it.status] || 'var(--ink-faint)'};position:relative;overflow:hidden">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
            <div style="flex:1;min-width:0">
              <div style="font-weight:600;font-size:0.95rem;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(it.name)}</div>
              <div style="font-size:0.78rem;color:var(--ink-faint)">
                ${it.brand ? escapeHtml(it.brand) + ' · ' : ''}${it.category}
              </div>
            </div>
            <span style="font-size:0.75rem;padding:3px 10px;border-radius:10px;background:${STATUS_BG[it.status] || 'var(--cream-deep)'};color:${STATUS_COLORS[it.status] || 'var(--ink-faint)'};font-weight:600;white-space:nowrap">${it.status}</span>
          </div>
          
          <div style="display:flex;gap:12px;margin-bottom:10px;font-size:0.8rem;color:var(--ink-light)">
            ${it.model ? `<div>型号: ${escapeHtml(it.model)}</div>` : ''}
            ${it.spec ? `<div>规格: ${escapeHtml(it.spec)}</div>` : ''}
          </div>
          
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <div style="font-size:0.85rem;color:var(--ink-light)">
              ${it.quantity ? `${it.quantity} ${it.unit || '件'}` : ''}
              ${it.unitPrice ? ` × ${formatCurrency(it.unitPrice)}` : ''}
            </div>
            <div style="font-size:1.1rem;font-weight:700;color:var(--red)">${formatCurrency(it.totalPrice)}</div>
          </div>
          
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.75rem;color:var(--ink-faint)">
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              ${it.supplier ? `<span>🏪 ${escapeHtml(it.supplier)}</span>` : ''}
              ${it.phaseId ? `<span>🔨 ${escapeHtml(getPhaseName(it.phaseId))}</span>` : ''}
              ${it.location ? `<span>📍 ${escapeHtml(it.location)}</span>` : ''}
            </div>
            ${it.photos?.length ? `<span>📷 ${it.photos.length}</span>` : ''}
          </div>
          
          <!-- Quick status actions -->
          <div style="display:flex;gap:4px;margin-top:12px;padding-top:10px;border-top:1px solid var(--border-light)">
            ${renderQuickActions(it)}
          </div>
        </div>
      `).join('')}
    </div>`;
  }

  function renderQuickActions(it) {
    const statusIndex = STATUS_LIST.indexOf(it.status);
    const actions = [];
    
    // Previous status
    if (statusIndex > 0 && it.status !== '已退货') {
      actions.push(`<button class="btn btn-icon btn-sm mat-action-prev" data-id="${it.id}" title="回退到${STATUS_LIST[statusIndex - 1]}" style="font-size:0.75rem;padding:2px 6px">◀</button>`);
    }
    
    // Next status
    if (statusIndex < STATUS_LIST.length - 2 && it.status !== '已退货') { // -2 to skip 已退货
      actions.push(`<button class="btn btn-primary btn-sm mat-action-next" data-id="${it.id}" title="推进到${STATUS_LIST[statusIndex + 1]}" style="font-size:0.75rem;padding:2px 8px">${STATUS_LIST[statusIndex + 1]} ▶</button>`);
    }
    
    // Mark as returned
    if (it.status !== '已退货') {
      actions.push(`<button class="btn btn-danger btn-sm mat-action-return" data-id="${it.id}" title="标记退货" style="font-size:0.75rem;padding:2px 8px;margin-left:auto">↩ 退货</button>`);
    }
    
    return actions.join('');
  }

  // ==================== RENDER: TABLE VIEW ====================

  function renderTableView(items) {
    if (items.length === 0) {
      return `<div style="text-align:center;padding:60px 20px;color:var(--ink-faint)">
        <div style="font-size:2rem;margin-bottom:8px">🧱</div>
        <div style="font-size:0.9rem;margin-bottom:4px">暂无材料</div>
        <div style="font-size:0.8rem">点击右上角添加按钮开始记录</div>
      </div>`;
    }

    return `
      <div class="data-table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>材料名称</th>
              <th>分类</th>
              <th>品牌/型号</th>
              <th>规格</th>
              <th>数量</th>
              <th>单价</th>
              <th>总价</th>
              <th>供应商</th>
              <th>状态</th>
              <th>关联阶段</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(it => `
              <tr class="mat-row" data-id="${it.id}" style="cursor:pointer">
                <td style="font-weight:600">${escapeHtml(it.name)}</td>
                <td>${it.category}</td>
                <td>${escapeHtml(it.brand || '')}${it.brand && it.model ? ' / ' : ''}${escapeHtml(it.model || '')}</td>
                <td>${escapeHtml(it.spec || '')}</td>
                <td>${it.quantity || ''} ${it.unit || ''}</td>
                <td>${it.unitPrice ? formatCurrency(it.unitPrice) : ''}</td>
                <td style="color:var(--red);font-weight:600">${formatCurrency(it.totalPrice)}</td>
                <td>${escapeHtml(it.supplier || '')}</td>
                <td><span style="padding:2px 8px;border-radius:8px;background:${STATUS_BG[it.status] || 'var(--cream-deep)'};color:${STATUS_COLORS[it.status] || 'var(--ink-faint)'};font-size:0.75rem;font-weight:600">${it.status}</span></td>
                <td>${escapeHtml(getPhaseName(it.phaseId))}</td>
                <td>
                  <button class="btn btn-icon btn-sm mat-action-edit" data-id="${it.id}" title="编辑">✏️</button>
                  <button class="btn btn-icon btn-sm mat-action-delete" data-id="${it.id}" title="删除" style="color:var(--red)">🗑️</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  // ==================== RENDER: MAIN ====================

  function render() {
    const container = document.getElementById('materials-content');
    const items = getFilteredItems();
    
    container.innerHTML = `
      ${renderStats()}
      ${renderFilters()}
      ${viewMode === 'card' ? renderCardView(items) : renderTableView(items)}
    `;
    
    bindEvents();
  }

  function bindEvents() {
    // Filters
    document.getElementById('matCategoryFilter')?.addEventListener('change', (e) => { currentFilter = e.target.value; render(); });
    document.getElementById('matStatusFilter')?.addEventListener('change', (e) => { currentStatusFilter = e.target.value; render(); });
    document.getElementById('matSearch')?.addEventListener('input', (e) => { searchQuery = e.target.value; render(); });
    
    // View mode
    document.getElementById('btnCardView')?.addEventListener('click', () => { viewMode = 'card'; render(); });
    document.getElementById('btnTableView')?.addEventListener('click', () => { viewMode = 'table'; render(); });
    
    // Card click -> detail
    document.querySelectorAll('.mat-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.mat-action-prev, .mat-action-next, .mat-action-return')) return;
        showDetailModal(card.dataset.id);
      });
    });
    
    // Table row click -> detail
    document.querySelectorAll('.mat-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('.mat-action-edit, .mat-action-delete')) return;
        showDetailModal(row.dataset.id);
      });
    });
    
    // Quick actions
    document.querySelectorAll('.mat-action-prev').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); changeStatus(btn.dataset.id, -1); });
    });
    document.querySelectorAll('.mat-action-next').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); changeStatus(btn.dataset.id, 1); });
    });
    document.querySelectorAll('.mat-action-return').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); setStatus(btn.dataset.id, '已退货'); });
    });
    
    // Table actions
    document.querySelectorAll('.mat-action-edit').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); showEditModal(btn.dataset.id); });
    });
    document.querySelectorAll('.mat-action-delete').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); deleteMaterial(btn.dataset.id); });
    });
  }

  // ==================== STATUS CHANGE ====================

  function changeStatus(id, direction) {
    const it = data.items.find(i => i.id === id);
    if (!it) return;
    const idx = STATUS_LIST.indexOf(it.status);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx >= 0 && newIdx < STATUS_LIST.length) {
      it.status = STATUS_LIST[newIdx];
      it.updatedAt = new Date().toISOString();
      
      // Auto-set dates
      if (it.status === '已下单' && !it.purchaseDate) it.purchaseDate = new Date().toISOString().slice(0, 10);
      if (it.status === '已到货' && !it.arrivalDate) it.arrivalDate = new Date().toISOString().slice(0, 10);
      if (it.status === '已安装' && !it.installDate) it.installDate = new Date().toISOString().slice(0, 10);
      if (it.status === '已验收' && !it.checkDate) it.checkDate = new Date().toISOString().slice(0, 10);
      
      save();
      render();
      App.showToast(`已更新为「${it.status}」`, 'success');
    }
  }

  function setStatus(id, status) {
    const it = data.items.find(i => i.id === id);
    if (!it) return;
    it.status = status;
    it.updatedAt = new Date().toISOString();
    save();
    render();
    App.showToast(`已标记为「${status}」`, 'success');
  }

  function deleteMaterial(id) {
    if (!confirm('确定要删除这个材料吗？')) return;
    data.items = data.items.filter(i => i.id !== id);
    save();
    render();
    App.showToast('材料已删除', 'success');
  }

  // ==================== DETAIL MODAL ====================

  function showDetailModal(id) {
    const it = data.items.find(i => i.id === id);
    if (!it) return;
    
    const overlay = document.getElementById('modalOverlay');
    const content = document.getElementById('modalContent');
    
    content.innerHTML = `
      <div class="modal-header">
        <div class="modal-title">🧱 ${escapeHtml(it.name)}</div>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      <div class="modal-body">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid var(--border-light)">
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:0.8rem;padding:4px 12px;border-radius:10px;background:${STATUS_BG[it.status] || 'var(--cream-deep)'};color:${STATUS_COLORS[it.status] || 'var(--ink-faint)'};font-weight:600">${it.status}</span>
            <span style="font-size:0.8rem;color:var(--ink-faint)">${it.category}</span>
          </div>
          <div style="font-size:1.2rem;font-weight:700;color:var(--red)">${formatCurrency(it.totalPrice)}</div>
        </div>
        
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
          ${it.brand ? `<div><div style="font-size:0.75rem;color:var(--ink-faint);margin-bottom:2px">品牌</div><div style="font-size:0.9rem">${escapeHtml(it.brand)}</div></div>` : ''}
          ${it.model ? `<div><div style="font-size:0.75rem;color:var(--ink-faint);margin-bottom:2px">型号</div><div style="font-size:0.9rem">${escapeHtml(it.model)}</div></div>` : ''}
          ${it.spec ? `<div><div style="font-size:0.75rem;color:var(--ink-faint);margin-bottom:2px">规格</div><div style="font-size:0.9rem">${escapeHtml(it.spec)}</div></div>` : ''}
          ${it.quantity ? `<div><div style="font-size:0.75rem;color:var(--ink-faint);margin-bottom:2px">数量</div><div style="font-size:0.9rem">${it.quantity} ${it.unit || '件'}</div></div>` : ''}
          ${it.unitPrice ? `<div><div style="font-size:0.75rem;color:var(--ink-faint);margin-bottom:2px">单价</div><div style="font-size:0.9rem">${formatCurrency(it.unitPrice)}</div></div>` : ''}
          ${it.supplier ? `<div><div style="font-size:0.75rem;color:var(--ink-faint);margin-bottom:2px">供应商</div><div style="font-size:0.9rem">${escapeHtml(it.supplier)}</div></div>` : ''}
          ${it.phaseId ? `<div><div style="font-size:0.75rem;color:var(--ink-faint);margin-bottom:2px">关联阶段</div><div style="font-size:0.9rem">${escapeHtml(getPhaseName(it.phaseId))}</div></div>` : ''}
          ${it.location ? `<div><div style="font-size:0.75rem;color:var(--ink-faint);margin-bottom:2px">使用位置</div><div style="font-size:0.9rem">${escapeHtml(it.location)}</div></div>` : ''}
        </div>
        
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;margin-bottom:16px;padding:10px;background:var(--cream-deep);border-radius:var(--radius-sm)">
          ${it.purchaseDate ? `<div style="text-align:center"><div style="font-size:0.7rem;color:var(--ink-faint)">购买日期</div><div style="font-size:0.8rem;font-weight:600">${it.purchaseDate}</div></div>` : ''}
          ${it.arrivalDate ? `<div style="text-align:center"><div style="font-size:0.7rem;color:var(--ink-faint)">到货日期</div><div style="font-size:0.8rem;font-weight:600">${it.arrivalDate}</div></div>` : ''}
          ${it.installDate ? `<div style="text-align:center"><div style="font-size:0.7rem;color:var(--ink-faint)">安装日期</div><div style="font-size:0.8rem;font-weight:600">${it.installDate}</div></div>` : ''}
          ${it.checkDate ? `<div style="text-align:center"><div style="font-size:0.7rem;color:var(--ink-faint)">验收日期</div><div style="font-size:0.8rem;font-weight:600">${it.checkDate}</div></div>` : ''}
        </div>
        
        ${it.note ? `<div style="margin-bottom:16px"><div style="font-size:0.75rem;color:var(--ink-faint);margin-bottom:4px">备注</div><div style="font-size:0.9rem;line-height:1.5">${escapeHtml(it.note)}</div></div>` : ''}
        
        ${it.photos?.length ? `
          <div style="margin-bottom:16px">
            <div style="font-size:0.75rem;color:var(--ink-faint);margin-bottom:8px">照片 (${it.photos.length})</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px">
              ${it.photos.map(ph => `
                <div style="aspect-ratio:1;background:var(--cream-deep);border-radius:var(--radius-sm);overflow:hidden;cursor:pointer" onclick="window.open('${ph}','_blank')">
                  <img src="${ph}" style="width:100%;height:100%;object-fit:cover">
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">关闭</button>
        <button class="btn btn-primary" id="btnMatEdit">编辑</button>
        <button class="btn btn-primary" id="btnMatAddBudget" style="margin-left:8px">💰 添加到预算</button>
        <button class="btn btn-danger" id="btnMatDelete" style="margin-left:auto">删除</button>
      </div>
    `;
    overlay.classList.add('show');
    
    document.getElementById('btnMatEdit').addEventListener('click', () => {
      closeModal();
      showEditModal(id);
    });
    
    document.getElementById('btnMatAddBudget').addEventListener('click', () => {
      addToBudget(it);
    });
    
    document.getElementById('btnMatDelete').addEventListener('click', () => {
      closeModal();
      deleteMaterial(id);
    });
  }

  // ==================== ADD TO BUDGET ====================

  function addToBudget(it) {
    const budgetData = App.getData('budget') || { items: [], payments: [] };
    
    // Check if already added
    const existing = (budgetData.items || []).find(bi => bi.materialId === it.id);
    if (existing) {
      App.showToast('该材料已添加到预算', 'warning');
      return;
    }
    
    // Add as budget item
    const budgetItem = {
      id: 'item_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
      materialId: it.id,
      name: it.name + (it.brand ? ` (${it.brand})` : ''),
      budget: it.totalPrice || 0,
      actual: it.status === '已下单' || it.status === '已到货' || it.status === '已安装' || it.status === '已验收' ? (it.totalPrice || 0) : 0,
      note: `材料清单导入：${it.category}${it.model ? ' / ' + it.model : ''}${it.spec ? ' / ' + it.spec : ''}`
    };
    
    budgetData.items = budgetData.items || [];
    budgetData.items.push(budgetItem);
    
    // If already purchased, add payment record
    if (it.status === '已下单' || it.status === '已到货' || it.status === '已安装' || it.status === '已验收') {
      const payment = {
        id: 'pay_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6),
        itemId: budgetItem.id,
        date: it.purchaseDate || new Date().toISOString().slice(0, 10),
        amount: it.totalPrice || 0,
        type: '全款',
        payer: App.config?.currentUserId || 'user_1',
        method: '其他',
        receiptDocId: null,
        note: `材料采购：${it.name}`
      };
      budgetData.payments = budgetData.payments || [];
      budgetData.payments.push(payment);
    }
    
    // Recalculate total budget
    budgetData.totalBudget = (budgetData.items || []).reduce((sum, bi) => sum + (bi.budget || 0), 0);
    
    App.setData('budget', JSON.parse(JSON.stringify(budgetData)));
    App.showToast('已添加到预算', 'success');
    closeModal();
  }

  // ==================== EDIT/ADD MODAL ====================

  function showEditModal(id) {
    const it = id ? data.items.find(i => i.id === id) : null;
    const isEdit = !!it;
    const categories = data.categories || [];
    const progressData = App.getData('progress') || {};
    const phases = progressData.phases || [];
    
    const overlay = document.getElementById('modalOverlay');
    const content = document.getElementById('modalContent');
    
    content.innerHTML = `
      <div class="modal-header">
        <div class="modal-title">${isEdit ? '✏️ 编辑材料' : '➕ 新增材料'}</div>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      <div class="modal-body">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <div>
            <label style="display:block;font-size:0.78rem;color:var(--ink-light);margin-bottom:4px">材料名称 *</label>
            <input type="text" class="app-input" id="matName" value="${escapeHtml(it?.name || '')}" placeholder="例如：客厅瓷砖">
          </div>
          <div>
            <label style="display:block;font-size:0.78rem;color:var(--ink-light);margin-bottom:4px">分类 *</label>
            <select class="app-input app-select" id="matCategory">
              ${categories.map(c => `<option value="${c}" ${(it?.category || categories[0]) === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
        </div>
        
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <div>
            <label style="display:block;font-size:0.78rem;color:var(--ink-light);margin-bottom:4px">品牌</label>
            <input type="text" class="app-input" id="matBrand" value="${escapeHtml(it?.brand || '')}" placeholder="例如：马可波罗">
          </div>
          <div>
            <label style="display:block;font-size:0.78rem;color:var(--ink-light);margin-bottom:4px">型号</label>
            <input type="text" class="app-input" id="matModel" value="${escapeHtml(it?.model || '')}" placeholder="例如：CH8810">
          </div>
        </div>
        
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <div>
            <label style="display:block;font-size:0.78rem;color:var(--ink-light);margin-bottom:4px">规格</label>
            <input type="text" class="app-input" id="matSpec" value="${escapeHtml(it?.spec || '')}" placeholder="例如：800x800mm">
          </div>
          <div>
            <label style="display:block;font-size:0.78rem;color:var(--ink-light);margin-bottom:4px">供应商/购买渠道</label>
            <input type="text" class="app-input" id="matSupplier" value="${escapeHtml(it?.supplier || '')}" placeholder="例如：居然之家">
          </div>
        </div>
        
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px">
          <div>
            <label style="display:block;font-size:0.78rem;color:var(--ink-light);margin-bottom:4px">数量</label>
            <input type="number" class="app-input" id="matQuantity" value="${it?.quantity || ''}" placeholder="0">
          </div>
          <div>
            <label style="display:block;font-size:0.78rem;color:var(--ink-light);margin-bottom:4px">单位</label>
            <input type="text" class="app-input" id="matUnit" value="${escapeHtml(it?.unit || '件')}" placeholder="件/片/米/套">
          </div>
          <div>
            <label style="display:block;font-size:0.78rem;color:var(--ink-light);margin-bottom:4px">单价 (¥)</label>
            <input type="number" class="app-input" id="matUnitPrice" value="${it?.unitPrice || ''}" placeholder="0">
          </div>
        </div>
        
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <div>
            <label style="display:block;font-size:0.78rem;color:var(--ink-light);margin-bottom:4px">状态</label>
            <select class="app-input app-select" id="matStatus">
              ${STATUS_LIST.map(s => `<option value="${s}" ${(it?.status || '待选购') === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="display:block;font-size:0.78rem;color:var(--ink-light);margin-bottom:4px">关联阶段</label>
            <select class="app-input app-select" id="matPhase">
              <option value="">无</option>
              ${phases.map(p => `<option value="${p.id}" ${it?.phaseId === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}
            </select>
          </div>
        </div>
        
        <div style="margin-bottom:12px">
          <label style="display:block;font-size:0.78rem;color:var(--ink-light);margin-bottom:4px">使用位置</label>
          <input type="text" class="app-input" id="matLocation" value="${escapeHtml(it?.location || '')}" placeholder="例如：客厅、厨房、主卧">
        </div>
        
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;margin-bottom:12px">
          <div>
            <label style="display:block;font-size:0.78rem;color:var(--ink-light);margin-bottom:4px">购买日期</label>
            <input type="date" class="app-input" id="matPurchaseDate" value="${it?.purchaseDate || ''}">
          </div>
          <div>
            <label style="display:block;font-size:0.78rem;color:var(--ink-light);margin-bottom:4px">到货日期</label>
            <input type="date" class="app-input" id="matArrivalDate" value="${it?.arrivalDate || ''}">
          </div>
          <div>
            <label style="display:block;font-size:0.78rem;color:var(--ink-light);margin-bottom:4px">安装日期</label>
            <input type="date" class="app-input" id="matInstallDate" value="${it?.installDate || ''}">
          </div>
          <div>
            <label style="display:block;font-size:0.78rem;color:var(--ink-light);margin-bottom:4px">验收日期</label>
            <input type="date" class="app-input" id="matCheckDate" value="${it?.checkDate || ''}">
          </div>
        </div>
        
        <div style="margin-bottom:12px">
          <label style="display:block;font-size:0.78rem;color:var(--ink-light);margin-bottom:4px">备注</label>
          <textarea class="app-input app-textarea" id="matNote" rows="3" placeholder="颜色、材质、特殊要求等">${escapeHtml(it?.note || '')}</textarea>
        </div>
        
        <div style="margin-bottom:12px">
          <label style="display:block;font-size:0.78rem;color:var(--ink-light);margin-bottom:4px">照片链接（每行一个URL）</label>
          <textarea class="app-input app-textarea" id="matPhotos" rows="2" placeholder="https://...">${escapeHtml((it?.photos || []).join('\n'))}</textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">取消</button>
        <button class="btn btn-primary" id="btnMatSave">${isEdit ? '保存' : '添加'}</button>
      </div>
    `;
    overlay.classList.add('show');
    
    document.getElementById('btnMatSave').addEventListener('click', () => {
      const name = document.getElementById('matName').value.trim();
      if (!name) {
        App.showToast('请填写材料名称', 'warning');
        return;
      }
      
      const quantity = Number(document.getElementById('matQuantity').value) || 0;
      const unitPrice = Number(document.getElementById('matUnitPrice').value) || 0;
      const totalPrice = quantity * unitPrice;
      
      const photos = document.getElementById('matPhotos').value.split('\n').map(p => p.trim()).filter(Boolean);
      
      const record = {
        id: isEdit ? it.id : generateId(),
        name,
        category: document.getElementById('matCategory').value,
        brand: document.getElementById('matBrand').value.trim(),
        model: document.getElementById('matModel').value.trim(),
        spec: document.getElementById('matSpec').value.trim(),
        quantity,
        unit: document.getElementById('matUnit').value.trim() || '件',
        unitPrice,
        totalPrice,
        supplier: document.getElementById('matSupplier').value.trim(),
        status: document.getElementById('matStatus').value,
        phaseId: document.getElementById('matPhase').value,
        location: document.getElementById('matLocation').value.trim(),
        purchaseDate: document.getElementById('matPurchaseDate').value,
        arrivalDate: document.getElementById('matArrivalDate').value,
        installDate: document.getElementById('matInstallDate').value,
        checkDate: document.getElementById('matCheckDate').value,
        note: document.getElementById('matNote').value.trim(),
        photos,
        updatedAt: new Date().toISOString()
      };
      
      if (isEdit) {
        const idx = data.items.findIndex(i => i.id === id);
        if (idx >= 0) {
          record.createdAt = data.items[idx].createdAt;
          data.items[idx] = record;
        }
      } else {
        record.createdAt = new Date().toISOString();
        data.items.push(record);
      }
      
      save();
      render();
      closeModal();
      App.showToast(isEdit ? '材料已更新' : '材料已添加', 'success');
    });
  }

  // ==================== REGISTER MODULE ====================

  registerModule('materials', {
    name: '材料',
    init() {
      const btn = document.getElementById('btnAddMaterial');
      if (btn) btn.addEventListener('click', () => showEditModal());
    },
    render() {
      render();
    },
    onShow() {
      render();
    },
    setData(d) {
      data = d || { version: '1.0', updatedAt: new Date().toISOString(), items: [], categories: ['瓷砖', '地板', '涂料/油漆', '五金', '灯具', '洁具/卫浴', '门窗', '定制柜', '家电', '家具', '软装', '其他'] };
    }
  });
})();
