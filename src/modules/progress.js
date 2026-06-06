// Progress Module
(function() {
  'use strict';

  // ── Constants ──
  const PHASE_NAMES = ['拆除', '水电', '泥瓦', '木工', '油漆', '安装'];
  const STATUS_LIST = ['未开始', '进行中', '已完成', '滞后'];
  const LOCATION_TAGS = ['客厅', '主卧', '次卧', '厨房', '卫生间', '阳台', '书房', '玄关'];
  const NATURE_TAGS = ['正常进度', '发现问题', '验收通过', '待整改', '灵感参考'];

  // ── State ──
  let data = { version: '1.0', updatedAt: '', phases: [], currentPhaseId: null, photos: [] };
  let currentTab = 'phases'; // 'phases' | 'photos'
  let photoFilters = { phase: 'all', location: 'all', nature: 'all', dateFrom: '', dateTo: '', user: 'all' };
  let photoView = 'grid'; // 'grid' | 'timeline'
  let photoObjectURLs = []; // track for cleanup

  // ── Helpers ──
  function getToday() {
    return new Date().toISOString().slice(0, 10);
  }

  function formatDateRange(start, end, fallback) {
    if (!start && !end) return fallback || '—';
    const s = start ? start.slice(5).replace('-', '/') : '?';
    const e = end ? end.slice(5).replace('-', '/') : '进行中';
    return s + ' - ' + e;
  }

  function daysBetween(a, b) {
    if (!a || !b) return 0;
    const da = new Date(a), db = new Date(b);
    return Math.round((db - da) / 86400000);
  }

  function isLag(phase) {
    if (!phase.plannedEnd) return false;
    const today = getToday();
    if (phase.actualEnd && phase.actualEnd > phase.plannedEnd) return true;
    if (!phase.actualEnd && phase.status !== '已完成' && today > phase.plannedEnd) return true;
    return false;
  }

  function lagDays(phase) {
    if (!phase.plannedEnd) return 0;
    const end = phase.actualEnd || getToday();
    if (end > phase.plannedEnd) return daysBetween(phase.plannedEnd, end);
    return 0;
  }

  function save() {
    data.updatedAt = new Date().toISOString();
    App.setData('progress', JSON.parse(JSON.stringify(data)));
  }

  function getUser(uId) {
    return (App.users || []).find(u => u.id === uId) || { name: '未知', avatar: '👤' };
  }

  function generateId(prefix) {
    return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
  }

  function ensureDefaultPhases() {
    if (!data.phases || data.phases.length === 0) {
      data.phases = PHASE_NAMES.map((name, i) => ({
        id: 'phase_' + (i + 1),
        name,
        order: i + 1,
        plannedStart: '',
        plannedEnd: '',
        actualStart: '',
        actualEnd: '',
        status: '未开始',
        progress: 0,
        note: ''
      }));
    }
  }

  // ── DOM Refs ──
  function container() {
    return document.getElementById('progress-content');
  }

  // ── Render: Tabs ──
  function renderTabs() {
    return `
      <div class="tab-bar">
        <button class="tab ${currentTab === 'phases' ? 'active' : ''}" data-tab="phases">📋 阶段时间线</button>
        <button class="tab ${currentTab === 'photos' ? 'active' : ''}" data-tab="photos">📷 照片墙 (${data.photos?.length || 0})</button>
      </div>
    `;
  }

  // ── Render: Phases ──
  function renderPhases() {
    ensureDefaultPhases();
    const phases = data.phases;
    const currentId = data.currentPhaseId;

    let html = '<div class="timeline" style="margin-bottom:24px;flex-wrap:wrap;">';
    phases.forEach((phase, idx) => {
      const isCurrent = phase.id === currentId;
      const lag = isLag(phase);
      const completed = phase.status === '已完成';
      const activeCls = isCurrent ? 'active' : (completed ? 'completed' : (lag ? 'lag' : ''));
      const lineCls = idx < phases.length - 1 ? (completed ? 'completed' : (isCurrent ? 'active' : '')) : '';

      html += `
        <div class="timeline-item">
          <div class="timeline-dot ${activeCls}"></div>
          ${idx < phases.length - 1 ? `<div class="timeline-line ${lineCls}"></div>` : ''}
        </div>
      `;
    });
    html += '</div>';

    html += '<div class="grid-3" id="phaseGrid">';
    phases.forEach(phase => {
      const isCurrent = phase.id === currentId;
      const lag = isLag(phase);
      const cardCls = ['phase-card'];
      if (isCurrent) cardCls.push('active');
      else if (phase.status === '已完成') cardCls.push('completed');
      else if (lag) cardCls.push('lag');

      const statusBadge = phase.status === '已完成' ? '<span class="badge badge-green">✅ 已完成</span>' :
        phase.status === '进行中' ? '<span class="badge badge-blue">🔄 进行中</span>' :
        phase.status === '滞后' ? '<span class="badge badge-red">⚠️ 滞后</span>' :
        '<span class="badge badge-gray">⏳ 未开始</span>';

      const currentBadge = isCurrent ? '<span class="badge badge-blue" style="margin-left:6px">当前</span>' : '';
      const lagText = lag ? `<div class="phase-status" style="color:var(--red);font-weight:600">滞后 ${lagDays(phase)} 天</div>` : '';
      const actualText = phase.actualStart
        ? (phase.actualEnd ? `实际: ${daysBetween(phase.actualStart, phase.actualEnd)} 天` : `已进行 ${daysBetween(phase.actualStart, getToday())} 天`)
        : '';

      const progressColor = phase.progress >= 100 ? 'success' : (lag ? 'danger' : (phase.progress > 0 ? '' : ''));

      html += `
        <div class="${cardCls.join(' ')}" data-phase-id="${phase.id}">
          <div class="flex-between" style="margin-bottom:10px">
            <div class="phase-name">${phase.order}. ${phase.name} ${currentBadge}</div>
            <div>${statusBadge}</div>
          </div>
          <div class="phase-dates" style="margin-bottom:6px">计划: ${formatDateRange(phase.plannedStart, phase.plannedEnd, '未设定')}</div>
          <div class="phase-dates" style="margin-bottom:8px">实际: ${formatDateRange(phase.actualStart, phase.actualEnd, '未开始')}</div>
          ${lagText}
          ${actualText ? `<div class="phase-dates">${actualText}</div>` : ''}
          <div class="progress-bar" style="margin:10px 0">
            <div class="progress-bar-fill ${progressColor}" style="width:${phase.progress}%"></div>
          </div>
          <div class="text-xs text-faint" style="margin-bottom:10px">进度 ${phase.progress}%</div>
          ${phase.note ? `<div class="text-xs" style="color:var(--ink-light);margin-bottom:10px;background:var(--cream-deep);padding:6px 8px;border-radius:6px">${escapeHtml(phase.note)}</div>` : ''}
          <div class="flex" style="gap:6px">
            <button class="btn btn-sm btn-secondary" onclick="MODULES.progress.editPhase('${phase.id}')">✏️ 编辑</button>
            ${!isCurrent && phase.status === '进行中' ? `<button class="btn btn-sm btn-primary" onclick="MODULES.progress.setCurrentPhase('${phase.id}')">设为当前</button>` : ''}
          </div>
        </div>
      `;
    });
    html += '</div>';
    return html;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ── Phase Edit Modal ──
  function editPhase(phaseId) {
    const phase = data.phases.find(p => p.id === phaseId);
    if (!phase) return;
    const overlay = document.getElementById('modalOverlay');
    const content = document.getElementById('modalContent');
    content.innerHTML = `
      <div class="modal-header">
        <div class="modal-title">✏️ 编辑阶段 — ${phase.name}</div>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      <div class="modal-body" style="display:flex;flex-direction:column;gap:14px">
        <div>
          <label style="display:block;font-size:0.8rem;color:var(--ink-light);margin-bottom:6px">状态</label>
          <select class="app-input app-select" id="editPhaseStatus">
            ${STATUS_LIST.map(s => `<option value="${s}" ${phase.status === s ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label style="display:block;font-size:0.8rem;color:var(--ink-light);margin-bottom:6px">计划开始</label>
            <input type="date" class="app-input" id="editPlannedStart" value="${phase.plannedStart}">
          </div>
          <div>
            <label style="display:block;font-size:0.8rem;color:var(--ink-light);margin-bottom:6px">计划结束</label>
            <input type="date" class="app-input" id="editPlannedEnd" value="${phase.plannedEnd}">
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label style="display:block;font-size:0.8rem;color:var(--ink-light);margin-bottom:6px">实际开始</label>
            <input type="date" class="app-input" id="editActualStart" value="${phase.actualStart}">
          </div>
          <div>
            <label style="display:block;font-size:0.8rem;color:var(--ink-light);margin-bottom:6px">实际结束</label>
            <input type="date" class="app-input" id="editActualEnd" value="${phase.actualEnd || ''}">
          </div>
        </div>
        <div>
          <label style="display:block;font-size:0.8rem;color:var(--ink-light);margin-bottom:6px">进度 (%)</label>
          <input type="range" min="0" max="100" value="${phase.progress}" style="width:100%" id="editProgressRange" oninput="document.getElementById('editProgressVal').textContent=this.value+'%'">
          <div class="text-xs" id="editProgressVal" style="margin-top:4px">${phase.progress}%</div>
        </div>
        <div>
          <label style="display:block;font-size:0.8rem;color:var(--ink-light);margin-bottom:6px">备注</label>
          <textarea class="app-input app-textarea" id="editPhaseNote" rows="3">${escapeHtml(phase.note)}</textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">取消</button>
        <button class="btn btn-primary" id="btnSavePhase">保存</button>
      </div>
    `;
    overlay.classList.add('show');

    document.getElementById('btnSavePhase').addEventListener('click', () => {
      phase.status = document.getElementById('editPhaseStatus').value;
      phase.plannedStart = document.getElementById('editPlannedStart').value;
      phase.plannedEnd = document.getElementById('editPlannedEnd').value;
      phase.actualStart = document.getElementById('editActualStart').value;
      phase.actualEnd = document.getElementById('editActualEnd').value || null;
      phase.progress = parseInt(document.getElementById('editProgressRange').value, 10);
      phase.note = document.getElementById('editPhaseNote').value;

      // Auto status logic
      if (phase.progress >= 100 && phase.status !== '已完成') {
        phase.status = '已完成';
        if (!phase.actualEnd) phase.actualEnd = getToday();
      }
      if (isLag(phase) && phase.status !== '已完成') phase.status = '滞后';

      // Auto current phase
      if (phase.status === '进行中' && !data.currentPhaseId) data.currentPhaseId = phase.id;

      save();
      closeModal();
      render();
      App.showToast('阶段信息已更新', 'success');
    });
  }

  function setCurrentPhase(phaseId) {
    data.currentPhaseId = phaseId;
    save();
    render();
    App.showToast('已更新当前阶段', 'success');
  }

  // ── Render: Photos ──
  function renderPhotoFilters() {
    return `
      <div class="filter-bar">
        <select class="app-input app-select" id="filterPhase" onchange="MODULES.progress.setFilter('phase', this.value)">
          <option value="all">全部阶段</option>
          ${PHASE_NAMES.map(p => `<option value="${p}" ${photoFilters.phase === p ? 'selected' : ''}>${p}</option>`).join('')}
        </select>
        <select class="app-input app-select" id="filterLocation" onchange="MODULES.progress.setFilter('location', this.value)">
          <option value="all">全部位置</option>
          ${LOCATION_TAGS.map(l => `<option value="${l}" ${photoFilters.location === l ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
        <select class="app-input app-select" id="filterNature" onchange="MODULES.progress.setFilter('nature', this.value)">
          <option value="all">全部性质</option>
          ${NATURE_TAGS.map(n => `<option value="${n}" ${photoFilters.nature === n ? 'selected' : ''}>${n}</option>`).join('')}
        </select>
        <input type="date" class="app-input" id="filterDateFrom" value="${photoFilters.dateFrom}" onchange="MODULES.progress.setFilter('dateFrom', this.value)" title="开始日期">
        <input type="date" class="app-input" id="filterDateTo" value="${photoFilters.dateTo}" onchange="MODULES.progress.setFilter('dateTo', this.value)" title="结束日期">
        <select class="app-input app-select" id="filterUser" onchange="MODULES.progress.setFilter('user', this.value)">
          <option value="all">全部拍摄者</option>
          ${(App.users || []).map(u => `<option value="${u.id}" ${photoFilters.user === u.id ? 'selected' : ''}>${u.avatar} ${u.name}</option>`).join('')}
        </select>
        <div style="flex:1"></div>
        <button class="btn btn-sm ${photoView === 'grid' ? 'btn-primary' : 'btn-secondary'}" onclick="MODULES.progress.setPhotoView('grid')">⊞ 网格</button>
        <button class="btn btn-sm ${photoView === 'timeline' ? 'btn-primary' : 'btn-secondary'}" onclick="MODULES.progress.setPhotoView('timeline')">☰ 时间线</button>
      </div>
    `;
  }

  function getFilteredPhotos() {
    if (!data.photos) return [];
    return data.photos.filter(ph => {
      if (photoFilters.phase !== 'all' && ph.tags?.phase !== photoFilters.phase) return false;
      if (photoFilters.location !== 'all' && !(ph.tags?.location || []).includes(photoFilters.location)) return false;
      if (photoFilters.nature !== 'all' && ph.tags?.nature !== photoFilters.nature) return false;
      if (photoFilters.user !== 'all' && ph.takenBy !== photoFilters.user) return false;
      if (photoFilters.dateFrom && ph.date < photoFilters.dateFrom) return false;
      if (photoFilters.dateTo && ph.date > photoFilters.dateTo) return false;
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }

  function renderPhotoGrid(photos) {
    if (photos.length === 0) {
      return `<div class="empty-state"><div class="empty-state-icon">📷</div><div class="empty-state-text">暂无照片</div><div class="text-sm text-faint">拖拽或点击上传照片</div></div>`;
    }
    let html = '<div class="grid-4" id="photoGrid">';
    photos.forEach(ph => {
      const user = getUser(ph.takenBy);
      const tagsHtml = [];
      if (ph.tags?.phase) tagsHtml.push(`<span class="badge badge-blue">${ph.tags.phase}</span>`);
      if (ph.tags?.nature) tagsHtml.push(`<span class="badge badge-${ph.tags.nature === '发现问题' ? 'red' : (ph.tags.nature === '验收通过' ? 'green' : 'yellow')}">${ph.tags.nature}</span>`);
      (ph.tags?.location || []).forEach(loc => tagsHtml.push(`<span class="badge badge-gray">${loc}</span>`));

      html += `
        <div class="photo-card" data-photo-id="${ph.id}" onclick="MODULES.progress.viewPhoto('${ph.id}')">
          <div class="photo-card-img" style="display:flex;align-items:center;justify-content:center;overflow:hidden">
            <img src="" data-src="${ph.fileName}" alt="${escapeHtml(ph.note || '照片')}" style="width:100%;height:100%;object-fit:cover;display:none" onload="this.style.display='block';this.previousElementSibling.style.display='none'">
            <div style="color:var(--ink-faint);font-size:2rem">📷</div>
          </div>
          <div class="photo-card-info">
            <div class="flex-between" style="margin-bottom:4px">
              <span class="text-xs text-faint">${ph.date}</span>
              <span class="text-xs text-faint">${user.avatar} ${user.name}</span>
            </div>
            <div class="photo-card-tags">${tagsHtml.join('')}</div>
            ${ph.note ? `<div class="text-xs" style="color:var(--ink-light);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(ph.note)}</div>` : ''}
          </div>
        </div>
      `;
    });
    html += '</div>';
    return html;
  }

  function renderPhotoTimeline(photos) {
    if (photos.length === 0) {
      return `<div class="empty-state"><div class="empty-state-icon">📷</div><div class="empty-state-text">暂无照片</div></div>`;
    }
    const groups = {};
    photos.forEach(ph => {
      if (!groups[ph.date]) groups[ph.date] = [];
      groups[ph.date].push(ph);
    });
    let html = '<div style="display:flex;flex-direction:column;gap:20px">';
    Object.keys(groups).sort().reverse().forEach(date => {
      html += `<div class="app-card" style="padding:16px"><div class="text-sm" style="font-weight:600;margin-bottom:12px;color:var(--blue)">${date}</div><div class="grid-4">`;
      groups[date].forEach(ph => {
        const user = getUser(ph.takenBy);
        const tagsHtml = [];
        if (ph.tags?.phase) tagsHtml.push(`<span class="badge badge-blue">${ph.tags.phase}</span>`);
        if (ph.tags?.nature) tagsHtml.push(`<span class="badge badge-${ph.tags.nature === '发现问题' ? 'red' : (ph.tags.nature === '验收通过' ? 'green' : 'yellow')}">${ph.tags.nature}</span>`);
        (ph.tags?.location || []).forEach(loc => tagsHtml.push(`<span class="badge badge-gray">${loc}</span>`));
        html += `
          <div class="photo-card" data-photo-id="${ph.id}" onclick="MODULES.progress.viewPhoto('${ph.id}')">
            <div class="photo-card-img" style="display:flex;align-items:center;justify-content:center;overflow:hidden">
              <img src="" data-src="${ph.fileName}" alt="${escapeHtml(ph.note || '照片')}" style="width:100%;height:100%;object-fit:cover;display:none" onload="this.style.display='block';this.previousElementSibling.style.display='none'">
              <div style="color:var(--ink-faint);font-size:2rem">📷</div>
            </div>
            <div class="photo-card-info">
              <div class="flex-between"><span class="text-xs text-faint">${user.avatar} ${user.name}</span></div>
              <div class="photo-card-tags">${tagsHtml.join('')}</div>
            </div>
          </div>
        `;
      });
      html += '</div></div>';
    });
    html += '</div>';
    return html;
  }

  function renderPhotos() {
    const photos = getFilteredPhotos();
    let html = renderPhotoFilters();
    html += `
      <div style="margin-bottom:16px">
        <button class="btn btn-primary btn-sm" onclick="document.getElementById('photoInput').click()">+ 上传照片</button>
        <input type="file" id="photoInput" accept="image/*" multiple style="display:none" onchange="MODULES.progress.handleFileSelect(this.files)">
        <span class="text-xs text-faint" style="margin-left:10px">支持拖拽上传</span>
      </div>
      <div id="photoDropZone" style="border:2px dashed var(--border-medium);border-radius:var(--radius);padding:40px;text-align:center;color:var(--ink-faint);margin-bottom:20px;display:none">
        <div style="font-size:2rem;margin-bottom:8px">📥</div>
        <div>松开鼠标上传照片</div>
      </div>
    `;
    if (photoView === 'grid') html += renderPhotoGrid(photos);
    else html += renderPhotoTimeline(photos);
    return html;
  }

  // ── Photo: Load thumbnails via File System Access API ──
  async function loadPhotoThumbnails() {
    if (!App.dirHandle) return;
    const imgs = container().querySelectorAll('img[data-src]');
    for (const img of imgs) {
      const path = img.getAttribute('data-src');
      if (!path) continue;
      try {
        const parts = path.split('/');
        let handle = App.dirHandle;
        for (let i = 0; i < parts.length - 1; i++) {
          if (!parts[i]) continue;
          handle = await handle.getDirectoryHandle(parts[i], { create: false });
        }
        const fileHandle = await handle.getFileHandle(parts[parts.length - 1], { create: false });
        const file = await fileHandle.getFile();
        const url = URL.createObjectURL(file);
        photoObjectURLs.push(url);
        img.src = url;
      } catch (e) {
        // fallback: keep placeholder
      }
    }
  }

  // ── Photo: Upload ──
  async function savePhotoFile(file, dateFolder) {
    if (!App.dirHandle) {
      App.showToast('请先选择项目文件夹', 'warning');
      return null;
    }
    try {
      let photosDir = await App.dirHandle.getDirectoryHandle('photos', { create: true });
      let dateDir = await photosDir.getDirectoryHandle(dateFolder, { create: true });
      const ext = file.name.split('.').pop();
      const fileName = 'IMG_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 5) + '.' + ext;
      const fileHandle = await dateDir.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(file);
      await writable.close();
      return `photos/${dateFolder}/${fileName}`;
    } catch (e) {
      App.showToast('保存照片失败: ' + e.message, 'error');
      return null;
    }
  }

  async function handleFileSelect(files) {
    if (!files || files.length === 0) return;
    const uploaded = [];
    for (const file of Array.from(files)) {
      // Try to read EXIF date, fallback to today
      let date = getToday();
      // Simple heuristic: check file name for date pattern YYYYMMDD or use lastModified
      const nameMatch = file.name.match(/(20\d{2})(\d{2})(\d{2})/);
      if (nameMatch) date = `${nameMatch[1]}-${nameMatch[2]}-${nameMatch[3]}`;
      else {
        const d = new Date(file.lastModified);
        date = d.toISOString().slice(0, 10);
      }
      const path = await savePhotoFile(file, date);
      if (path) {
        uploaded.push({
          id: generateId('ph'),
          fileName: path,
          date,
          takenBy: App.currentUser.id,
          tags: { phase: '', location: [], nature: '正常进度' },
          note: ''
        });
      }
    }
    if (uploaded.length > 0) {
      data.photos = data.photos || [];
      data.photos.push(...uploaded);
      save();
      render();
      App.showToast(`已上传 ${uploaded.length} 张照片`, 'success');
    }
  }

  // ── Photo: View / Edit / Delete ──
  async function viewPhoto(photoId) {
    const ph = (data.photos || []).find(p => p.id === photoId);
    if (!ph) return;
    const user = getUser(ph.takenBy);
    let imgUrl = '';
    try {
      const parts = ph.fileName.split('/');
      let handle = App.dirHandle;
      for (let i = 0; i < parts.length - 1; i++) {
        handle = await handle.getDirectoryHandle(parts[i], { create: false });
      }
      const fileHandle = await handle.getFileHandle(parts[parts.length - 1], { create: false });
      const file = await fileHandle.getFile();
      imgUrl = URL.createObjectURL(file);
      photoObjectURLs.push(imgUrl);
    } catch (e) { /* ignore */ }

    const overlay = document.getElementById('modalOverlay');
    const content = document.getElementById('modalContent');
    content.innerHTML = `
      <div class="modal-header">
        <div class="modal-title">📷 照片详情</div>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      <div class="modal-body" style="display:flex;flex-direction:column;gap:14px">
        <div style="text-align:center;background:var(--cream-deep);border-radius:var(--radius);overflow:hidden">
          ${imgUrl ? `<img src="${imgUrl}" style="max-width:100%;max-height:50vh;object-fit:contain;display:block;margin:0 auto">` : '<div style="padding:40px;color:var(--ink-faint)">无法加载图片</div>'}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <div>
            <label style="display:block;font-size:0.8rem;color:var(--ink-light);margin-bottom:6px">日期</label>
            <input type="date" class="app-input" id="photoDate" value="${ph.date}">
          </div>
          <div>
            <label style="display:block;font-size:0.8rem;color:var(--ink-light);margin-bottom:6px">拍摄者</label>
            <select class="app-input app-select" id="photoUser">
              ${(App.users || []).map(u => `<option value="${u.id}" ${ph.takenBy === u.id ? 'selected' : ''}>${u.avatar} ${u.name}</option>`).join('')}
            </select>
          </div>
        </div>
        <div>
          <label style="display:block;font-size:0.8rem;color:var(--ink-light);margin-bottom:6px">阶段 Tag（单选）</label>
          <select class="app-input app-select" id="photoPhase">
            <option value="">未选择</option>
            ${PHASE_NAMES.map(p => `<option value="${p}" ${ph.tags?.phase === p ? 'selected' : ''}>${p}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="display:block;font-size:0.8rem;color:var(--ink-light);margin-bottom:6px">位置 Tag（多选）</label>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            ${LOCATION_TAGS.map(loc => `
              <label style="display:flex;align-items:center;gap:4px;font-size:0.85rem;cursor:pointer;padding:4px 8px;border-radius:6px;background:var(--cream-deep)">
                <input type="checkbox" value="${loc}" ${(ph.tags?.location || []).includes(loc) ? 'checked' : ''} class="photoLocCb">
                ${loc}
              </label>
            `).join('')}
          </div>
        </div>
        <div>
          <label style="display:block;font-size:0.8rem;color:var(--ink-light);margin-bottom:6px">性质 Tag（单选）</label>
          <select class="app-input app-select" id="photoNature">
            ${NATURE_TAGS.map(n => `<option value="${n}" ${ph.tags?.nature === n ? 'selected' : ''}>${n}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="display:block;font-size:0.8rem;color:var(--ink-light);margin-bottom:6px">备注</label>
          <textarea class="app-input app-textarea" id="photoNote" rows="2">${escapeHtml(ph.note || '')}</textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-danger" onclick="MODULES.progress.deletePhoto('${ph.id}')">🗑 删除</button>
        <button class="btn btn-secondary" onclick="closeModal()">关闭</button>
        <button class="btn btn-primary" id="btnSavePhoto">保存</button>
      </div>
    `;
    overlay.classList.add('show');

    document.getElementById('btnSavePhoto').addEventListener('click', () => {
      ph.date = document.getElementById('photoDate').value;
      ph.takenBy = document.getElementById('photoUser').value;
      ph.tags = {
        phase: document.getElementById('photoPhase').value,
        location: Array.from(document.querySelectorAll('.photoLocCb:checked')).map(cb => cb.value),
        nature: document.getElementById('photoNature').value
      };
      ph.note = document.getElementById('photoNote').value;
      save();
      closeModal();
      render();
      App.showToast('照片信息已更新', 'success');
    });
  }

  async function deletePhoto(photoId) {
    const ok = await App.confirm('确定要删除这张照片吗？文件将从本地文件夹中移除。');
    if (!ok) return;
    const idx = (data.photos || []).findIndex(p => p.id === photoId);
    if (idx === -1) return;
    const ph = data.photos[idx];
    // Delete file
    if (App.dirHandle && ph.fileName) {
      try {
        const parts = ph.fileName.split('/');
        let handle = App.dirHandle;
        for (let i = 0; i < parts.length - 1; i++) {
          handle = await handle.getDirectoryHandle(parts[i], { create: false });
        }
        await handle.removeEntry(parts[parts.length - 1]);
      } catch (e) { /* ignore */ }
    }
    data.photos.splice(idx, 1);
    save();
    closeModal();
    render();
    App.showToast('照片已删除', 'success');
  }

  // ── Filters & View ──
  function setFilter(key, value) {
    photoFilters[key] = value;
    render();
  }

  function setPhotoView(view) {
    photoView = view;
    render();
  }

  // ── Drag & Drop ──
  function setupDragDrop() {
    const zone = container();
    if (!zone) return;
    zone.addEventListener('dragover', e => {
      if (currentTab !== 'photos') return;
      e.preventDefault();
      const dz = document.getElementById('photoDropZone');
      if (dz) dz.style.display = 'block';
    });
    zone.addEventListener('dragleave', e => {
      e.preventDefault();
      const dz = document.getElementById('photoDropZone');
      if (dz && !zone.contains(e.relatedTarget)) dz.style.display = 'none';
    });
    zone.addEventListener('drop', e => {
      if (currentTab !== 'photos') return;
      e.preventDefault();
      const dz = document.getElementById('photoDropZone');
      if (dz) dz.style.display = 'none';
      const files = e.dataTransfer.files;
      if (files.length) handleFileSelect(files);
    });
  }

  // ── Main Render ──
  function render() {
    const el = container();
    if (!el) return;
    // Clean up old object URLs
    photoObjectURLs.forEach(url => URL.revokeObjectURL(url));
    photoObjectURLs = [];

    let html = renderTabs();
    if (currentTab === 'phases') html += renderPhases();
    else html += renderPhotos();
    el.innerHTML = html;

    // Bind tab clicks
    el.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        currentTab = tab.dataset.tab;
        render();
      });
    });

    // Load photo thumbnails
    if (currentTab === 'photos') {
      loadPhotoThumbnails();
    }
  }

  // ── Module API ──
  const module = {
    name: '进度',
    icon: '📅',

    init() {
      const el = container();
      if (el) {
        el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📅</div><div class="empty-state-text">加载中...</div></div>';
      }
      setupDragDrop();
    },

    render() {
      render();
    },

    onShow() {
      // Refresh data from App
      const d = App.getData('progress');
      if (d) {
        data = d;
        ensureDefaultPhases();
      }
      render();
    },

    onHide() {
      // Clean up object URLs
      photoObjectURLs.forEach(url => URL.revokeObjectURL(url));
      photoObjectURLs = [];
    },

    getData() {
      return JSON.parse(JSON.stringify(data));
    },

    setData(d) {
      if (d) {
        data = d;
        ensureDefaultPhases();
      }
    },

    isDirty() {
      return false; // auto-save handles this
    },

    // Exposed for inline onclick handlers
    editPhase,
    setCurrentPhase,
    handleFileSelect,
    viewPhoto,
    deletePhoto,
    setFilter,
    setPhotoView
  };

  registerModule('progress', module);
})();
