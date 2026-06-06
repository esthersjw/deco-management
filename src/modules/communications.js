// Communications Module
(function() {
  let data = { version: '1.0', updatedAt: new Date().toISOString(), records: [] };
  let currentTab = 'records'; // 'records' | 'todos'
  let editingRecordId = null;
  let kanbanFilterAssignee = 'all';

  // ==================== UTILITIES ====================

  function getUserById(id) {
    return (window.App && App.users ? App.users : []).find(u => u.id === id);
  }

  function getCurrentUser() {
    return window.App ? App.currentUser : { id: 'user_1', name: '你', avatar: '👩' };
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d)) return dateStr;
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
  }

  function todayStr() {
    return formatDate(new Date());
  }

  function isOverdue(todo) {
    if (todo.status === '已完成') return false;
    if (!todo.deadline) return false;
    const deadline = new Date(todo.deadline + 'T23:59:59');
    return deadline < new Date();
  }

  function getTodoStatus(todo) {
    if (todo.status === '已完成') return '已完成';
    if (isOverdue(todo)) return '逾期';
    return '待办';
  }

  function updateTodoStatuses() {
    (data.records || []).forEach(rec => {
      (rec.todos || []).forEach(todo => {
        if (todo.status !== '已完成' && isOverdue(todo)) {
          todo.status = '逾期';
        }
      });
    });
  }

  function generateId(prefix) {
    return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
  }

  function getPhases() {
    const progress = window.App ? App.getData('progress') : null;
    return (progress && progress.phases) ? progress.phases : [];
  }

  function saveData() {
    data.updatedAt = new Date().toISOString();
    if (window.App) App.setData('communications', data);
  }

  // ==================== RENDER: RECORDS LIST ====================

  function renderRecordsList(container) {
    updateTodoStatuses();
    const records = [...(data.records || [])].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    if (records.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">💬</div>
          <div class="empty-state-text">暂无沟通记录</div>
          <button class="btn btn-primary" onclick="window.commOpenRecordModal()">+ 新增记录</button>
        </div>
      `;
      return;
    }

    container.innerHTML = records.map(rec => {
      const author = getUserById(rec.author);
      const authorName = author ? author.name : '未知';
      const authorAvatar = author ? author.avatar : '👤';
      const todos = rec.todos || [];
      const overdueCount = todos.filter(t => getTodoStatus(t) === '逾期').length;
      const todoText = todos.length > 0
        ? `待办 ${todos.length} 项${overdueCount > 0 ? `（<span style="color:var(--red)">${overdueCount} 逾期</span>）` : '（全部完成）'}`
        : '';

      return `
        <div class="comm-card" data-id="${rec.id}" onclick="window.commOpenRecordModal('${rec.id}')">
          <div class="comm-header">
            <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0">
              <span style="font-size:0.85rem;color:var(--ink-faint);white-space:nowrap">📅 ${rec.date || '未设定'}</span>
              <span class="comm-title" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(rec.title || '无标题')}</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;margin-left:10px">
              <span>${authorAvatar}</span>
              <span style="font-size:0.8rem;color:var(--ink-light)">${authorName}</span>
            </div>
          </div>
          <div class="comm-meta">
            ${rec.participants && rec.participants.length ? '参与：' + escapeHtml(rec.participants.join('、')) : '无参与方'}
            ${rec.location ? ' | 📍 ' + escapeHtml(rec.location) : ''}
          </div>
          ${todoText ? `<div class="comm-todos"><span class="badge ${overdueCount > 0 ? 'badge-red' : 'badge-green'}">${todoText}</span></div>` : ''}
        </div>
      `;
    }).join('');
  }

  // ==================== RENDER: TODO KANBAN ====================

  function renderTodoKanban(container) {
    updateTodoStatuses();
    const allTodos = [];
    (data.records || []).forEach(rec => {
      (rec.todos || []).forEach(todo => {
        allTodos.push({ ...todo, recordId: rec.id, recordTitle: rec.title || '无标题' });
      });
    });

    const filtered = kanbanFilterAssignee === 'all'
      ? allTodos
      : allTodos.filter(t => t.assignee === kanbanFilterAssignee);

    const groups = {
      '逾期': filtered.filter(t => getTodoStatus(t) === '逾期').sort((a, b) => (a.deadline || '').localeCompare(b.deadline || '')),
      '待办': filtered.filter(t => getTodoStatus(t) === '待办').sort((a, b) => (a.deadline || '').localeCompare(b.deadline || '')),
      '已完成': filtered.filter(t => getTodoStatus(t) === '已完成').sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''))
    };

    const users = window.App ? App.users : [{ id: 'user_1', name: '你' }, { id: 'user_2', name: '男朋友' }];

    container.innerHTML = `
      <div class="filter-bar" style="margin-bottom:16px">
        <label style="font-size:0.8rem;color:var(--ink-light)">筛选负责人：</label>
        <select class="app-input app-select" style="width:auto;min-width:140px" onchange="window.commSetKanbanFilter(this.value)">
          <option value="all" ${kanbanFilterAssignee === 'all' ? 'selected' : ''}>全部</option>
          ${users.map(u => `<option value="${u.id}" ${kanbanFilterAssignee === u.id ? 'selected' : ''}>${u.avatar || ''} ${escapeHtml(u.name)}</option>`).join('')}
        </select>
      </div>
      <div class="kanban">
        ${renderKanbanCol('逾期', groups['逾期'], 'var(--red)', '🔴')}
        ${renderKanbanCol('待办', groups['待办'], 'var(--blue)', '⏳')}
        ${renderKanbanCol('已完成', groups['已完成'], 'var(--green)', '✅')}
      </div>
    `;
  }

  function renderKanbanCol(title, items, color, icon) {
    return `
      <div class="kanban-col">
        <div class="kanban-col-header" style="border-bottom-color:${color}">
          <span class="kanban-col-title" style="color:${color}">${icon} ${title}</span>
          <span class="kanban-col-count">${items.length}</span>
        </div>
        ${items.length === 0 ? '<div style="text-align:center;color:var(--ink-faint);font-size:0.8rem;padding:20px 0">暂无事项</div>' : ''}
        ${items.map(item => {
          const assignee = getUserById(item.assignee);
          const assigneeName = assignee ? assignee.name : '未分配';
          const isOverdueItem = title === '逾期';
          const overdueDays = isOverdueItem && item.deadline
            ? Math.ceil((new Date() - new Date(item.deadline + 'T00:00:00')) / (1000 * 60 * 60 * 24))
            : 0;

          return `
            <div class="kanban-item ${isOverdueItem ? 'overdue' : ''}" data-todo-id="${item.id}" data-record-id="${item.recordId}">
              <div style="font-weight:500;font-size:0.85rem;margin-bottom:6px">${escapeHtml(item.content)}</div>
              <div style="font-size:0.75rem;color:var(--ink-faint);display:flex;justify-content:space-between;align-items:center">
                <span>👤 ${escapeHtml(assigneeName)}</span>
                <span>${item.deadline ? '截止:' + item.deadline.substr(5) : ''}</span>
              </div>
              ${isOverdueItem && overdueDays > 0 ? `<div style="font-size:0.75rem;color:var(--red);margin-top:4px">逾期 ${overdueDays} 天</div>` : ''}
              <div style="display:flex;gap:6px;margin-top:8px">
                ${title !== '待办' ? `<button class="btn btn-sm btn-secondary" style="height:26px;padding:0 8px;font-size:0.75rem" onclick="window.commMoveTodo('${item.recordId}','${item.id}','待办');event.stopPropagation();">↩ 待办</button>` : ''}
                ${title !== '已完成' ? `<button class="btn btn-sm btn-primary" style="height:26px;padding:0 8px;font-size:0.75rem" onclick="window.commMoveTodo('${item.recordId}','${item.id}','已完成');event.stopPropagation();">✓ 完成</button>` : ''}
                ${title === '已完成' ? `<button class="btn btn-sm btn-secondary" style="height:26px;padding:0 8px;font-size:0.75rem" onclick="window.commMoveTodo('${item.recordId}','${item.id}','待办');event.stopPropagation();">↩ 撤销</button>` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // ==================== MODAL: RECORD EDIT ====================

  function openRecordModal(recordId) {
    editingRecordId = recordId || null;
    const rec = recordId ? (data.records || []).find(r => r.id === recordId) : null;
    const isEdit = !!rec;
    const users = window.App ? App.users : [{ id: 'user_1', name: '你', avatar: '👩' }, { id: 'user_2', name: '男朋友', avatar: '👨' }];
    const phases = getPhases();

    const overlay = document.getElementById('modalOverlay');
    const content = document.getElementById('modalContent');
    content.style.maxWidth = '720px';

    content.innerHTML = `
      <div class="modal-header">
        <div class="modal-title">${isEdit ? '✏️ 编辑沟通记录' : '➕ 新增沟通记录'}</div>
        <button class="modal-close" onclick="window.commCloseModal()">×</button>
      </div>
      <div class="modal-body" id="commModalBody">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <div>
            <label style="display:block;font-size:0.78rem;color:var(--ink-light);margin-bottom:4px">日期 *</label>
            <input type="date" class="app-input" id="commDate" value="${rec ? rec.date : todayStr()}">
          </div>
          <div>
            <label style="display:block;font-size:0.78rem;color:var(--ink-light);margin-bottom:4px">作者</label>
            <select class="app-input app-select" id="commAuthor">
              ${users.map(u => `<option value="${u.id}" ${(rec ? rec.author : getCurrentUser().id) === u.id ? 'selected' : ''}>${u.avatar} ${escapeHtml(u.name)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div style="margin-bottom:12px">
          <label style="display:block;font-size:0.78rem;color:var(--ink-light);margin-bottom:4px">标题 *</label>
          <input type="text" class="app-input" id="commTitle" value="${escapeHtml(rec ? rec.title : '')}" placeholder="例如：水电交底">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
          <div>
            <label style="display:block;font-size:0.78rem;color:var(--ink-light);margin-bottom:4px">参与方（用顿号分隔）</label>
            <input type="text" class="app-input" id="commParticipants" value="${escapeHtml(rec && rec.participants ? rec.participants.join('、') : '')}" placeholder="例如：项目经理王工、水电工李师傅">
          </div>
          <div>
            <label style="display:block;font-size:0.78rem;color:var(--ink-light);margin-bottom:4px">地点</label>
            <input type="text" class="app-input" id="commLocation" value="${escapeHtml(rec ? rec.location : '')}" placeholder="例如：装修公司门店">
          </div>
        </div>
        <div style="margin-bottom:12px">
          <label style="display:block;font-size:0.78rem;color:var(--ink-light);margin-bottom:4px">关联阶段</label>
          <select class="app-input app-select" id="commPhase">
            <option value="">-- 无 --</option>
            ${phases.map(p => `<option value="${p.id}" ${(rec ? rec.phaseId : '') === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}
          </select>
        </div>
        <div style="margin-bottom:12px">
          <label style="display:block;font-size:0.78rem;color:var(--ink-light);margin-bottom:4px">纪要内容</label>
          <textarea class="app-input app-textarea" id="commContent" placeholder="可粘贴飞书会议纪要...">${escapeHtml(rec ? rec.content : '')}</textarea>
        </div>

        <!-- 关键结论 -->
        <div style="margin-bottom:12px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
            <label style="font-size:0.78rem;color:var(--ink-light)">关键结论</label>
            <button class="btn btn-sm btn-secondary" onclick="window.commAddDecision()" style="height:28px">+ 添加</button>
          </div>
          <div id="commDecisionsList">
            ${(rec ? rec.keyDecisions || [] : []).map((d, i) => renderDecisionRow(i, d)).join('')}
          </div>
        </div>

        <!-- 待办事项 -->
        <div style="margin-bottom:12px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
            <label style="font-size:0.78rem;color:var(--ink-light)">待办事项</label>
            <button class="btn btn-sm btn-secondary" onclick="window.commAddTodo()" style="height:28px">+ 添加</button>
          </div>
          <div id="commTodosList">
            ${(rec ? rec.todos || [] : []).map((t, i) => renderTodoRow(i, t)).join('')}
          </div>
        </div>

        <!-- 问题/疑虑 -->
        <div style="margin-bottom:12px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
            <label style="font-size:0.78rem;color:var(--ink-light)">问题 / 疑虑</label>
            <button class="btn btn-sm btn-secondary" onclick="window.commAddConcern()" style="height:28px">+ 添加</button>
          </div>
          <div id="commConcernsList">
            ${(rec ? rec.concerns || [] : []).map((c, i) => renderConcernRow(i, c)).join('')}
          </div>
        </div>
      </div>
      <div class="modal-footer">
        ${isEdit ? `<button class="btn btn-danger" onclick="window.commDeleteRecord()">🗑 删除</button>` : ''}
        <div style="flex:1"></div>
        <button class="btn btn-secondary" onclick="window.commCloseModal()">取消</button>
        <button class="btn btn-primary" onclick="window.commSaveRecord()">保存</button>
      </div>
    `;

    overlay.classList.add('show');
  }

  function renderDecisionRow(index, value) {
    return `
      <div class="flex gap-8" style="margin-bottom:6px;align-items:center" data-decision-index="${index}">
        <input type="text" class="app-input" value="${escapeHtml(value || '')}" placeholder="输入关键结论..." style="flex:1">
        <button class="btn-icon" onclick="window.commRemoveDecision(${index})" title="删除">×</button>
      </div>
    `;
  }

  function renderTodoRow(index, todo) {
    const users = window.App ? App.users : [{ id: 'user_1', name: '你' }, { id: 'user_2', name: '男朋友' }];
    const t = todo || {};
    return `
      <div style="margin-bottom:8px;padding:10px;border:1px solid var(--border-light);border-radius:var(--radius-sm);background:var(--cream)" data-todo-index="${index}">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px">
          <input type="text" class="app-input" value="${escapeHtml(t.content || '')}" placeholder="待办内容...">
          <select class="app-input app-select">
            ${users.map(u => `<option value="${u.id}" ${t.assignee === u.id ? 'selected' : ''}>${u.avatar || ''} ${escapeHtml(u.name)}</option>`).join('')}
          </select>
          <input type="date" class="app-input" value="${t.deadline || ''}">
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between">
          <select class="app-input app-select" style="width:auto;min-width:100px">
            <option value="待办" ${t.status === '待办' ? 'selected' : ''}>待办</option>
            <option value="已完成" ${t.status === '已完成' ? 'selected' : ''}>已完成</option>
            <option value="逾期" ${t.status === '逾期' ? 'selected' : ''}>逾期</option>
          </select>
          <button class="btn btn-sm btn-danger" onclick="window.commRemoveTodo(${index})" style="height:28px;padding:0 10px;font-size:0.75rem">删除</button>
        </div>
      </div>
    `;
  }

  function renderConcernRow(index, value) {
    return `
      <div class="flex gap-8" style="margin-bottom:6px;align-items:center" data-concern-index="${index}">
        <input type="text" class="app-input" value="${escapeHtml(value || '')}" placeholder="输入问题或疑虑..." style="flex:1">
        <button class="btn-icon" onclick="window.commRemoveConcern(${index})" title="删除">×</button>
      </div>
    `;
  }

  // ==================== MODAL ACTIONS ====================

  function addDecision() {
    const list = document.getElementById('commDecisionsList');
    const index = list.querySelectorAll('[data-decision-index]').length;
    const div = document.createElement('div');
    div.innerHTML = renderDecisionRow(index, '');
    list.appendChild(div.firstElementChild);
  }

  function removeDecision(index) {
    const list = document.getElementById('commDecisionsList');
    const rows = Array.from(list.querySelectorAll('[data-decision-index]'));
    if (rows[index]) rows[index].remove();
    // Re-index
    list.querySelectorAll('[data-decision-index]').forEach((el, i) => {
      el.dataset.decisionIndex = i;
      const btn = el.querySelector('button');
      if (btn) btn.setAttribute('onclick', `window.commRemoveDecision(${i})`);
    });
  }

  function addTodo() {
    const list = document.getElementById('commTodosList');
    const index = list.querySelectorAll('[data-todo-index]').length;
    const div = document.createElement('div');
    div.innerHTML = renderTodoRow(index, { assignee: getCurrentUser().id, status: '待办' });
    list.appendChild(div.firstElementChild);
  }

  function removeTodo(index) {
    const list = document.getElementById('commTodosList');
    const rows = Array.from(list.querySelectorAll('[data-todo-index]'));
    if (rows[index]) rows[index].remove();
    list.querySelectorAll('[data-todo-index]').forEach((el, i) => {
      el.dataset.todoIndex = i;
      const btn = el.querySelector('button[onclick^="window.commRemoveTodo"]');
      if (btn) btn.setAttribute('onclick', `window.commRemoveTodo(${i})`);
    });
  }

  function addConcern() {
    const list = document.getElementById('commConcernsList');
    const index = list.querySelectorAll('[data-concern-index]').length;
    const div = document.createElement('div');
    div.innerHTML = renderConcernRow(index, '');
    list.appendChild(div.firstElementChild);
  }

  function removeConcern(index) {
    const list = document.getElementById('commConcernsList');
    const rows = Array.from(list.querySelectorAll('[data-concern-index]'));
    if (rows[index]) rows[index].remove();
    list.querySelectorAll('[data-concern-index]').forEach((el, i) => {
      el.dataset.concernIndex = i;
      const btn = el.querySelector('button');
      if (btn) btn.setAttribute('onclick', `window.commRemoveConcern(${i})`);
    });
  }

  function closeModal() {
    document.getElementById('modalOverlay').classList.remove('show');
    const content = document.getElementById('modalContent');
    content.style.maxWidth = '';
    editingRecordId = null;
  }

  async function deleteRecord() {
    if (!editingRecordId) return;
    const ok = await (window.App ? App.confirm('确定要删除这条沟通记录吗？') : confirm('确定要删除这条沟通记录吗？'));
    if (!ok) return;
    data.records = (data.records || []).filter(r => r.id !== editingRecordId);
    saveData();
    closeModal();
    render();
    if (window.App) App.showToast('记录已删除', 'success');
  }

  function saveRecord() {
    const date = document.getElementById('commDate').value;
    const author = document.getElementById('commAuthor').value;
    const title = document.getElementById('commTitle').value.trim();
    const participantsStr = document.getElementById('commParticipants').value.trim();
    const location = document.getElementById('commLocation').value.trim();
    const phaseId = document.getElementById('commPhase').value || null;
    const content = document.getElementById('commContent').value.trim();

    if (!date || !title) {
      if (window.App) App.showToast('请填写日期和标题', 'warning');
      return;
    }

    // Collect decisions
    const keyDecisions = [];
    document.querySelectorAll('#commDecisionsList [data-decision-index]').forEach(el => {
      const input = el.querySelector('input');
      if (input && input.value.trim()) keyDecisions.push(input.value.trim());
    });

    // Collect todos
    const todos = [];
    document.querySelectorAll('#commTodosList [data-todo-index]').forEach(el => {
      const inputs = el.querySelectorAll('input, select');
      const todoContent = inputs[0] ? inputs[0].value.trim() : '';
      const todoAssignee = inputs[1] ? inputs[1].value : getCurrentUser().id;
      const todoDeadline = inputs[2] ? inputs[2].value : '';
      const todoStatus = inputs[3] ? inputs[3].value : '待办';
      if (todoContent) {
        const existingId = editingRecordId ? findTodoId(editingRecordId, todoContent, todoAssignee, todoDeadline) : null;
        const todoObj = {
          id: existingId || generateId('todo'),
          content: todoContent,
          assignee: todoAssignee,
          deadline: todoDeadline,
          status: todoStatus,
          completedAt: todoStatus === '已完成' ? (new Date().toISOString()) : null
        };
        // If already completed and has completedAt, preserve it
        if (existingId) {
          const rec = (data.records || []).find(r => r.id === editingRecordId);
          const oldTodo = rec && rec.todos ? rec.todos.find(t => t.id === existingId) : null;
          if (oldTodo && oldTodo.completedAt && todoStatus === '已完成') {
            todoObj.completedAt = oldTodo.completedAt;
          }
        }
        todos.push(todoObj);
      }
    });

    // Collect concerns
    const concerns = [];
    document.querySelectorAll('#commConcernsList [data-concern-index]').forEach(el => {
      const input = el.querySelector('input');
      if (input && input.value.trim()) concerns.push(input.value.trim());
    });

    const participants = participantsStr ? participantsStr.split(/[,，、]/).map(s => s.trim()).filter(Boolean) : [];

    const record = {
      id: editingRecordId || generateId('comm'),
      date,
      author,
      participants,
      location,
      phaseId,
      title,
      content,
      keyDecisions,
      todos,
      concerns,
      createdAt: editingRecordId ? ((data.records || []).find(r => r.id === editingRecordId) || {}).createdAt || new Date().toISOString() : new Date().toISOString()
    };

    if (!data.records) data.records = [];
    if (editingRecordId) {
      const idx = data.records.findIndex(r => r.id === editingRecordId);
      if (idx >= 0) data.records[idx] = record;
      else data.records.push(record);
    } else {
      data.records.push(record);
    }

    saveData();
    closeModal();
    render();
    if (window.App) App.showToast(editingRecordId ? '记录已更新' : '记录已添加', 'success');
  }

  function findTodoId(recordId, content, assignee, deadline) {
    const rec = (data.records || []).find(r => r.id === recordId);
    if (!rec || !rec.todos) return null;
    // Try to match by content + assignee + deadline for existing todos
    const match = rec.todos.find(t => t.content === content && t.assignee === assignee && t.deadline === deadline);
    return match ? match.id : null;
  }

  // ==================== KANBAN ACTIONS ====================

  function setKanbanFilter(value) {
    kanbanFilterAssignee = value;
    render();
  }

  function moveTodo(recordId, todoId, newStatus) {
    const rec = (data.records || []).find(r => r.id === recordId);
    if (!rec || !rec.todos) return;
    const todo = rec.todos.find(t => t.id === todoId);
    if (!todo) return;
    todo.status = newStatus;
    if (newStatus === '已完成') {
      todo.completedAt = new Date().toISOString();
    } else {
      todo.completedAt = null;
    }
    saveData();
    render();
    if (window.App) App.showToast('状态已更新', 'success');
  }

  // ==================== RENDER MAIN ====================

  function render() {
    const container = document.getElementById('communications-content');
    if (!container) return;

    container.innerHTML = `
      <div class="tab-bar">
        <button class="tab ${currentTab === 'records' ? 'active' : ''}" onclick="window.commSwitchTab('records')">全部记录</button>
        <button class="tab ${currentTab === 'todos' ? 'active' : ''}" onclick="window.commSwitchTab('todos')">待办看板</button>
      </div>
      <div id="commTabContent"></div>
    `;

    const tabContent = document.getElementById('commTabContent');
    if (currentTab === 'records') {
      renderRecordsList(tabContent);
    } else {
      renderTodoKanban(tabContent);
    }
  }

  function switchTab(tab) {
    currentTab = tab;
    render();
  }

  // ==================== ESCAPE HTML ====================

  function escapeHtml(text) {
    if (text == null) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ==================== EXPOSE GLOBALS ====================

  window.commOpenRecordModal = openRecordModal;
  window.commCloseModal = closeModal;
  window.commSaveRecord = saveRecord;
  window.commDeleteRecord = deleteRecord;
  window.commSwitchTab = switchTab;
  window.commAddDecision = addDecision;
  window.commRemoveDecision = removeDecision;
  window.commAddTodo = addTodo;
  window.commRemoveTodo = removeTodo;
  window.commAddConcern = addConcern;
  window.commRemoveConcern = removeConcern;
  window.commSetKanbanFilter = setKanbanFilter;
  window.commMoveTodo = moveTodo;

  // ==================== REGISTER MODULE ====================

  registerModule('communications', {
    name: '沟通',
    init() {
      const btn = document.getElementById('btnAddComm');
      if (btn) btn.addEventListener('click', () => openRecordModal());
    },
    render() {
      render();
    },
    onShow() {
      // Refresh phases data when shown in case progress module updated
      render();
    },
    setData(d) {
      data = d || { version: '1.0', updatedAt: new Date().toISOString(), records: [] };
    }
  });
})();
