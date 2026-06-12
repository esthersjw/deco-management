// Contacts Module (服务商通讯录)
(function() {
  'use strict';

  // ── Constants ──
  const CONTACT_TYPES = ['设计师', '施工队', '水电工', '瓦工', '木工', '油漆工', '安装工', '监理', '其他'];
  const PHASE_NAMES = ['拆除', '水电', '泥瓦', '木工', '油漆', '安装'];
  const STATUS_LIST = ['合作中', '已完工', '备选', '不推荐'];
  const STATUS_COLORS = {
    '合作中': { bg: '#dbeafe', text: '#1e6bc0', badge: 'blue' },
    '已完工': { bg: '#dcfce7', text: '#16a34a', badge: 'green' },
    '备选': { bg: '#fef3c7', text: '#b45309', badge: 'yellow' },
    '不推荐': { bg: '#fee2e2', text: '#dc2626', badge: 'red' }
  };
  const TYPE_ICONS = {
    '设计师': '🎨', '施工队': '👷', '水电工': '🔌', '瓦工': '🧱',
    '木工': '🪚', '油漆工': '🎨', '安装工': '🔧', '监理': '👁', '其他': '📋'
  };

  // ── State ──
  let data = { version: '1.0', updatedAt: '', contacts: [] };
  let currentView = 'card'; // 'card' | 'table'
  let filters = { type: 'all', status: 'all', phase: 'all', search: '' };

  // ── Helpers ──
  function genId() {
    return 'ct_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
  }

  function escapeHtml(str) {
    if (str == null) return '';
    return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
  }

  function save() {
    data.updatedAt = new Date().toISOString();
    App.setData('contacts', JSON.parse(JSON.stringify(data)));
  }

  function getFilteredContacts() {
    let list = data.contacts || [];
    if (filters.type !== 'all') {
      list = list.filter(c => c.type === filters.type);
    }
    if (filters.status !== 'all') {
      list = list.filter(c => c.status === filters.status);
    }
    if (filters.phase !== 'all') {
      list = list.filter(c => (c.phases || []).includes(filters.phase));
    }
    if (filters.search) {
      const s = filters.search.toLowerCase();
      list = list.filter(c =>
        (c.name || '').toLowerCase().includes(s) ||
        (c.contactName || '').toLowerCase().includes(s) ||
        (c.phone || '').toLowerCase().includes(s) ||
        (c.wechat || '').toLowerCase().includes(s) ||
        (c.note || '').toLowerCase().includes(s)
      );
    }
    return list;
  }

  function renderStars(rating) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
      html += `<span style="color:${i <= (rating || 0) ? '#F4D758' : '#ddd'};font-size:0.9rem">★</span>`;
    }
    return html;
  }

  // ── Render: Filters ──
  function renderFilters() {
    return `
      <div class="filter-bar">
        <select class="app-input app-select" id="filterContactType" style="min-width:100px">
          <option value="all">全部类型</option>
          ${CONTACT_TYPES.map(t => `<option value="${t}" ${filters.type === t ? 'selected' : ''}>${TYPE_ICONS[t] || '📋'} ${t}</option>`).join('')}
        </select>
        <select class="app-input app-select" id="filterContactStatus" style="min-width:100px">
          <option value="all">全部状态</option>
          ${STATUS_LIST.map(s => `<option value="${s}" ${filters.status === s ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
        <select class="app-input app-select" id="filterContactPhase" style="min-width:100px">
          <option value="all">全部阶段</option>
          ${PHASE_NAMES.map(p => `<option value="${p}" ${filters.phase === p ? 'selected' : ''}>${p}</option>`).join('')}
        </select>
        <input type="text" class="app-input" id="contactSearch" placeholder="🔍 搜索服务商..." value="${escapeHtml(filters.search)}" style="max-width:200px">
        <div style="flex:1"></div>
        <button class="btn btn-sm ${currentView === 'card' ? 'btn-primary' : 'btn-secondary'}" onclick="MODULES.contacts.setView('card')">⊞ 卡片</button>
        <button class="btn btn-sm ${currentView === 'table' ? 'btn-primary' : 'btn-secondary'}" onclick="MODULES.contacts.setView('table')">☰ 列表</button>
      </div>
    `;
  }

  // ── Render: Card View ──
  function renderCardView(contacts) {
    if (contacts.length === 0) {
      return `<div class="empty-state"><div class="empty-state-icon">📇</div><div class="empty-state-text">暂无服务商</div><div class="text-sm text-faint">点击右上角添加你的装修服务商</div></div>`;
    }
    let html = '<div class="grid-3">';
    contacts.forEach(c => {
      const statusStyle = STATUS_COLORS[c.status] || STATUS_COLORS['备选'];
      const typeIcon = TYPE_ICONS[c.type] || '📋';
      const phasesHtml = (c.phases || []).map(p => `<span class="badge badge-gray" style="font-size:0.7rem">${p}</span>`).join(' ');
      html += `
        <div class="app-card" style="padding:16px;display:flex;flex-direction:column;gap:10px;cursor:pointer" onclick="MODULES.contacts.editContact('${c.id}')">
          <div class="flex-between" style="align-items:flex-start">
            <div style="display:flex;align-items:center;gap:10px">
              <div style="width:40px;height:40px;border-radius:50%;background:var(--blue-light);display:flex;align-items:center;justify-content:center;font-size:1.3rem">${typeIcon}</div>
              <div>
                <div style="font-weight:600;font-size:1rem">${escapeHtml(c.name)}</div>
                <div class="text-xs text-faint">${escapeHtml(c.type)} · ${escapeHtml(c.contactName || '未填写联系人')}</div>
              </div>
            </div>
            <span class="badge badge-${statusStyle.badge}" style="font-size:0.7rem">${c.status}</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;font-size:0.85rem">
            ${c.phone ? `<div>📞 ${escapeHtml(c.phone)}</div>` : ''}
            ${c.wechat ? `<div>💬 微信: ${escapeHtml(c.wechat)}</div>` : ''}
            ${c.email ? `<div>✉️ ${escapeHtml(c.email)}</div>` : ''}
          </div>
          ${phasesHtml ? `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:2px">${phasesHtml}</div>` : ''}
          <div style="margin-top:auto;padding-top:8px;border-top:1px solid var(--border-light);display:flex;justify-content:space-between;align-items:center">
            <div>${renderStars(c.rating)}</div>
            <button class="btn-icon" onclick="event.stopPropagation();MODULES.contacts.deleteContact('${c.id}')" title="删除">🗑</button>
          </div>
        </div>
      `;
    });
    html += '</div>';
    return html;
  }

  // ── Render: Table View ──
  function renderTableView(contacts) {
    if (contacts.length === 0) {
      return `<div class="empty-state"><div class="empty-state-icon">📇</div><div class="empty-state-text">暂无服务商</div></div>`;
    }
    let html = `<div style="overflow-x:auto"><table class="data-table"><thead><tr><th>名称</th><th>类型</th><th>联系人</th><th>电话</th><th>负责阶段</th><th>状态</th><th>评分</th><th style="text-align:center;width:80px">操作</th></tr></thead><tbody>`;
    contacts.forEach(c => {
      const statusStyle = STATUS_COLORS[c.status] || STATUS_COLORS['备选'];
      const phasesHtml = (c.phases || []).map(p => `<span class="badge badge-gray" style="font-size:0.7rem">${p}</span>`).join(' ');
      html += `
        <tr style="cursor:pointer" onclick="MODULES.contacts.editContact('${c.id}')">
          <td><strong>${escapeHtml(c.name)}</strong></td>
          <td>${TYPE_ICONS[c.type] || '📋'} ${escapeHtml(c.type)}</td>
          <td>${escapeHtml(c.contactName || '-')}</td>
          <td>${escapeHtml(c.phone || '-')}</td>
          <td>${phasesHtml || '<span style="color:var(--ink-faint)">-</span>'}</td>
          <td><span class="badge badge-${statusStyle.badge}">${c.status}</span></td>
          <td>${renderStars(c.rating)}</td>
          <td style="text-align:center">
            <button class="btn-icon" onclick="event.stopPropagation();MODULES.contacts.deleteContact('${c.id}')" title="删除">🗑</button>
          </td>
        </tr>
      `;
    });
    html += '</tbody></table></div>';
    return html;
  }

  // ── Render: Current Phase Alert ──
  function renderCurrentPhaseAlert() {
    const progressData = App.getData('progress');
    if (!progressData || !progressData.currentPhaseId) return '';
    const currentPhase = (progressData.phases || []).find(p => p.id === progressData.currentPhaseId);
    if (!currentPhase) return '';
    const phaseContacts = (data.contacts || []).filter(c =>
      c.status === '合作中' && (c.phases || []).includes(currentPhase.name)
    );
    if (phaseContacts.length === 0) return '';
    return `
      <div style="background:var(--blue-light);border:1px solid var(--blue);border-radius:var(--radius);padding:12px 16px;margin-bottom:16px;display:flex;align-items:center;gap:12px">
        <span style="font-size:1.2rem">👷</span>
        <div style="flex:1">
          <div style="font-weight:600;color:var(--blue)">当前阶段「${currentPhase.name}」合作中的服务商</div>
          <div style="font-size:0.85rem;color:var(--ink-light);margin-top:2px">
            ${phaseContacts.map(c => `📞 <strong>${escapeHtml(c.name)}</strong> ${c.phone ? '(' + escapeHtml(c.phone) + ')' : ''}`).join(' · ')}
          </div>
        </div>
      </div>
    `;
  }

  // ── Main Render ──
  function render() {
    const container = document.getElementById('contacts-content');
    if (!container) return;
    const contacts = getFilteredContacts();
    let html = renderCurrentPhaseAlert();
    html += renderFilters();
    html += currentView === 'card' ? renderCardView(contacts) : renderTableView(contacts);
    container.innerHTML = html;
    bindFilterEvents();
  }

  function bindFilterEvents() {
    const typeEl = document.getElementById('filterContactType');
    const statusEl = document.getElementById('filterContactStatus');
    const phaseEl = document.getElementById('filterContactPhase');
    const searchEl = document.getElementById('contactSearch');
    if (typeEl) typeEl.addEventListener('change', (e) => { filters.type = e.target.value; render(); });
    if (statusEl) statusEl.addEventListener('change', (e) => { filters.status = e.target.value; render(); });
    if (phaseEl) phaseEl.addEventListener('change', (e) => { filters.phase = e.target.value; render(); });
    if (searchEl) searchEl.addEventListener('input', (e) => { filters.search = e.target.value; render(); });
  }

  // ── Modal: Edit/Add ──
  function showEditModal(contactId) {
    const isEdit = !!contactId;
    const c = isEdit ? (data.contacts || []).find(x => x.id === contactId) : null;
    const overlay = document.getElementById('modalOverlay');
    const content = document.getElementById('modalContent');

    content.innerHTML = `
      <div class="modal-header">
        <div class="modal-title">${isEdit ? '✏️ 编辑服务商' : '➕ 新增服务商'}</div>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      <div class="modal-body" style="display:flex;flex-direction:column;gap:14px;max-height:70vh;overflow-y:auto">
        <div>
          <label style="display:block;font-size:0.8rem;color:var(--ink-light);margin-bottom:6px">服务商名称 *</label>
          <input type="text" class="app-input" id="contactNameInput" value="${escapeHtml(c?.name || '')}" placeholder="例如：张师傅水电">
        </div>
        <div>
          <label style="display:block;font-size:0.8rem;color:var(--ink-light);margin-bottom:6px">类型 *</label>
          <select class="app-input app-select" id="contactTypeInput">
            ${CONTACT_TYPES.map(t => `<option value="${t}" ${c?.type === t ? 'selected' : ''}>${TYPE_ICONS[t] || '📋'} ${t}</option>`).join('')}
          </select>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label style="display:block;font-size:0.8rem;color:var(--ink-light);margin-bottom:6px">联系人姓名</label>
            <input type="text" class="app-input" id="contactPersonInput" value="${escapeHtml(c?.contactName || '')}" placeholder="联系人">
          </div>
          <div>
            <label style="display:block;font-size:0.8rem;color:var(--ink-light);margin-bottom:6px">电话</label>
            <input type="tel" class="app-input" id="contactPhoneInput" value="${escapeHtml(c?.phone || '')}" placeholder="手机号码">
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label style="display:block;font-size:0.8rem;color:var(--ink-light);margin-bottom:6px">微信</label>
            <input type="text" class="app-input" id="contactWechatInput" value="${escapeHtml(c?.wechat || '')}" placeholder="微信号">
          </div>
          <div>
            <label style="display:block;font-size:0.8rem;color:var(--ink-light);margin-bottom:6px">邮箱</label>
            <input type="email" class="app-input" id="contactEmailInput" value="${escapeHtml(c?.email || '')}" placeholder="邮箱地址">
          </div>
        </div>
        <div>
          <label style="display:block;font-size:0.8rem;color:var(--ink-light);margin-bottom:6px">负责阶段（可多选）</label>
          <div style="display:flex;flex-wrap:wrap;gap:8px">
            ${PHASE_NAMES.map(p => `
              <label style="display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:8px;background:var(--cream-deep);cursor:pointer;font-size:0.85rem;border:1.5px solid ${(c?.phases || []).includes(p) ? 'var(--blue)' : 'transparent'}">
                <input type="checkbox" value="${p}" ${(c?.phases || []).includes(p) ? 'checked' : ''} class="contactPhaseCb" style="cursor:pointer">
                ${p}
              </label>
            `).join('')}
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label style="display:block;font-size:0.8rem;color:var(--ink-light);margin-bottom:6px">状态</label>
            <select class="app-input app-select" id="contactStatusInput">
              ${STATUS_LIST.map(s => `<option value="${s}" ${c?.status === s ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
          <div>
            <label style="display:block;font-size:0.8rem;color:var(--ink-light);margin-bottom:6px">评分 (1-5)</label>
            <input type="number" class="app-input" id="contactRatingInput" min="1" max="5" value="${c?.rating || 3}" style="width:80px">
          </div>
        </div>
        <div>
          <label style="display:block;font-size:0.8rem;color:var(--ink-light);margin-bottom:6px">备注</label>
          <textarea class="app-input app-textarea" id="contactNoteInput" rows="3" placeholder="服务评价、报价情况、注意事项等">${escapeHtml(c?.note || '')}</textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">取消</button>
        <button class="btn btn-primary" id="btnSaveContact">${isEdit ? '保存' : '添加'}</button>
      </div>
    `;
    overlay.classList.add('show');

    document.getElementById('btnSaveContact').addEventListener('click', () => {
      const name = document.getElementById('contactNameInput').value.trim();
      if (!name) {
        App.showToast('请输入服务商名称', 'warning');
        return;
      }
      const type = document.getElementById('contactTypeInput').value;
      const contactName = document.getElementById('contactPersonInput').value.trim();
      const phone = document.getElementById('contactPhoneInput').value.trim();
      const wechat = document.getElementById('contactWechatInput').value.trim();
      const email = document.getElementById('contactEmailInput').value.trim();
      const phases = Array.from(document.querySelectorAll('.contactPhaseCb:checked')).map(cb => cb.value);
      const status = document.getElementById('contactStatusInput').value;
      const rating = parseInt(document.getElementById('contactRatingInput').value, 10) || 0;
      const note = document.getElementById('contactNoteInput').value.trim();

      if (isEdit && c) {
        c.name = name; c.type = type; c.contactName = contactName; c.phone = phone;
        c.wechat = wechat; c.email = email; c.phases = phases; c.status = status;
        c.rating = rating; c.note = note;
        App.showToast('服务商已更新', 'success');
      } else {
        data.contacts = data.contacts || [];
        data.contacts.push({
          id: genId(), name, type, contactName, phone, wechat, email,
          phases, status, rating, note, createdAt: new Date().toISOString()
        });
        App.showToast('服务商已添加', 'success');
      }
      save();
      render();
      closeModal();
    });
  }

  async function deleteContact(contactId) {
    const ok = await App.confirm('确定要删除这个服务商吗？');
    if (!ok) return;
    const idx = (data.contacts || []).findIndex(c => c.id === contactId);
    if (idx === -1) return;
    data.contacts.splice(idx, 1);
    save();
    render();
    App.showToast('服务商已删除', 'success');
  }

  function setView(view) {
    currentView = view;
    render();
  }

  // ── Init ──
  function init() {
    const btn = document.getElementById('btnAddContact');
    if (btn) btn.addEventListener('click', () => showEditModal());
    const initial = App.getData('contacts');
    if (initial) data = initial;
  }

  // ── Register ──
  registerModule('contacts', {
    name: '通讯录',
    init,
    render,
    onShow() {
      const d = App.getData('contacts');
      if (d) data = d;
      render();
    },
    setData(d) {
      data = d || { version: '1.0', updatedAt: new Date().toISOString(), contacts: [] };
    },
    // Exposed for inline onclick handlers
    editContact: showEditModal,
    deleteContact,
    setView
  });
})();
