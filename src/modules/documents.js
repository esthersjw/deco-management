// Documents Module
(function() {
  let data = { version: '1.0', updatedAt: new Date().toISOString(), documents: [], categories: ['合同', '报价单', '设计图', '收据', '其他'] };
  let filteredDocs = [];
  let currentFilter = { category: 'all', tag: 'all', search: '', sort: 'date-desc' };
  let allTags = new Set();

  // ========== UTILITIES ==========

  function generateId() {
    return 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  }

  function formatSize(bytes) {
    if (bytes === 0 || !bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + units[i];
  }

  function formatDate(iso) {
    if (!iso) return '--';
    const d = new Date(iso);
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return m + '-' + day;
  }

  function formatDateTime(iso) {
    if (!iso) return '--';
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return y + '-' + m + '-' + day + ' ' + h + ':' + min;
  }

  function getUploaderName(userId) {
    const user = window.App.users.find(u => u.id === userId);
    return user ? user.avatar + user.name : userId;
  }

  function getFileIcon(type) {
    const map = {
      pdf: '📄', jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️',
      doc: '📝', docx: '📝', xls: '📊', xlsx: '📊'
    };
    return map[(type || '').toLowerCase()] || '📎';
  }

  function updateAllTags() {
    allTags.clear();
    (data.documents || []).forEach(doc => {
      (doc.tags || []).forEach(tag => allTags.add(tag));
    });
  }

  function getAllTags() {
    return Array.from(allTags).sort();
  }

  function getAcceptedTypes() {
    return '.pdf,.jpg,.jpeg,.png,.gif,.doc,.docx,.xls,.xlsx';
  }

  function getFileExtension(filename) {
    return filename.split('.').pop().toLowerCase();
  }

  function isImageType(type) {
    return ['jpg', 'jpeg', 'png', 'gif'].includes((type || '').toLowerCase());
  }

  function isPdfType(type) {
    return (type || '').toLowerCase() === 'pdf';
  }

  // ========== FILE SYSTEM ==========

  async function saveFileToDisk(file, category, fileName) {
    const dirHandle = window.App.dirHandle;
    if (!dirHandle) {
      window.App.showToast('未选择项目文件夹，无法保存文件', 'error');
      return false;
    }
    try {
      const filesDir = await dirHandle.getDirectoryHandle('files', { create: true });
      const catDir = await filesDir.getDirectoryHandle(category, { create: true });
      const fileHandle = await catDir.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(file);
      await writable.close();
      return true;
    } catch (e) {
      console.error('Save file failed:', e);
      window.App.showToast('文件保存失败: ' + e.message, 'error');
      return false;
    }
  }

  async function getFileFromDisk(fileName) {
    const dirHandle = window.App.dirHandle;
    if (!dirHandle) return null;
    try {
      const parts = fileName.split('/');
      let current = dirHandle;
      for (let i = 0; i < parts.length; i++) {
        if (i === parts.length - 1) {
          const fileHandle = await current.getFileHandle(parts[i]);
          return await fileHandle.getFile();
        } else {
          current = await current.getDirectoryHandle(parts[i]);
        }
      }
      return null;
    } catch (e) {
      console.error('Read file failed:', e);
      return null;
    }
  }

  // ========== UPLOAD ==========

  function handleUploadClick() {
    let input = document.getElementById('docUploadInput');
    if (!input) {
      input = document.createElement('input');
      input.type = 'file';
      input.id = 'docUploadInput';
      input.multiple = true;
      input.accept = getAcceptedTypes();
      input.style.display = 'none';
      input.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          handleFileSelect(e.target.files);
        }
        e.target.value = '';
      });
      document.body.appendChild(input);
    }
    input.click();
  }

  async function handleFileSelect(files) {
    const docs = data.documents || [];
    let successCount = 0;
    let warnCount = 0;

    for (const file of files) {
      const ext = getFileExtension(file.name);
      const accepted = getAcceptedTypes().split(',').map(s => s.replace('.', '').trim());
      if (!accepted.includes(ext)) {
        window.App.showToast('不支持的文件格式: ' + file.name, 'warning');
        continue;
      }

      if (file.size > 5 * 1024 * 1024) {
        window.App.showToast('文件 "' + file.name + '" 超过 5MB，建议压缩后上传', 'warning');
        warnCount++;
      }

      const category = data.categories[0]; // 默认第一个分类
      const safeName = file.name.replace(/[^\w\u4e00-\u9fa5.\-]/g, '_');
      const fileName = category + '/' + safeName;

      const saved = await saveFileToDisk(file, category, safeName);
      if (!saved) continue;

      const doc = {
        id: generateId(),
        name: file.name.replace(/\.[^.]+$/, ''),
        fileName: fileName,
        type: ext,
        category: category,
        tags: [],
        uploadedAt: new Date().toISOString(),
        uploadedBy: window.App.currentUser.id,
        size: file.size,
        note: ''
      };
      docs.push(doc);
      successCount++;
    }

    if (successCount > 0) {
      data.documents = docs;
      data.updatedAt = new Date().toISOString();
      window.App.setData('documents', data);
      updateAllTags();
      applyFilters();
      window.App.showToast('成功上传 ' + successCount + ' 个文件' + (warnCount > 0 ? '（' + warnCount + ' 个大文件）' : ''), 'success');
    }
  }

  // ========== FILTER & SORT ==========

  function applyFilters() {
    let docs = data.documents || [];

    // Category filter
    if (currentFilter.category !== 'all') {
      docs = docs.filter(d => d.category === currentFilter.category);
    }

    // Tag filter
    if (currentFilter.tag !== 'all') {
      docs = docs.filter(d => (d.tags || []).includes(currentFilter.tag));
    }

    // Search filter
    if (currentFilter.search) {
      const s = currentFilter.search.toLowerCase();
      docs = docs.filter(d => {
        return (d.name || '').toLowerCase().includes(s) ||
               (d.note || '').toLowerCase().includes(s) ||
               (d.tags || []).some(t => t.toLowerCase().includes(s));
      });
    }

    // Sort
    const sort = currentFilter.sort || 'date-desc';
    docs = docs.slice().sort((a, b) => {
      switch (sort) {
        case 'date-desc': return new Date(b.uploadedAt || 0) - new Date(a.uploadedAt || 0);
        case 'date-asc': return new Date(a.uploadedAt || 0) - new Date(b.uploadedAt || 0);
        case 'name-asc': return (a.name || '').localeCompare(b.name || '', 'zh');
        case 'name-desc': return (b.name || '').localeCompare(a.name || '', 'zh');
        case 'size-desc': return (b.size || 0) - (a.size || 0);
        case 'size-asc': return (a.size || 0) - (b.size || 0);
        default: return 0;
      }
    });

    filteredDocs = docs;
  }

  // ========== RENDER ==========

  function render() {
    const container = document.getElementById('documents-content');
    if (!container) return;

    applyFilters();

    const allTagsList = getAllTags();
    const categories = data.categories || [];

    let html = `
      <div class="filter-bar">
        <select class="app-input app-select" id="docFilterCategory" style="min-width:100px">
          <option value="all">全部分类</option>
          ${categories.map(c => `<option value="${escapeHtml(c)}" ${currentFilter.category === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
        </select>
        <select class="app-input app-select" id="docFilterTag" style="min-width:100px">
          <option value="all">全部标签</option>
          ${allTagsList.map(t => `<option value="${escapeHtml(t)}" ${currentFilter.tag === t ? 'selected' : ''}>${escapeHtml(t)}</option>`).join('')}
        </select>
        <select class="app-input app-select" id="docSort" style="min-width:120px">
          <option value="date-desc" ${currentFilter.sort === 'date-desc' ? 'selected' : ''}>日期 ↓</option>
          <option value="date-asc" ${currentFilter.sort === 'date-asc' ? 'selected' : ''}>日期 ↑</option>
          <option value="name-asc" ${currentFilter.sort === 'name-asc' ? 'selected' : ''}>名称 A-Z</option>
          <option value="name-desc" ${currentFilter.sort === 'name-desc' ? 'selected' : ''}>名称 Z-A</option>
          <option value="size-desc" ${currentFilter.sort === 'size-desc' ? 'selected' : ''}>大小 ↓</option>
          <option value="size-asc" ${currentFilter.sort === 'size-asc' ? 'selected' : ''}>大小 ↑</option>
        </select>
        <div style="flex:1"></div>
        <input type="text" class="app-input" id="docSearch" placeholder="🔍 搜索文件..." value="${escapeHtml(currentFilter.search)}" style="max-width:240px">
      </div>
    `;

    if (filteredDocs.length === 0) {
      html += `
        <div class="empty-state">
          <div class="empty-state-icon">📁</div>
          <div class="empty-state-text">暂无文件</div>
          <button class="btn btn-primary btn-sm" id="btnUploadEmpty">+ 上传文件</button>
        </div>
      `;
    } else {
      html += `
        <div style="overflow-x:auto">
          <table class="data-table" id="docTable">
            <thead>
              <tr>
                <th>名称</th>
                <th>类型</th>
                <th>分类</th>
                <th>标签</th>
                <th>日期</th>
                <th>上传者</th>
                <th>大小</th>
                <th style="text-align:center;width:100px">操作</th>
              </tr>
            </thead>
            <tbody>
              ${filteredDocs.map(doc => renderDocRow(doc)).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    container.innerHTML = html;
    bindFilterEvents();
    bindRowEvents();
  }

  function renderDocRow(doc) {
    const tagsHtml = (doc.tags || []).map(t => `<span class="badge badge-gray">${escapeHtml(t)}</span>`).join(' ');
    return `
      <tr data-doc-id="${doc.id}">
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:1.1rem">${getFileIcon(doc.type)}</span>
            <span style="font-weight:500">${escapeHtml(doc.name)}</span>
          </div>
        </td>
        <td><span class="badge badge-blue">${(doc.type || '').toUpperCase()}</span></td>
        <td>${escapeHtml(doc.category || '')}</td>
        <td>${tagsHtml || '<span style="color:var(--ink-faint)">-</span>'}</td>
        <td>${formatDate(doc.uploadedAt)}</td>
        <td>${getUploaderName(doc.uploadedBy)}</td>
        <td>${formatSize(doc.size)}</td>
        <td style="text-align:center">
          <button class="btn-icon doc-action-preview" title="预览" data-id="${doc.id}">👁</button>
          <button class="btn-icon doc-action-download" title="下载" data-id="${doc.id}">⬇️</button>
          <button class="btn-icon doc-action-edit" title="编辑" data-id="${doc.id}">✏️</button>
          <button class="btn-icon doc-action-delete" title="删除" data-id="${doc.id}">🗑</button>
        </td>
      </tr>
    `;
  }

  function bindFilterEvents() {
    const cat = document.getElementById('docFilterCategory');
    const tag = document.getElementById('docFilterTag');
    const sort = document.getElementById('docSort');
    const search = document.getElementById('docSearch');
    const uploadEmpty = document.getElementById('btnUploadEmpty');

    if (cat) cat.addEventListener('change', (e) => { currentFilter.category = e.target.value; applyFilters(); renderTable(); });
    if (tag) tag.addEventListener('change', (e) => { currentFilter.tag = e.target.value; applyFilters(); renderTable(); });
    if (sort) sort.addEventListener('change', (e) => { currentFilter.sort = e.target.value; applyFilters(); renderTable(); });
    if (search) {
      search.addEventListener('input', (e) => { currentFilter.search = e.target.value; applyFilters(); renderTable(); });
    }
    if (uploadEmpty) uploadEmpty.addEventListener('click', handleUploadClick);
  }

  function bindRowEvents() {
    document.querySelectorAll('.doc-action-preview').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); previewDoc(btn.dataset.id); });
    });
    document.querySelectorAll('.doc-action-download').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); downloadDoc(btn.dataset.id); });
    });
    document.querySelectorAll('.doc-action-edit').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); editDoc(btn.dataset.id); });
    });
    document.querySelectorAll('.doc-action-delete').forEach(btn => {
      btn.addEventListener('click', (e) => { e.stopPropagation(); deleteDoc(btn.dataset.id); });
    });
  }

  function renderTable() {
    const tbody = document.querySelector('#docTable tbody');
    if (!tbody) return;
    if (filteredDocs.length === 0) {
      render();
      return;
    }
    tbody.innerHTML = filteredDocs.map(doc => renderDocRow(doc)).join('');
    bindRowEvents();
  }

  // ========== PREVIEW ==========

  async function previewDoc(docId) {
    const doc = (data.documents || []).find(d => d.id === docId);
    if (!doc) return;

    const overlay = document.getElementById('modalOverlay');
    const content = document.getElementById('modalContent');

    let previewHtml = '';

    if (isPdfType(doc.type)) {
      previewHtml = `<div style="text-align:center;color:var(--ink-faint);padding:40px">正在加载预览...</div>`;
    } else if (isImageType(doc.type)) {
      previewHtml = `<div style="text-align:center;padding:20px">正在加载图片...</div>`;
    } else {
      previewHtml = `
        <div class="empty-state" style="padding:40px">
          <div class="empty-state-icon">📎</div>
          <div class="empty-state-text">暂不支持预览，请下载查看</div>
          <button class="btn btn-primary btn-sm" id="previewDownloadBtn">下载文件</button>
        </div>
      `;
    }

    content.innerHTML = `
      <div class="modal-header">
        <div class="modal-title">${getFileIcon(doc.type)} ${escapeHtml(doc.name)}</div>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      <div class="modal-body" id="previewBody" style="padding:0;max-height:60vh;overflow:auto">
        ${previewHtml}
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary btn-sm" onclick="closeModal()">关闭</button>
        <button class="btn btn-primary btn-sm" id="previewDownloadBtn2">下载</button>
      </div>
    `;
    overlay.classList.add('show');

    // Load actual content
    const file = await getFileFromDisk(doc.fileName);
    const body = document.getElementById('previewBody');

    if (file) {
      const url = URL.createObjectURL(file);
      if (isPdfType(doc.type)) {
        if (body) body.innerHTML = `<embed src="${url}" type="application/pdf" width="100%" height="500px" style="border-radius:8px">`;
      } else if (isImageType(doc.type)) {
        if (body) body.innerHTML = `<img src="${url}" style="max-width:100%;border-radius:8px;display:block;margin:0 auto" alt="${escapeHtml(doc.name)}">`;
      }

      // Bind download buttons
      const bindDownload = (btn) => {
        if (btn) {
          btn.addEventListener('click', () => {
            const a = document.createElement('a');
            a.href = url;
            a.download = doc.fileName.split('/').pop();
            a.click();
          });
        }
      };
      bindDownload(document.getElementById('previewDownloadBtn'));
      bindDownload(document.getElementById('previewDownloadBtn2'));
    } else {
      if (body) body.innerHTML = `<div class="empty-state" style="padding:40px"><div class="empty-state-icon">⚠️</div><div class="empty-state-text">文件读取失败，可能已被移动或删除</div></div>`;
    }
  }

  // ========== EDIT ==========

  function editDoc(docId) {
    const doc = (data.documents || []).find(d => d.id === docId);
    if (!doc) return;

    const overlay = document.getElementById('modalOverlay');
    const content = document.getElementById('modalContent');
    const categories = data.categories || [];
    const currentTags = doc.tags || [];

    content.innerHTML = `
      <div class="modal-header">
        <div class="modal-title">✏️ 编辑文件信息</div>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      <div class="modal-body">
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:0.8rem;color:var(--ink-light);margin-bottom:6px">文件名称</label>
          <input type="text" class="app-input" id="editDocName" value="${escapeHtml(doc.name)}">
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:0.8rem;color:var(--ink-light);margin-bottom:6px">分类</label>
          <select class="app-input app-select" id="editDocCategory">
            ${categories.map(c => `<option value="${escapeHtml(c)}" ${doc.category === c ? 'selected' : ''}>${escapeHtml(c)}</option>`).join('')}
          </select>
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:0.8rem;color:var(--ink-light);margin-bottom:6px">标签</label>
          <div id="editTagContainer" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px">
            ${currentTags.map(t => `<span class="badge badge-blue edit-tag-item" style="cursor:pointer" data-tag="${escapeHtml(t)}">${escapeHtml(t)} ×</span>`).join('')}
          </div>
          <div style="display:flex;gap:8px">
            <input type="text" class="app-input" id="editTagInput" placeholder="输入标签，回车添加" style="flex:1">
            <button class="btn btn-secondary btn-sm" id="editTagAddBtn">添加</button>
          </div>
          <div id="editTagSuggestions" style="margin-top:6px;display:flex;flex-wrap:wrap;gap:4px">
            ${getAllTags().filter(t => !currentTags.includes(t)).map(t => `<span class="badge badge-gray edit-tag-suggest" style="cursor:pointer" data-tag="${escapeHtml(t)}">+ ${escapeHtml(t)}</span>`).join('')}
          </div>
        </div>
        <div style="margin-bottom:16px">
          <label style="display:block;font-size:0.8rem;color:var(--ink-light);margin-bottom:6px">备注</label>
          <textarea class="app-input app-textarea" id="editDocNote" placeholder="添加备注...">${escapeHtml(doc.note || '')}</textarea>
        </div>
        <div style="font-size:0.78rem;color:var(--ink-faint)">
          文件: ${escapeHtml(doc.fileName)} · ${formatSize(doc.size)} · ${formatDateTime(doc.uploadedAt)} · ${getUploaderName(doc.uploadedBy)}
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">取消</button>
        <button class="btn btn-primary" id="editDocSaveBtn">保存</button>
      </div>
    `;
    overlay.classList.add('show');

    let editingTags = currentTags.slice();

    function refreshEditTags() {
      const container = document.getElementById('editTagContainer');
      const suggestions = document.getElementById('editTagSuggestions');
      if (container) {
        container.innerHTML = editingTags.map(t => `<span class="badge badge-blue edit-tag-item" style="cursor:pointer" data-tag="${escapeHtml(t)}">${escapeHtml(t)} ×</span>`).join('');
        container.querySelectorAll('.edit-tag-item').forEach(el => {
          el.addEventListener('click', () => {
            editingTags = editingTags.filter(tag => tag !== el.dataset.tag);
            refreshEditTags();
          });
        });
      }
      if (suggestions) {
        suggestions.innerHTML = getAllTags().filter(t => !editingTags.includes(t)).map(t => `<span class="badge badge-gray edit-tag-suggest" style="cursor:pointer" data-tag="${escapeHtml(t)}">+ ${escapeHtml(t)}</span>`).join('');
        suggestions.querySelectorAll('.edit-tag-suggest').forEach(el => {
          el.addEventListener('click', () => {
            if (!editingTags.includes(el.dataset.tag)) {
              editingTags.push(el.dataset.tag);
              refreshEditTags();
            }
          });
        });
      }
    }

    refreshEditTags();

    const addTag = () => {
      const input = document.getElementById('editTagInput');
      const val = (input.value || '').trim();
      if (val && !editingTags.includes(val)) {
        editingTags.push(val);
        allTags.add(val);
        input.value = '';
        refreshEditTags();
      }
    };

    document.getElementById('editTagAddBtn').addEventListener('click', addTag);
    document.getElementById('editTagInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); addTag(); }
    });

    document.getElementById('editDocSaveBtn').addEventListener('click', async () => {
      const newName = document.getElementById('editDocName').value.trim();
      const newCategory = document.getElementById('editDocCategory').value;
      const newNote = document.getElementById('editDocNote').value.trim();

      if (!newName) {
        window.App.showToast('文件名称不能为空', 'warning');
        return;
      }

      // If category changed, we should move the file
      const oldCategory = doc.category;
      const newFileName = newCategory + '/' + doc.fileName.split('/').pop();

      if (oldCategory !== newCategory && window.App.dirHandle) {
        // Move file in disk
        try {
          const file = await getFileFromDisk(doc.fileName);
          if (file) {
            const saved = await saveFileToDisk(file, newCategory, doc.fileName.split('/').pop());
            if (saved) {
              // Delete old file
              try {
                const parts = doc.fileName.split('/');
                let current = window.App.dirHandle;
                for (let i = 0; i < parts.length; i++) {
                  if (i === parts.length - 1) {
                    await current.removeEntry(parts[i]);
                  } else {
                    current = await current.getDirectoryHandle(parts[i]);
                  }
                }
              } catch (e) {
                console.warn('Failed to remove old file:', e);
              }
            }
          }
        } catch (e) {
          console.error('Move file failed:', e);
          window.App.showToast('移动文件失败，但元数据已更新', 'warning');
        }
      }

      doc.name = newName;
      doc.category = newCategory;
      doc.fileName = newFileName;
      doc.tags = editingTags;
      doc.note = newNote;
      doc.updatedAt = new Date().toISOString();

      data.updatedAt = new Date().toISOString();
      window.App.setData('documents', data);
      updateAllTags();
      closeModal();
      applyFilters();
      render();
      window.App.showToast('文件信息已更新', 'success');
    });
  }

  // ========== DELETE ==========

  async function deleteDoc(docId) {
    const doc = (data.documents || []).find(d => d.id === docId);
    if (!doc) return;

    const confirmed = await window.App.confirm('确定要删除文件 "' + doc.name + '" 吗？此操作不可恢复。');
    if (!confirmed) return;

    // Try to delete from disk
    if (window.App.dirHandle) {
      try {
        const parts = doc.fileName.split('/');
        let current = window.App.dirHandle;
        for (let i = 0; i < parts.length; i++) {
          if (i === parts.length - 1) {
            await current.removeEntry(parts[i]);
          } else {
            current = await current.getDirectoryHandle(parts[i]);
          }
        }
      } catch (e) {
        console.warn('Failed to delete file from disk:', e);
      }
    }

    data.documents = (data.documents || []).filter(d => d.id !== docId);
    data.updatedAt = new Date().toISOString();
    window.App.setData('documents', data);
    updateAllTags();
    applyFilters();
    render();
    window.App.showToast('文件已删除', 'success');
  }

  // ========== DOWNLOAD ==========

  async function downloadDoc(docId) {
    const doc = (data.documents || []).find(d => d.id === docId);
    if (!doc) return;

    const file = await getFileFromDisk(doc.fileName);
    if (!file) {
      window.App.showToast('文件读取失败', 'error');
      return;
    }

    const url = URL.createObjectURL(file);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.fileName.split('/').pop();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    window.App.showToast('开始下载: ' + doc.name, 'info');
  }

  // ========== DRAG & DROP ==========

  function setupDragDrop() {
    const container = document.getElementById('documents-content');
    if (!container) return;

    // We need to bind on the module content area
    const moduleEl = document.getElementById('module-documents');
    if (!moduleEl) return;

    moduleEl.addEventListener('dragover', (e) => {
      if (!moduleEl.classList.contains('active')) return;
      e.preventDefault();
      e.stopPropagation();
      moduleEl.style.boxShadow = 'inset 0 0 0 3px var(--blue)';
    });

    moduleEl.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      moduleEl.style.boxShadow = '';
    });

    moduleEl.addEventListener('drop', (e) => {
      if (!moduleEl.classList.contains('active')) return;
      e.preventDefault();
      e.stopPropagation();
      moduleEl.style.boxShadow = '';
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFileSelect(e.dataTransfer.files);
      }
    });
  }

  // ========== HTML ESCAPE ==========

  function escapeHtml(text) {
    if (text == null) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ========== INIT ==========

  function init() {
    const uploadBtn = document.getElementById('btnUploadDoc');
    if (uploadBtn) uploadBtn.addEventListener('click', handleUploadClick);

    setupDragDrop();

    // Load initial data
    const initial = window.App.getData('documents');
    if (initial) {
      data = initial;
      updateAllTags();
    }
  }

  // ========== REGISTER ==========

  registerModule('documents', {
    name: '文档库',
    init,
    render,
    onShow() { this.render(); },
    setData(d) {
      data = d || data;
      updateAllTags();
    }
  });
})();
