// Progress Module — stage command board
(function() {
  'use strict';

  const PHASE_DEFS = [
    { id: 'phase_design', name: '设计规划', type: 'planning', goal: '把方案、预算边界和风格方向定下来，为施工交底做准备。', tasks: ['整理居住需求和预算红线', '确认平面方案', '确认施工图/柜体图', '确认主材预选清单'], checks: ['平面方案确认', '效果图确认', '施工图确认', '主材预算上限确认'], milestones: ['设计师出平面方案', '约工长现场交底', '确认初版报价'], blocker: '主材范围和施工图不定，后面水电定位和报价都会被拖。' },
    { id: 'phase_demo', name: '拆除', type: 'construction', goal: '保护该保护的，拆掉该拆的，给后续施工腾出干净现场。', tasks: ['确认保护范围', '拆除前拍照留底', '确认垃圾清运方式'], checks: ['保护到位', '拆除边界正确', '现场清运完成'], milestones: ['工人进场交底', '正式拆除', '垃圾清运完成'], blocker: '拆除边界不清楚，容易误拆或影响后续水电。' },
    { id: 'phase_water', name: '水电', type: 'construction', goal: '把开关、插座、给排水和隐蔽工程一次确认清楚。', tasks: ['确认开关插座点位', '确认厨卫电器尺寸', '水电放样拍照', '保存隐蔽工程照片'], checks: ['水压测试', '电路回路确认', '强弱电间距确认', '隐蔽工程验收'], milestones: ['水电定位交底', '水电施工', '隐蔽工程验收'], blocker: '电器尺寸和点位不确认，会直接影响水电定位。' },
    { id: 'phase_tile', name: '泥瓦', type: 'construction', goal: '完成防水、找平和瓷砖铺贴，控制空鼓和坡度问题。', tasks: ['确认瓷砖到货', '确认铺贴方式', '安排闭水测试'], checks: ['防水验收', '闭水测试', '瓷砖空鼓检查', '坡度检查'], milestones: ['瓷砖到货', '闭水测试', '泥瓦验收'], blocker: '瓷砖不到货或防水不过，会卡泥瓦和后续安装。' },
    { id: 'phase_wood', name: '木工', type: 'construction', goal: '处理吊顶、基层和现场木作尺寸，为后续定制安装做准备。', tasks: ['确认吊顶尺寸', '确认柜体复尺', '确认门洞尺寸'], checks: ['基层检查', '收口检查', '柜体尺寸复核'], milestones: ['木工进场', '柜体复尺', '基层验收'], blocker: '尺寸不复核，定制柜和门后面容易翻车。' },
    { id: 'phase_paint', name: '油漆', type: 'construction', goal: '把墙面基层、颜色和收口处理好，避免后期返工。', tasks: ['确认墙面颜色', '确认腻子/底漆节点', '保护已安装材料'], checks: ['墙面平整度', '阴阳角检查', '色差检查'], milestones: ['墙面基层处理', '面漆施工', '墙面验收'], blocker: '颜色和基层问题不确认，后面安装完再改会很麻烦。' },
    { id: 'phase_custom', name: '定制', type: 'construction', goal: '确认柜体、门板、五金和安装时间，避免长周期材料卡进度。', tasks: ['确认柜体复尺', '确认门板和拉手', '确认生产周期', '预约安装时间'], checks: ['尺寸复核', '板材五金确认', '安装排期确认'], milestones: ['柜体复尺', '定制下单', '预约安装'], blocker: '定制不提前下单，后面安装和入住都会被拖。' },
    { id: 'phase_install', name: '安装', type: 'construction', goal: '集中安装灯具、洁具、开关面板和各类主材，处理缺件补件。', tasks: ['安排主材安装', '确认五金灯具', '整理缺件清单'], checks: ['灯具通电', '洁具试水', '柜门调平', '全屋收口'], milestones: ['主材到货', '集中安装', '安装验收'], blocker: '缺件清单不及时补，会把收尾拖成无底洞。' },
    { id: 'phase_furniture', name: '家具', type: 'movein', goal: '完成家具进场、保洁、空气检测和入住准备。', tasks: ['家具进场', '开荒保洁', '甲醛检测', '入住物品清单'], checks: ['保洁验收', '家具尺寸确认', '空气检测确认'], milestones: ['家具送装', '开荒保洁', '入住检查'], blocker: '家具尺寸和送装时间不确认，入住节奏会乱。' }
  ];
  const PHASE_NAMES = PHASE_DEFS.map(p => p.name);
  const STATUS_LIST = ['未开始', '进行中', '已完成', '滞后'];
  const LOCATION_TAGS = ['客厅', '主卧', '次卧', '厨房', '卫生间', '阳台', '书房', '玄关'];
  const NATURE_TAGS = ['正常进度', '发现问题', '验收通过', '待整改', '灵感参考'];
  const MATERIAL_STATUSES = ['待选购', '已下单', '已到货', '已安装', '已验收'];

  let data = { version: '1.1', updatedAt: '', phases: [], currentPhaseId: 'phase_design', photos: [] };
  let currentTab = 'phases';
  let viewingPhaseId = null;
  let photoFilters = { phase: 'all', location: 'all', nature: 'all', dateFrom: '', dateTo: '', user: 'all' };
  let photoView = 'grid';
  let photoObjectURLs = [];

  function getToday() { return new Date().toISOString().slice(0, 10); }
  function daysBetween(a, b) { if (!a || !b) return 0; return Math.round((new Date(b) - new Date(a)) / 86400000); }
  function money(n) { return '¥' + (Number(n || 0)).toLocaleString('zh-CN'); }
  function escapeHtml(text) { const div = document.createElement('div'); div.textContent = text == null ? '' : String(text); return div.innerHTML; }
  function generateId(prefix) { return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6); }
  function getUser(uId) { return (App.users || []).find(u => u.id === uId) || { name: '未知', avatar: '👤' }; }
  function container() { return document.getElementById('progress-content'); }
  function getPhaseDef(idOrName) { return PHASE_DEFS.find(p => p.id === idOrName || p.name === idOrName) || PHASE_DEFS[0]; }
  function checklistFrom(labels, prefix) { return labels.map((title, idx) => ({ id: `${prefix}_${idx + 1}`, title, done: false })); }
  function normalizePhase(raw, idx) {
    const def = getPhaseDef(raw.id || raw.name);
    return {
      id: def.id,
      name: def.name,
      type: def.type,
      order: idx + 1,
      plannedStart: raw.plannedStart || '', plannedEnd: raw.plannedEnd || '', actualStart: raw.actualStart || '', actualEnd: raw.actualEnd || '',
      status: raw.status || '未开始', progress: Number(raw.progress) || 0, note: raw.note || '',
      goal: raw.goal || def.goal || '', blocker: raw.blocker || def.blocker || '',
      milestones: Array.isArray(raw.milestones) && raw.milestones.length ? raw.milestones : (def.milestones || []),
      keyDates: Array.isArray(raw.keyDates) ? raw.keyDates : [],
      tasks: Array.isArray(raw.tasks) && raw.tasks.length ? raw.tasks : checklistFrom(def.tasks, def.id + '_task'),
      checks: Array.isArray(raw.checks) && raw.checks.length ? raw.checks : checklistFrom(def.checks, def.id + '_check'),
      payments: Array.isArray(raw.payments) ? raw.payments : []
    };
  }
  function ensureDefaultPhases() {
    const existing = data.phases || [];
    data.phases = PHASE_DEFS.map((def, idx) => {
      const old = existing.find(p => p.id === def.id || p.name === def.name) || {};
      return normalizePhase({ ...old, id: def.id, name: def.name }, idx);
    });
    if (!data.currentPhaseId || !data.phases.some(p => p.id === data.currentPhaseId)) {
      const active = data.phases.find(p => p.status === '进行中') || data.phases[0];
      data.currentPhaseId = active.id;
    }
    data.version = '1.1';
    data.phases.forEach(phase => { phase.keyDates = phaseKeyDates(phase); });
    data.photos = data.photos || [];
  }
  function save() { data.updatedAt = new Date().toISOString(); App.setData('progress', JSON.parse(JSON.stringify(data))); }
  function isLag(phase) { if (!phase.plannedEnd) return false; const today = getToday(); return (!!phase.actualEnd && phase.actualEnd > phase.plannedEnd) || (!phase.actualEnd && phase.status !== '已完成' && today > phase.plannedEnd); }
  function completion(list) { const arr = list || []; return { done: arr.filter(x => x.done).length, total: arr.length }; }
  function phasePhotos(phase) { return (data.photos || []).filter(p => p.tags?.phase === phase.name); }
  function phaseIncludes(value, phase) { const text = String(value || ''); return text.includes(phase.name) || text.includes(phase.id); }
  function materialMatchesPhase(m, phase) { return m.phaseId === phase.id || m.phase === phase.name || m.stage === phase.name || phaseIncludes(m.note, phase) || phaseIncludes(m.name, phase); }
  function budgetMatchesPhase(item, phase) { return item.phaseId === phase.id || item.phase === phase.name || phaseIncludes(item.name, phase) || phaseIncludes(item.note, phase); }
  function docMatchesPhase(doc, phase) { return doc.phaseId === phase.id || doc.phase === phase.name || doc.stage === phase.name || phaseIncludes(doc.title || doc.name || doc.fileName, phase) || phaseIncludes(doc.note || doc.description || doc.category, phase); }
  function commMatchesPhase(record, phase) { return record.phaseId === phase.id || record.phase === phase.name || record.stage === phase.name || phaseIncludes(record.title, phase) || phaseIncludes(record.content || record.summary || record.note, phase); }
  function isCommTodoDone(todo) { return todo?.status === '已完成' || todo?.done || todo?.completed; }
  function phaseMatchesTodo(todo, phase) { return todo?.phaseId === phase.id || todo?.phase === phase.name || todo?.stage === phase.name || phaseIncludes(todo?.content, phase) || phaseIncludes(todo?.note, phase); }
  function getPhaseSignals(phase) {
    const mat = App.getData('materials') || { items: [] };
    const budget = App.getData('budget') || { items: [], payments: [] };
    const docs = App.getData('documents') || { documents: [] };
    const comm = App.getData('communications') || { records: [] };
    const materials = (mat.items || []).filter(m => materialMatchesPhase(m, phase));
    const budgetItems = (budget.items || []).filter(i => budgetMatchesPhase(i, phase));
    const payments = (budget.payments || []).filter(p => {
      const item = (budget.items || []).find(i => i.id === p.itemId);
      return p.phaseId === phase.id || p.phase === phase.name || (item && budgetMatchesPhase(item, phase));
    });
    const documents = (docs.documents || []).filter(d => docMatchesPhase(d, phase));
    const communications = (comm.records || []).filter(r => commMatchesPhase(r, phase) || (r.todos || []).some(t => phaseMatchesTodo(t, phase)));
    const todos = (comm.records || []).flatMap(r => (r.todos || []).filter(t => !isCommTodoDone(t) && (commMatchesPhase(r, phase) || phaseMatchesTodo(t, phase))).map(t => ({ ...t, recordTitle: r.title || '沟通记录' })));
    const planned = budgetItems.reduce((s, i) => s + (Number(i.budget) || 0), 0);
    const actual = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0) || budgetItems.reduce((s, i) => s + (Number(i.actual) || 0), 0);
    return { materials, budgetItems, payments, planned, actual, photos: phasePhotos(phase), documents, communications, todos };
  }
  function normalizeKeyDate(item, idx) {
    if (typeof item === 'string') return { id: `kd_${idx + 1}`, date: '', title: item, note: '', status: '待办', delayedUntil: '', done: false };
    const done = !!item.done || item.status === '已完成';
    return { id: item.id || `kd_${idx + 1}`, date: item.date || '', title: item.title || '关键节点', note: item.note || '', status: item.status || (done ? '已完成' : '待办'), delayedUntil: item.delayedUntil || '', done };
  }
  function phaseKeyDates(phase) {
    if (Array.isArray(phase.keyDates) && phase.keyDates.length) return phase.keyDates.map(normalizeKeyDate);
    return (phase.milestones || []).map(normalizeKeyDate);
  }
  function renderTabs() {
    return `<div class="tab-bar"><button class="tab ${currentTab === 'phases' ? 'active' : ''}" data-tab="phases">🧭 阶段切片</button><button class="tab ${currentTab === 'photos' ? 'active' : ''}" data-tab="photos">📷 照片墙 (${data.photos?.length || 0})</button></div>`;
  }
  function renderMiniChecklist(phase, key, label) {
    const list = phase[key] || [];
    const c = completion(list);
    return `<div style="background:var(--cream-deep);border-radius:10px;padding:10px"><div class="flex-between" style="margin-bottom:8px"><strong style="font-size:.82rem">${label}</strong><span class="text-xs text-faint">${c.done}/${c.total}</span></div>${list.slice(0,4).map(item => `<label style="display:flex;gap:7px;align-items:flex-start;font-size:.78rem;margin:6px 0;line-height:1.35"><input type="checkbox" ${item.done ? 'checked' : ''} onchange="MODULES.progress.toggleNode('${phase.id}','${key}','${item.id}')"><span style="${item.done ? 'text-decoration:line-through;color:var(--ink-faint)' : ''}">${escapeHtml(item.title)}</span></label>`).join('')}${list.length > 4 ? `<div class="text-xs text-faint">还有 ${list.length - 4} 项，点编辑查看</div>` : ''}</div>`;
  }
  function renderKeyDates(phase) {
    const dates = phaseKeyDates(phase);
    if (!dates.length) return '<div class="text-xs text-faint">还没有关键时间点，点右上角添加。</div>';
    const statusClass = status => status === '已完成' ? 'badge-green' : status === '延期' ? 'badge-red' : status === '进行中' ? 'badge-blue' : 'badge-gray';
    return `<div style="display:grid;gap:10px">${dates.map(item => `<div style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:10px 0;border-bottom:1px dashed var(--border-light)"><div><div style="font-weight:800;font-size:.92rem;line-height:1.4;${item.done ? 'text-decoration:line-through;color:var(--ink-faint)' : ''}">${escapeHtml(item.title || '关键节点')}</div><div style="display:flex;gap:7px;align-items:center;flex-wrap:wrap;margin-top:6px"><select class="app-input app-select badge ${statusClass(item.status)}" style="width:auto;min-width:76px;padding:4px 8px;font-size:.76rem;font-weight:800;border:0" onchange="MODULES.progress.updateKeyDate('${phase.id}','${item.id}','status',this.value)">${['待办','进行中','已完成','延期'].map(s => `<option value="${s}" ${item.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>${item.status === '延期' ? `<span class="text-xs text-faint">延到</span><input type="date" class="app-input" style="padding:5px 7px;font-size:.76rem;max-width:128px" value="${escapeHtml(item.delayedUntil || '')}" onchange="MODULES.progress.updateKeyDate('${phase.id}','${item.id}','delayedUntil',this.value)">` : ''}${item.note && item.note !== '待排期' ? `<span class="text-xs text-faint">${escapeHtml(item.note)}</span>` : ''}</div></div><input type="date" class="app-input" style="padding:6px 8px;font-size:.8rem;max-width:128px" value="${escapeHtml(item.date || '')}" onchange="MODULES.progress.updateKeyDate('${phase.id}','${item.id}','date',this.value)"></div>`).join('')}</div>`;
  }
  function getCommunicationTodosForPhase(phase) {
    const comm = App.getData('communications') || { records: [] };
    return (comm.records || []).flatMap(record => (record.todos || []).filter(todo => todo.phaseId === phase.id || (!todo.phaseId && record.phaseId === phase.id)).map(todo => ({ ...todo, recordId: todo.sourceId || record.id, recordTitle: record.title || '沟通记录' })));
  }
  function renderTaskList(phase) {
    const phaseTasks = phase.tasks || [];
    const commTodos = getCommunicationTodosForPhase(phase);
    if (!phaseTasks.length && !commTodos.length) return '<div class="text-xs text-faint">还没有待办，点右上角添加，或在沟通记录里关联到这个阶段。</div>';
    const phaseRows = phaseTasks.map(item => `<label style="display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:start;padding:4px 0;cursor:pointer"><input type="checkbox" ${item.done ? 'checked' : ''} onchange="MODULES.progress.toggleNode('${phase.id}','tasks','${item.id}')"><span style="font-size:.84rem;line-height:1.45;${item.done ? 'text-decoration:line-through;color:var(--ink-faint)' : ''}">${escapeHtml(item.title)}</span><span class="badge badge-gray">阶段</span></label>`);
    const commRows = commTodos.map(item => `<label style="display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:start;padding:4px 0;cursor:pointer"><input type="checkbox" ${isCommTodoDone(item) ? 'checked' : ''} onchange="MODULES.progress.toggleCommTodo('${item.recordId}','${item.id}',this.checked)"><span style="font-size:.84rem;line-height:1.45;${isCommTodoDone(item) ? 'text-decoration:line-through;color:var(--ink-faint)' : ''}">${escapeHtml(item.content || '沟通待办')}<div class="text-xs text-faint">${escapeHtml(item.recordTitle)}</div></span><span class="badge badge-blue">沟通</span></label>`);
    return `<div style="display:grid;gap:8px">${[...phaseRows, ...commRows].join('')}</div>`;
  }
  function renderRecordLinks(signals) {
    const items = [];
    if (signals.documents.length) items.push(`📄 文档 ${signals.documents.length}`);
    if (signals.communications.length) items.push(`💬 沟通 ${signals.communications.length}`);
    if (signals.photos.length) items.push(`📷 照片 ${signals.photos.length}`);
    if (signals.materials.length) items.push(`🧱 材料 ${signals.materials.length}`);
    if (signals.budgetItems.length) items.push(`💰 预算 ${signals.budgetItems.length}`);
    return items.length ? `<div style="display:flex;gap:8px;flex-wrap:wrap">${items.map(x => `<span class="badge badge-gray" style="padding:7px 10px">${x}</span>`).join('')}</div>` : '<div class="text-xs text-faint">相关文档、沟通、照片和材料会在这里聚合；没有就不硬显示 0。</div>';
  }
  function renderPhotoStrip(signals) {
    const photos = signals.photos.slice(0, 4);
    if (!photos.length) return '<div class="text-xs text-faint">这个阶段还没有现场照片。</div>';
    return `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">${photos.map(ph => `<div style="aspect-ratio:1.25;border-radius:10px;background:var(--cream-deep);overflow:hidden">${ph.fileName ? `<img src="${escapeHtml(ph.fileName)}" alt="" style="width:100%;height:100%;object-fit:cover">` : '<div style="height:100%;display:grid;place-items:center;color:var(--ink-faint)">📷</div>'}</div>`).join('')}</div>`;
  }
  function phaseBlockers(phase, signals) {
    const risk = [];
    const pendingTasks = completion(phase.tasks).total - completion(phase.tasks).done;
    if (pendingTasks > 0) risk.push(`${pendingTasks} 个待办还没完成`);
    if (signals.todos.length) risk.push(`${signals.todos.length} 个沟通待办待处理`);
    if (signals.materials.some(m => m.status === '待选购')) risk.push('有主材待选购');
    if (signals.planned && signals.actual > signals.planned) risk.push('本阶段预算超支');
    if (phase.blocker) return phase.blocker;
    return risk.length ? risk.join(' · ') : '暂无明显卡点，按关键时间点推进。';
  }
  function renderCommandPanel() {
    const phase = data.phases.find(p => p.id === data.currentPhaseId) || data.phases[0];
    if (!phase) return '';
    const signals = getPhaseSignals(phase);
    const task = completion(phase.tasks), check = completion(phase.checks);
    const checkTitle = phase.type === 'planning' ? '确认项' : '验收项';
    return `<div class="app-card" style="padding:20px;margin-bottom:18px;border:1px solid rgba(43,127,216,.18);background:linear-gradient(135deg,rgba(43,127,216,.07),rgba(255,253,248,.96))"><div class="flex-between" style="align-items:flex-start;gap:14px"><div><div class="text-xs text-faint" style="margin-bottom:4px">当前阶段 · 行动中心</div><h2 style="margin:0;font-size:1.35rem">${phase.order}. ${phase.name}</h2><div class="text-sm text-faint" style="margin-top:6px;max-width:760px">${escapeHtml(phase.goal || '')}</div></div><button class="btn btn-sm btn-primary" onclick="MODULES.progress.editPhase('${phase.id}')">编辑当前阶段</button></div><div class="grid-4" style="margin-top:16px"><div class="stat-card"><div class="stat-label">待办</div><div class="stat-value">${task.done}/${task.total}</div></div><div class="stat-card"><div class="stat-label">${checkTitle}</div><div class="stat-value">${check.done}/${check.total}</div></div><div class="stat-card"><div class="stat-label">关键时间</div><div class="stat-value">${phaseKeyDates(phase).length}</div><div class="stat-sub">交底 / 进场 / 验收</div></div><div class="stat-card"><div class="stat-label">相关记录</div><div class="stat-value">${signals.documents.length + signals.communications.length + signals.photos.length}</div><div class="stat-sub">文档 / 沟通 / 照片</div></div></div><div class="alert-banner ${phaseBlockers(phase, signals).includes('暂无') ? 'alert-banner-success' : 'alert-banner-warning'}" style="margin-top:14px">${phaseBlockers(phase, signals).includes('暂无') ? '✅' : '⚠️'} ${escapeHtml(phaseBlockers(phase, signals))}</div></div>`;
  }
  function renderPhaseCard(phase) {
    const isCurrent = phase.id === data.currentPhaseId;
    const lag = isLag(phase);
    const cls = ['phase-card']; if (isCurrent) cls.push('active'); else if (phase.status === '已完成') cls.push('completed'); else if (lag) cls.push('lag');
    const statusBadge = phase.status === '已完成' ? '<span class="badge badge-green">✅ 已完成</span>' : phase.status === '进行中' ? '<span class="badge badge-blue">🔄 进行中</span>' : lag || phase.status === '滞后' ? '<span class="badge badge-red">⚠️ 滞后</span>' : '<span class="badge badge-gray">⏳ 未开始</span>';
    const signals = getPhaseSignals(phase);
    const checkTitle = phase.type === 'planning' ? '确认' : '验收';
    return `<div class="${cls.join(' ')}" data-phase-id="${phase.id}" style="padding:18px"><div class="flex-between" style="margin-bottom:10px"><div class="phase-name">${phase.order}. ${phase.name} ${isCurrent ? '<span class="badge badge-blue" style="margin-left:6px">当前</span>' : ''}</div>${statusBadge}</div><div class="text-sm text-faint" style="line-height:1.6;margin-bottom:10px">${escapeHtml(phase.goal || '')}</div><div class="progress-bar" style="margin:10px 0"><div class="progress-bar-fill ${phase.progress >= 100 ? 'success' : lag ? 'danger' : ''}" style="width:${phase.progress}%"></div></div><div style="display:grid;grid-template-columns:1.1fr .9fr;gap:12px;margin:12px 0"><div>${renderMiniChecklist(phase, 'tasks', '本阶段要做')}</div><div><div style="background:var(--cream-deep);border-radius:10px;padding:10px"><div class="flex-between" style="margin-bottom:8px"><strong style="font-size:.82rem">关键时间点</strong><span class="text-xs text-faint">${phase.plannedStart || phase.plannedEnd ? '已排期' : '待排期'}</span></div>${renderKeyDates(phase)}</div></div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:12px 0"><div style="background:var(--cream-deep);border-radius:10px;padding:10px"><strong style="font-size:.82rem">相关记录</strong><div style="margin-top:8px">${renderRecordLinks(signals)}</div></div><div style="background:var(--cream-deep);border-radius:10px;padding:10px"><strong style="font-size:.82rem">现场照片</strong><div style="margin-top:8px">${renderPhotoStrip(signals)}</div></div></div><div class="alert-banner ${phaseBlockers(phase, signals).includes('暂无') ? 'alert-banner-success' : 'alert-banner-warning'}" style="margin:10px 0">${phaseBlockers(phase, signals).includes('暂无') ? '✅' : '⚠️'} ${escapeHtml(phaseBlockers(phase, signals))}</div>${phase.note ? `<div class="text-xs" style="color:var(--ink-light);background:var(--cream-deep);padding:7px;border-radius:8px;margin-bottom:10px">${escapeHtml(phase.note)}</div>` : ''}<div class="flex" style="gap:6px;flex-wrap:wrap"><button class="btn btn-sm btn-secondary" onclick="MODULES.progress.editPhase('${phase.id}')">✏️ 编辑</button>${!isCurrent ? `<button class="btn btn-sm btn-primary" onclick="MODULES.progress.setCurrentPhase('${phase.id}')">设为当前</button>` : ''}</div></div>`;
  }
  function renderStatusControls(phase) {
    return `<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:10px"><span class="text-xs text-faint">阶段状态</span>${STATUS_LIST.map(status => `<button class="btn btn-sm ${phase.status === status ? 'btn-primary' : 'btn-secondary'}" onclick="MODULES.progress.setPhaseStatus('${phase.id}','${status}')">${status}</button>`).join('')}</div>`;
  }
  function renderCurrentPhaseSlice() {
    const phase = data.phases.find(p => p.id === (viewingPhaseId || data.currentPhaseId)) || data.phases.find(p => p.id === data.currentPhaseId) || data.phases[0];
    if (!phase) return '';
    const idx = data.phases.findIndex(p => p.id === phase.id);
    const prev = data.phases[idx - 1];
    const next = data.phases[idx + 1];
    const signals = getPhaseSignals(phase);
    const lag = isLag(phase);
    const statusBadge = phase.status === '已完成' ? '<span class="badge badge-green">✅ 已完成</span>' : phase.status === '进行中' ? '<span class="badge badge-blue">🔄 进行中</span>' : lag || phase.status === '滞后' ? '<span class="badge badge-red">⚠️ 滞后</span>' : '<span class="badge badge-gray">⏳ 未开始</span>';
    const currentPhase = data.phases.find(p => p.id === data.currentPhaseId) || data.phases[0];
    const isViewingCurrent = phase.id === data.currentPhaseId;
    return `<div class="app-card" style="padding:18px;margin-bottom:16px"><div class="flex-between" style="gap:12px"><button class="btn btn-sm btn-secondary" ${prev ? `onclick="MODULES.progress.shiftPhase(-1)"` : 'disabled'}>← ${prev ? escapeHtml(prev.name) : '无上一阶段'}</button><div style="text-align:center"><div class="text-xs text-faint">当前施工阶段：${escapeHtml(currentPhase?.name || '未设置')} · 正在查看 ${idx + 1} / ${data.phases.length}</div><h2 style="margin:2px 0;font-size:1.55rem">${escapeHtml(phase.name)}</h2>${statusBadge}${renderStatusControls(phase)}${!isViewingCurrent ? `<div style="margin-top:8px"><button class="btn btn-sm btn-primary" onclick="MODULES.progress.setCurrentPhase('${phase.id}')">设为当前施工阶段</button></div>` : ''}</div><button class="btn btn-sm btn-secondary" ${next ? `onclick="MODULES.progress.shiftPhase(1)"` : 'disabled'}>${next ? escapeHtml(next.name) : '无下一阶段'} →</button></div><div class="timeline" style="margin-top:16px;flex-wrap:wrap;justify-content:center">${data.phases.map((p, i) => `<button class="timeline-item" style="border:0;background:transparent;padding:0;cursor:pointer" onclick="MODULES.progress.viewPhase('${p.id}')" title="${escapeHtml(p.name)}"><div class="timeline-dot ${p.id === phase.id ? 'active' : p.status === '已完成' ? 'completed' : isLag(p) ? 'lag' : ''}"></div>${i < data.phases.length - 1 ? `<div class="timeline-line ${p.status === '已完成' ? 'completed' : ''}"></div>` : ''}</button>`).join('')}</div></div><div class="app-card" style="padding:22px;border:1px solid rgba(43,127,216,.18)"><div class="flex-between" style="align-items:flex-start;gap:12px;margin-bottom:16px"><div><div class="text-xs text-faint">阶段切片</div><div class="text-sm text-faint">左右切换只是查看，不会改变当前施工阶段。</div></div></div><div style="display:grid;grid-template-columns:minmax(0,1fr) minmax(320px,.82fr);gap:16px"><section style="display:grid;gap:14px"><div style="background:var(--cream-deep);border-radius:14px;padding:14px"><div class="flex-between"><strong>阶段目标</strong><button class="btn btn-sm btn-secondary" onclick="MODULES.progress.editGoal('${phase.id}')">编辑</button></div><p class="text-sm" style="margin:10px 0 0;line-height:1.7;color:var(--ink-light)">${escapeHtml(phase.goal || '还没有写阶段目标。')}</p></div><div style="background:var(--cream-deep);border-radius:14px;padding:14px"><div class="flex-between" style="margin-bottom:10px"><strong>本阶段要做</strong><div style="display:flex;gap:6px"><button class="btn btn-sm btn-secondary" onclick="MODULES.progress.addTask('${phase.id}')">+ 添加</button><button class="btn btn-sm btn-secondary" onclick="MODULES.progress.editTasks('${phase.id}')">编辑</button></div></div>${renderTaskList(phase)}</div><div style="background:var(--cream-deep);border-radius:14px;padding:14px"><div class="flex-between"><strong>卡点提醒</strong><button class="btn btn-sm btn-secondary" onclick="MODULES.progress.editBlocker('${phase.id}')">编辑</button></div><div class="alert-banner ${phaseBlockers(phase, signals).includes('暂无') ? 'alert-banner-success' : 'alert-banner-warning'}" style="margin-top:10px">${phaseBlockers(phase, signals).includes('暂无') ? '✅' : '⚠️'} ${escapeHtml(phaseBlockers(phase, signals))}</div></div></section><aside style="display:grid;gap:14px"><div style="background:var(--cream-deep);border-radius:14px;padding:14px"><div class="flex-between" style="margin-bottom:10px"><strong>关键时间点</strong><div style="display:flex;gap:6px"><button class="btn btn-sm btn-secondary" onclick="MODULES.progress.addKeyDate('${phase.id}')">+ 添加</button><button class="btn btn-sm btn-secondary" onclick="MODULES.progress.editKeyDates('${phase.id}')">编辑</button></div></div>${renderKeyDates(phase)}</div><div style="background:var(--cream-deep);border-radius:14px;padding:14px"><strong>相关记录</strong><div style="margin-top:10px">${renderRecordLinks(signals)}</div></div><div style="background:var(--cream-deep);border-radius:14px;padding:14px"><strong>现场照片</strong><div style="margin-top:10px">${renderPhotoStrip(signals)}</div></div></aside></div></div>`;
  }
  function renderPhases() { ensureDefaultPhases(); return renderCurrentPhaseSlice(); }
  function editPhase(phaseId) {
    const phase = data.phases.find(p => p.id === phaseId); if (!phase) return;
    const checkLabel = phase.type === 'planning' ? '确认项' : '验收项';
    const overlay = document.getElementById('modalOverlay'); const content = document.getElementById('modalContent');
    content.innerHTML = `<div class="modal-header"><div class="modal-title">✏️ 编辑阶段 — ${escapeHtml(phase.name)}</div><button class="modal-close" onclick="closeModal()">×</button></div><div class="modal-body" style="display:flex;flex-direction:column;gap:14px"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div><label style="display:block;font-size:.8rem;color:var(--ink-light);margin-bottom:6px">状态</label><select class="app-input app-select" id="editPhaseStatus">${STATUS_LIST.map(s => `<option value="${s}" ${phase.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div><div><label style="display:block;font-size:.8rem;color:var(--ink-light);margin-bottom:6px">进度 (%)</label><input type="range" min="0" max="100" value="${phase.progress}" style="width:100%" id="editProgressRange" oninput="document.getElementById('editProgressVal').textContent=this.value+'%'"><div class="text-xs" id="editProgressVal">${phase.progress}%</div></div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px"><div><label style="display:block;font-size:.8rem;color:var(--ink-light);margin-bottom:6px">计划开始</label><input type="date" class="app-input" id="editPlannedStart" value="${phase.plannedStart}"></div><div><label style="display:block;font-size:.8rem;color:var(--ink-light);margin-bottom:6px">计划结束</label><input type="date" class="app-input" id="editPlannedEnd" value="${phase.plannedEnd}"></div></div><div><label style="display:block;font-size:.8rem;color:var(--ink-light);margin-bottom:6px">阶段目标</label><textarea class="app-input app-textarea" id="editPhaseGoal" rows="2">${escapeHtml(phase.goal || '')}</textarea></div><div><label style="display:block;font-size:.8rem;color:var(--ink-light);margin-bottom:6px">关键时间点（一行一项）</label><textarea class="app-input app-textarea" id="editMilestones" rows="3">${(phase.milestones || []).map(escapeHtml).join('\n')}</textarea></div><div><label style="display:block;font-size:.8rem;color:var(--ink-light);margin-bottom:6px">待办（一行一项，前缀 [x] 表示完成）</label><textarea class="app-input app-textarea" id="editTasks" rows="5">${phase.tasks.map(t => `${t.done ? '[x] ' : ''}${escapeHtml(t.title)}`).join('\n')}</textarea></div><div><label style="display:block;font-size:.8rem;color:var(--ink-light);margin-bottom:6px">${checkLabel}（一行一项，前缀 [x] 表示完成）</label><textarea class="app-input app-textarea" id="editChecks" rows="5">${phase.checks.map(t => `${t.done ? '[x] ' : ''}${escapeHtml(t.title)}`).join('\n')}</textarea></div><div><label style="display:block;font-size:.8rem;color:var(--ink-light);margin-bottom:6px">备注</label><textarea class="app-input app-textarea" id="editPhaseNote" rows="3">${escapeHtml(phase.note || '')}</textarea></div></div><div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-primary" id="btnSavePhase">保存</button></div>`;
    overlay.classList.add('show');
    document.getElementById('btnSavePhase').addEventListener('click', () => {
      phase.status = document.getElementById('editPhaseStatus').value; phase.progress = parseInt(document.getElementById('editProgressRange').value, 10); phase.plannedStart = document.getElementById('editPlannedStart').value; phase.plannedEnd = document.getElementById('editPlannedEnd').value; phase.goal = document.getElementById('editPhaseGoal').value; phase.milestones = String(document.getElementById('editMilestones').value || '').split('\n').map(x => x.trim()).filter(Boolean); phase.note = document.getElementById('editPhaseNote').value;
      phase.tasks = parseChecklist(document.getElementById('editTasks').value, phase.id + '_task'); phase.checks = parseChecklist(document.getElementById('editChecks').value, phase.id + '_check');
      if (phase.progress >= 100 && phase.status !== '已完成') phase.status = '已完成'; if (phase.status === '进行中') data.currentPhaseId = phase.id;
      save(); closeModal(); render(); App.showToast('阶段节点已更新', 'success');
    });
  }
  function openSimpleModal(title, bodyHtml, onSave, dangerHtml = '') {
    const overlay = document.getElementById('modalOverlay'); const content = document.getElementById('modalContent');
    content.innerHTML = `<div class="modal-header"><div class="modal-title">${title}</div><button class="modal-close" onclick="closeModal()">×</button></div><div class="modal-body">${bodyHtml}</div><div class="modal-footer">${dangerHtml}<button class="btn btn-secondary" onclick="closeModal()">取消</button><button class="btn btn-primary" id="btnProgressModalSave">保存</button></div>`;
    overlay.classList.add('show'); document.getElementById('btnProgressModalSave').addEventListener('click', onSave);
  }
  function editGoal(phaseId) { const phase = data.phases.find(p => p.id === phaseId); if (!phase) return; openSimpleModal('编辑阶段目标', `<textarea class="app-input app-textarea" id="editGoalText" rows="5">${escapeHtml(phase.goal || '')}</textarea>`, () => { phase.goal = document.getElementById('editGoalText').value; save(); closeModal(); render(); App.showToast('阶段目标已更新', 'success'); }); }
  function editBlocker(phaseId) { const phase = data.phases.find(p => p.id === phaseId); if (!phase) return; openSimpleModal('编辑卡点提醒', `<textarea class="app-input app-textarea" id="editBlockerText" rows="4">${escapeHtml(phase.blocker || '')}</textarea><div class="text-xs text-faint" style="margin-top:8px">写这个阶段最容易卡在哪里。不是系统吓唬你，是给未来自己看的提醒。</div>`, () => { phase.blocker = document.getElementById('editBlockerText').value; save(); closeModal(); render(); App.showToast('卡点提醒已更新', 'success'); }); }
  function addTask(phaseId) { editTask(phaseId, ''); }
  function editTask(phaseId, itemId) { const phase = data.phases.find(p => p.id === phaseId); if (!phase) return; const item = (phase.tasks || []).find(t => t.id === itemId) || { id: generateId('task'), title: '', done: false }; openSimpleModal(itemId ? '编辑待办' : '添加待办', `<input class="app-input" id="editTaskTitle" value="${escapeHtml(item.title || '')}" placeholder="这一步要做什么"><label style="display:flex;gap:8px;align-items:center;margin-top:12px"><input type="checkbox" id="editTaskDone" ${item.done ? 'checked' : ''}> 已完成</label>`, () => { item.title = document.getElementById('editTaskTitle').value.trim(); item.done = document.getElementById('editTaskDone').checked; if (!item.title) return App.showToast('待办标题不能为空', 'warning'); if (!itemId) phase.tasks = [...(phase.tasks || []), item]; save(); closeModal(); render(); App.showToast('待办已更新', 'success'); }, itemId ? `<button class="btn btn-danger" onclick="MODULES.progress.deleteTask('${phaseId}','${itemId}')">删除</button>` : ''); }
  function editTasks(phaseId) { const phase = data.phases.find(p => p.id === phaseId); if (!phase) return; openSimpleModal('编辑本阶段要做', `<textarea class="app-input app-textarea" id="editTasksBulk" rows="8" placeholder="一行一项，前缀 [x] 表示完成">${(phase.tasks || []).map(t => `${t.done ? '[x] ' : ''}${t.title}`).join('\n')}</textarea><div class="text-xs text-faint" style="margin-top:8px">这里统一管理整张卡片，页面上就不再给每条塞一个编辑按钮。</div>`, () => { phase.tasks = parseChecklist(document.getElementById('editTasksBulk').value, phase.id + '_task'); save(); closeModal(); render(); App.showToast('本阶段待办已更新', 'success'); }); }
  function deleteTask(phaseId, itemId) { const phase = data.phases.find(p => p.id === phaseId); if (!phase) return; phase.tasks = (phase.tasks || []).filter(t => t.id !== itemId); save(); closeModal(); render(); App.showToast('待办已删除', 'success'); }
  function addKeyDate(phaseId) { editKeyDate(phaseId, ''); }
  function editKeyDate(phaseId, keyDateId) { const phase = data.phases.find(p => p.id === phaseId); if (!phase) return; phase.keyDates = phaseKeyDates(phase); const item = phase.keyDates.find(k => k.id === keyDateId) || { id: generateId('kd'), date: '', title: '', note: '', status: '待办', delayedUntil: '', done: false }; openSimpleModal(keyDateId ? '编辑关键时间点' : '添加关键时间点', `<div style="display:grid;gap:12px"><input type="date" class="app-input" id="editKeyDateDate" value="${escapeHtml(item.date || '')}"><input class="app-input" id="editKeyDateTitle" value="${escapeHtml(item.title || '')}" placeholder="这一天要做什么"><select class="app-input app-select" id="editKeyDateStatus">${['待办','进行中','已完成','延期'].map(s => `<option value="${s}" ${item.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select><input type="date" class="app-input" id="editKeyDateDelayed" value="${escapeHtml(item.delayedUntil || '')}"><textarea class="app-input app-textarea" id="editKeyDateNote" rows="3" placeholder="备注，比如谁来、要准备什么">${escapeHtml(item.note || '')}</textarea></div>`, () => { item.date = document.getElementById('editKeyDateDate').value; item.title = document.getElementById('editKeyDateTitle').value.trim(); item.status = document.getElementById('editKeyDateStatus').value; item.delayedUntil = document.getElementById('editKeyDateDelayed').value; item.note = document.getElementById('editKeyDateNote').value.trim(); item.done = item.status === '已完成'; if (!item.title) return App.showToast('时间点事项不能为空', 'warning'); if (!keyDateId) phase.keyDates.push(item); save(); closeModal(); render(); App.showToast('关键时间点已更新', 'success'); }, keyDateId ? `<button class="btn btn-danger" onclick="MODULES.progress.deleteKeyDate('${phaseId}','${keyDateId}')">删除</button>` : ''); }
  function editKeyDates(phaseId) { const phase = data.phases.find(p => p.id === phaseId); if (!phase) return; phase.keyDates = phaseKeyDates(phase); const rows = phase.keyDates.map((item, idx) => `<div style="display:grid;grid-template-columns:120px 1fr 100px 120px;gap:8px;align-items:center"><input type="date" class="app-input" id="kdDate_${idx}" value="${escapeHtml(item.date || '')}"><input class="app-input" id="kdTitle_${idx}" value="${escapeHtml(item.title || '')}" placeholder="事项"><select class="app-input app-select" id="kdStatus_${idx}">${['待办','进行中','已完成','延期'].map(s => `<option value="${s}" ${item.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select><input type="date" class="app-input" id="kdDelay_${idx}" value="${escapeHtml(item.delayedUntil || '')}"><textarea class="app-input app-textarea" id="kdNote_${idx}" rows="1" style="grid-column:2 / 5" placeholder="备注">${escapeHtml(item.note || '')}</textarea></div>`).join(''); openSimpleModal('编辑关键时间点', `<div style="display:grid;gap:12px">${rows || '<div class="text-xs text-faint">还没有关键时间点，先点添加。</div>'}</div><div class="text-xs text-faint" style="margin-top:8px">状态可标记是否完成；如果延期，填“延到”的日期。</div>`, () => { phase.keyDates = phase.keyDates.map((item, idx) => { const status = document.getElementById(`kdStatus_${idx}`).value; return { ...item, date: document.getElementById(`kdDate_${idx}`).value, title: document.getElementById(`kdTitle_${idx}`).value.trim() || '关键节点', status, delayedUntil: document.getElementById(`kdDelay_${idx}`).value, note: document.getElementById(`kdNote_${idx}`).value.trim(), done: status === '已完成' }; }); save(); closeModal(); render(); App.showToast('关键时间点已更新', 'success'); }); }
  function deleteKeyDate(phaseId, keyDateId) { const phase = data.phases.find(p => p.id === phaseId); if (!phase) return; phase.keyDates = phaseKeyDates(phase).filter(k => k.id !== keyDateId); save(); closeModal(); render(); App.showToast('关键时间点已删除', 'success'); }
  function updateKeyDate(phaseId, keyDateId, field, value) {
    const phase = data.phases.find(p => p.id === phaseId); if (!phase) return;
    phase.keyDates = phaseKeyDates(phase);
    const item = phase.keyDates.find(k => k.id === keyDateId); if (!item) return;
    item[field] = value;
    if (field === 'status') item.done = value === '已完成';
    save(); render();
  }
  function parseChecklist(text, prefix) { return String(text || '').split('\n').map(x => x.trim()).filter(Boolean).map((line, idx) => { const done = /^\[x\]\s*/i.test(line); return { id: `${prefix}_${idx + 1}`, title: line.replace(/^\[[ x]\]\s*/i, ''), done }; }); }
  function toggleNode(phaseId, key, itemId) { const phase = data.phases.find(p => p.id === phaseId); const item = phase?.[key]?.find(x => x.id === itemId); if (!item) return; item.done = !item.done; save(); render(); }
  function toggleCommTodo(recordId, todoId, checked) {
    const comm = App.getData('communications') || { records: [] };
    const record = (comm.records || []).find(r => r.id === recordId);
    const todo = record?.todos?.find(t => t.id === todoId);
    if (!todo) return;
    todo.status = checked ? '已完成' : '待办';
    todo.completedAt = checked ? new Date().toISOString() : null;
    App.setData('communications', comm);
    render();
  }
  function viewPhase(phaseId) { viewingPhaseId = phaseId; render(); }
  function setPhaseStatus(phaseId, status) {
    const phase = data.phases.find(p => p.id === phaseId); if (!phase) return;
    phase.status = status;
    if (status === '未开始') phase.progress = 0;
    if (status === '进行中' && Number(phase.progress || 0) === 0) phase.progress = 10;
    if (status === '已完成') { phase.progress = 100; phase.actualEnd = phase.actualEnd || getToday(); }
    if (status !== '已完成') phase.actualEnd = '';
    save(); render(); App.showToast(`阶段状态已改为${status}`, 'success');
  }
  function setCurrentPhase(phaseId) { data.currentPhaseId = phaseId; viewingPhaseId = phaseId; const p = data.phases.find(x => x.id === phaseId); if (p && p.status === '未开始') p.status = '进行中'; save(); render(); App.showToast('已更新当前施工阶段', 'success'); }
  function shiftPhase(offset) { const currentView = viewingPhaseId || data.currentPhaseId; const idx = data.phases.findIndex(p => p.id === currentView); const next = data.phases[idx + offset]; if (!next) return; viewPhase(next.id); }

  function renderPhotoFilters() { return `<div class="filter-bar"><select class="app-input app-select" id="filterPhase" onchange="MODULES.progress.setFilter('phase', this.value)"><option value="all">全部阶段</option>${PHASE_NAMES.map(p => `<option value="${p}" ${photoFilters.phase === p ? 'selected' : ''}>${p}</option>`).join('')}</select><select class="app-input app-select" id="filterLocation" onchange="MODULES.progress.setFilter('location', this.value)"><option value="all">全部位置</option>${LOCATION_TAGS.map(l => `<option value="${l}" ${photoFilters.location === l ? 'selected' : ''}>${l}</option>`).join('')}</select><select class="app-input app-select" id="filterNature" onchange="MODULES.progress.setFilter('nature', this.value)"><option value="all">全部性质</option>${NATURE_TAGS.map(n => `<option value="${n}" ${photoFilters.nature === n ? 'selected' : ''}>${n}</option>`).join('')}</select><input type="date" class="app-input" id="filterDateFrom" value="${photoFilters.dateFrom}" onchange="MODULES.progress.setFilter('dateFrom', this.value)"><input type="date" class="app-input" id="filterDateTo" value="${photoFilters.dateTo}" onchange="MODULES.progress.setFilter('dateTo', this.value)"><select class="app-input app-select" id="filterUser" onchange="MODULES.progress.setFilter('user', this.value)"><option value="all">全部拍摄者</option>${(App.users || []).map(u => `<option value="${u.id}" ${photoFilters.user === u.id ? 'selected' : ''}>${u.avatar} ${u.name}</option>`).join('')}</select><div style="flex:1"></div><button class="btn btn-sm ${photoView === 'grid' ? 'btn-primary' : 'btn-secondary'}" onclick="MODULES.progress.setPhotoView('grid')">⊞ 网格</button><button class="btn btn-sm ${photoView === 'timeline' ? 'btn-primary' : 'btn-secondary'}" onclick="MODULES.progress.setPhotoView('timeline')">☰ 时间线</button></div>`; }
  function getFilteredPhotos() { return (data.photos || []).filter(ph => { if (photoFilters.phase !== 'all' && ph.tags?.phase !== photoFilters.phase) return false; if (photoFilters.location !== 'all' && !(ph.tags?.location || []).includes(photoFilters.location)) return false; if (photoFilters.nature !== 'all' && ph.tags?.nature !== photoFilters.nature) return false; if (photoFilters.user !== 'all' && ph.takenBy !== photoFilters.user) return false; if (photoFilters.dateFrom && ph.date < photoFilters.dateFrom) return false; if (photoFilters.dateTo && ph.date > photoFilters.dateTo) return false; return true; }).sort((a, b) => b.date.localeCompare(a.date)); }
  function renderPhotoGrid(photos) { if (!photos.length) return `<div class="empty-state"><div class="empty-state-icon">📷</div><div class="empty-state-text">暂无照片</div><div class="text-sm text-faint">拖拽或点击上传照片</div></div>`; return `<div class="grid-4" id="photoGrid">${photos.map(ph => { const user = getUser(ph.takenBy); const tags = []; if (ph.tags?.phase) tags.push(`<span class="badge badge-blue">${ph.tags.phase}</span>`); if (ph.tags?.nature) tags.push(`<span class="badge badge-${ph.tags.nature === '发现问题' ? 'red' : ph.tags.nature === '验收通过' ? 'green' : 'yellow'}">${ph.tags.nature}</span>`); (ph.tags?.location || []).forEach(loc => tags.push(`<span class="badge badge-gray">${loc}</span>`)); return `<div class="photo-card" data-photo-id="${ph.id}" onclick="MODULES.progress.viewPhoto('${ph.id}')"><div class="photo-card-img"><img src="" data-src="${ph.fileName}" alt="${escapeHtml(ph.note || '照片')}" style="display:none" onload="this.style.display='block';this.nextElementSibling.style.display='none'"><div class="photo-card-placeholder">📷</div></div><div class="photo-card-info"><div class="flex-between" style="margin-bottom:4px"><span class="text-xs text-faint">${ph.date}</span><span class="text-xs text-faint">${user.avatar} ${user.name}</span></div><div class="photo-card-tags">${tags.join('')}</div>${ph.note ? `<div class="text-xs" style="color:var(--ink-light);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(ph.note)}</div>` : ''}</div></div>`; }).join('')}</div>`; }
  function renderPhotoTimeline(photos) { if (!photos.length) return `<div class="empty-state"><div class="empty-state-icon">📷</div><div class="empty-state-text">暂无照片</div></div>`; const groups = {}; photos.forEach(ph => { (groups[ph.date] ||= []).push(ph); }); return `<div style="display:flex;flex-direction:column;gap:20px">${Object.keys(groups).sort().reverse().map(date => `<div class="app-card" style="padding:16px"><div class="text-sm" style="font-weight:600;margin-bottom:12px;color:var(--blue)">${date}</div>${renderPhotoGrid(groups[date])}</div>`).join('')}</div>`; }
  function renderPhotos() { const photos = getFilteredPhotos(); return renderPhotoFilters() + `<div style="margin-bottom:16px"><button class="btn btn-primary btn-sm" onclick="document.getElementById('photoInput').click()">+ 上传照片</button><input type="file" id="photoInput" accept="image/*" multiple style="display:none" onchange="MODULES.progress.handleFileSelect(this.files)"><span class="text-xs text-faint" style="margin-left:10px">支持拖拽上传</span></div><div id="photoDropZone" style="border:2px dashed var(--border-medium);border-radius:var(--radius);padding:40px;text-align:center;color:var(--ink-faint);margin-bottom:20px;display:none"><div style="font-size:2rem;margin-bottom:8px">📥</div><div>松开鼠标上传照片</div></div>` + (photoView === 'grid' ? renderPhotoGrid(photos) : renderPhotoTimeline(photos)); }
  async function loadPhotoThumbnails() { container().querySelectorAll('img[data-src]').forEach(img => { const url = img.getAttribute('data-src'); if (url && url.startsWith('http')) img.src = url; }); }
  async function savePhotoFile(file, dateFolder) { if (!App.currentProject) { App.showToast('请先登录', 'warning'); return null; } try { const ext = file.name.split('.').pop(); const fileName = 'IMG_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 5) + '.' + ext; const safePath = `projects/${App.currentProject.id}/photos/${dateFolder.replace(/[^a-zA-Z0-9_-]/g, '_')}/${fileName}`; const result = await App.uploadFile('images', safePath, file); if (result.error) throw result.error; return result.url; } catch (e) { console.error('Upload photo failed:', e); App.showToast('保存照片失败: ' + e.message, 'error'); return null; } }
  async function handleFileSelect(files) { if (!files || !files.length) return; const uploaded = []; const currentPhase = data.phases.find(p => p.id === data.currentPhaseId); for (const file of Array.from(files)) { let date = getToday(); const nameMatch = file.name.match(/(20\d{2})(\d{2})(\d{2})/); if (nameMatch) date = `${nameMatch[1]}-${nameMatch[2]}-${nameMatch[3]}`; else if (file.lastModified) date = new Date(file.lastModified).toISOString().slice(0, 10); const path = await savePhotoFile(file, date); if (path) uploaded.push({ id: generateId('ph'), fileName: path, date, takenBy: getCurrentUser().id, tags: { phase: currentPhase?.name || '', location: [], nature: '正常进度' }, note: '' }); } if (uploaded.length) { data.photos.push(...uploaded); save(); render(); App.showToast(`已上传 ${uploaded.length} 张照片`, 'success'); } else App.showToast('没有照片上传成功，请查看权限或文件格式', 'warning'); }
  async function viewPhoto(photoId) { const ph = (data.photos || []).find(p => p.id === photoId); if (!ph) return; const overlay = document.getElementById('modalOverlay'); const content = document.getElementById('modalContent'); content.innerHTML = `<div class="modal-header"><div class="modal-title">📷 照片详情</div><button class="modal-close" onclick="closeModal()">×</button></div><div class="modal-body" style="display:flex;flex-direction:column;gap:14px"><div style="text-align:center;background:var(--cream-deep);border-radius:var(--radius);overflow:hidden">${ph.fileName ? `<img src="${ph.fileName}" style="max-width:100%;max-height:50vh;object-fit:contain;display:block;margin:0 auto">` : '<div style="padding:40px;color:var(--ink-faint)">无法加载图片</div>'}</div><div><label style="display:block;font-size:.8rem;color:var(--ink-light);margin-bottom:6px">阶段</label><select class="app-input app-select" id="photoPhase"><option value="">未选择</option>${PHASE_NAMES.map(p => `<option value="${p}" ${ph.tags?.phase === p ? 'selected' : ''}>${p}</option>`).join('')}</select></div><div><label style="display:block;font-size:.8rem;color:var(--ink-light);margin-bottom:6px">性质</label><select class="app-input app-select" id="photoNature">${NATURE_TAGS.map(n => `<option value="${n}" ${ph.tags?.nature === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div><div><label style="display:block;font-size:.8rem;color:var(--ink-light);margin-bottom:6px">备注</label><textarea class="app-input app-textarea" id="photoNote" rows="2">${escapeHtml(ph.note || '')}</textarea></div></div><div class="modal-footer"><button class="btn btn-danger" onclick="MODULES.progress.deletePhoto('${ph.id}')">🗑 删除</button><button class="btn btn-secondary" onclick="closeModal()">关闭</button><button class="btn btn-primary" id="btnSavePhoto">保存</button></div>`; overlay.classList.add('show'); document.getElementById('btnSavePhoto').addEventListener('click', () => { ph.tags = ph.tags || {}; ph.tags.phase = document.getElementById('photoPhase').value; ph.tags.nature = document.getElementById('photoNature').value; ph.note = document.getElementById('photoNote').value; save(); closeModal(); render(); App.showToast('照片信息已更新', 'success'); }); }
  async function deletePhoto(photoId) { const ok = await App.confirm('确定要删除这张照片吗？'); if (!ok) return; data.photos = (data.photos || []).filter(p => p.id !== photoId); save(); closeModal(); render(); App.showToast('照片已删除', 'success'); }
  function setFilter(key, value) { photoFilters[key] = value; render(); }
  function setPhotoView(view) { photoView = view; render(); }
  function setupDragDrop() { const zone = container(); if (!zone) return; zone.addEventListener('dragover', e => { if (currentTab !== 'photos') return; e.preventDefault(); const dz = document.getElementById('photoDropZone'); if (dz) dz.style.display = 'block'; }); zone.addEventListener('drop', e => { if (currentTab !== 'photos') return; e.preventDefault(); const dz = document.getElementById('photoDropZone'); if (dz) dz.style.display = 'none'; if (e.dataTransfer.files.length) handleFileSelect(e.dataTransfer.files); }); }
  function render() { const el = container(); if (!el) return; photoObjectURLs.forEach(url => URL.revokeObjectURL(url)); photoObjectURLs = []; ensureDefaultPhases(); el.innerHTML = renderTabs() + (currentTab === 'phases' ? renderPhases() : renderPhotos()); el.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => { currentTab = tab.dataset.tab; render(); })); if (currentTab === 'photos') loadPhotoThumbnails(); }
  const module = { name: '进度', icon: '📅', init() { const el = container(); if (el) el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📅</div><div class="empty-state-text">加载中...</div></div>'; setupDragDrop(); }, render, onShow() { const d = App.getData('progress'); if (d) data = d; ensureDefaultPhases(); if (!viewingPhaseId || !data.phases.some(p => p.id === viewingPhaseId)) viewingPhaseId = data.currentPhaseId; render(); }, onHide() { photoObjectURLs.forEach(url => URL.revokeObjectURL(url)); photoObjectURLs = []; }, getData() { return JSON.parse(JSON.stringify(data)); }, setData(d) { if (d) { data = d; ensureDefaultPhases(); } }, isDirty() { return false; }, editPhase, editGoal, editBlocker, addTask, editTask, editTasks, deleteTask, addKeyDate, editKeyDate, editKeyDates, deleteKeyDate, updateKeyDate, viewPhase, setPhaseStatus, setCurrentPhase, shiftPhase, toggleNode, toggleCommTodo, handleFileSelect, viewPhoto, deletePhoto, setFilter, setPhotoView };
  registerModule('progress', module);
})();
