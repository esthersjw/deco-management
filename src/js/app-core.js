// ==================== SUPABASE CONFIG ====================
const SUPABASE_URL = 'https://morpcqavnwnzradgtnlv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1vcnBjcWF2bnduenJhZGd0bmx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3MTMwNjgsImV4cCI6MjA5NjI4OTA2OH0.KerqoGtG2csNBHPMRyRtY_diyeP6k1pM0FLBAYqJ5Fg';

// ==================== CORE FRAMEWORK ====================

// Module registry
const MODULES = {};
const moduleData = {};
let currentModule = 'dashboard';

// Default config
const DEFAULT_CONFIG = {
  projectName: '我们的家',
  users: [
    { id: 'user_1', name: '我', avatar: '👩' },
    { id: 'user_2', name: '伴侣', avatar: '👨' }
  ],
  currentUserId: 'user_1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  version: '1.0'
};

// Default data for all modules
const DEFAULT_DATA = {
  config: DEFAULT_CONFIG,
  documents: { version: '1.0', updatedAt: new Date().toISOString(), documents: [], categories: ['合同', '报价单', '设计图', '收据', '其他'] },
  budget: { version: '1.0', updatedAt: new Date().toISOString(), currency: 'CNY', totalBudget: 0, items: [], payments: [] },
  progress: { version: '1.0', updatedAt: new Date().toISOString(), phases: [
    { id: 'phase_1', name: '拆除', order: 1, plannedStart: '', plannedEnd: '', actualStart: '', actualEnd: '', status: '未开始', progress: 0, note: '' },
    { id: 'phase_2', name: '水电', order: 2, plannedStart: '', plannedEnd: '', actualStart: '', actualEnd: '', status: '未开始', progress: 0, note: '' },
    { id: 'phase_3', name: '泥瓦', order: 3, plannedStart: '', plannedEnd: '', actualStart: '', actualEnd: '', status: '未开始', progress: 0, note: '' },
    { id: 'phase_4', name: '木工', order: 4, plannedStart: '', plannedEnd: '', actualStart: '', actualEnd: '', status: '未开始', progress: 0, note: '' },
    { id: 'phase_5', name: '油漆', order: 5, plannedStart: '', plannedEnd: '', actualStart: '', actualEnd: '', status: '未开始', progress: 0, note: '' },
    { id: 'phase_6', name: '安装', order: 6, plannedStart: '', plannedEnd: '', actualStart: '', actualEnd: '', status: '未开始', progress: 0, note: '' }
  ], currentPhaseId: null },
  communications: { version: '1.0', updatedAt: new Date().toISOString(), records: [] },
  materials: { version: '1.0', updatedAt: new Date().toISOString(), items: [], categories: ['瓷砖', '地板', '涂料/油漆', '五金', '灯具', '洁具/卫浴', '门窗', '定制柜', '家电', '家具', '软装', '其他'] },
  contacts: { version: '1.0', updatedAt: new Date().toISOString(), contacts: [] }
};

// App global object
window.App = {
  supabase: null,
  currentUser: null,
  currentProject: null,
  availableProjects: [],
  projectMembers: [],
  users: DEFAULT_CONFIG.users,
  config: DEFAULT_CONFIG,
  currentModule: 'dashboard',
  saveState: 'saved',

  // 初始化 Supabase
  async initSupabase() {
    this.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    // 检查当前会话
    const { data: { session } } = await this.supabase.auth.getSession();
    if (session) {
      this.currentUser = session.user;
      await this.loadUserProfile();
      await this.loadOrCreateProject();
      this.hideAuth();
      this.initRealtime();
    } else {
      this.showAuth();
    }
  },

  // 登录
  async signIn(email, password) {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    this.currentUser = data.user;
    await this.loadUserProfile();
    await this.loadOrCreateProject();
    this.hideAuth();
    this.initRealtime();
    return data;
  },

  // 注册
  async signUp(email, password) {
    const { data, error } = await this.supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  },

  // 退出
  async signOut() {
    await this.supabase.auth.signOut();
    this.currentUser = null;
    this.currentProject = null;
    this.showAuth();
  },

  // 加载用户资料
  async loadUserProfile() {
    const { data } = await this.supabase.from('profiles').select('*').eq('id', this.currentUser.id).single();
    if (data) this.currentUser.profile = data;
  },

  // 加载或创建项目
  async loadOrCreateProject() {
    const projects = await this.loadAccessibleProjects();
    if (projects.length > 0) {
      const storageKey = `deco_current_project_id_${this.currentUser.id}`;
      const savedProjectId = localStorage.getItem(storageKey);
      this.currentProject = projects.find(project => project.id === savedProjectId)
        || projects.find(project => project.accessType === 'shared')
        || projects[0];
      localStorage.setItem(storageKey, this.currentProject.id);
    } else {
      const { data: newProject, error: createError } = await this.supabase.from('projects').insert({
        name: '我的装修项目',
        owner_id: this.currentUser.id
      }).select().single();
      if (createError) throw createError;
      this.currentProject = { ...newProject, accessType: 'owner', role: 'owner' };
      this.availableProjects = [this.currentProject];
      localStorage.setItem(`deco_current_project_id_${this.currentUser.id}`, this.currentProject.id);
    }
    await this.loadProjectMembers();
    updateProjectName();
    await this.loadAllData();
  },

  async loadAccessibleProjects() {
    const { data: ownedProjects, error: ownedError } = await this.supabase
      .from('projects')
      .select('*')
      .eq('owner_id', this.currentUser.id)
      .order('created_at', { ascending: true });
    if (ownedError) throw ownedError;

    const { data: memberRows, error: memberError } = await this.supabase
      .from('project_members')
      .select('role, projects(*)')
      .eq('user_id', this.currentUser.id)
      .order('created_at', { ascending: true });
    if (memberError) throw memberError;

    const projectMap = new Map();
    (ownedProjects || []).forEach(project => {
      projectMap.set(project.id, { ...project, accessType: 'owner', role: 'owner' });
    });
    (memberRows || []).forEach(row => {
      if (row.projects && !projectMap.has(row.projects.id)) {
        projectMap.set(row.projects.id, { ...row.projects, accessType: 'shared', role: row.role || 'editor' });
      }
    });
    this.availableProjects = Array.from(projectMap.values());
    return this.availableProjects;
  },

  async switchProject(projectId) {
    const projects = this.availableProjects.length ? this.availableProjects : await this.loadAccessibleProjects();
    const nextProject = projects.find(project => project.id === projectId);
    if (!nextProject) throw new Error('没有权限打开这个项目');
    this.currentProject = nextProject;
    localStorage.setItem(`deco_current_project_id_${this.currentUser.id}`, nextProject.id);
    await this.loadProjectMembers();
    updateProjectName();
    await this.loadAllData();
    this.initRealtime();
  },

  async loadProjectMembers() {
    if (!this.currentProject) {
      this.projectMembers = [];
      return [];
    }
    const { data: members, error } = await this.supabase
      .from('project_members')
      .select('id, role, created_at, user_id')
      .eq('project_id', this.currentProject.id)
      .order('created_at', { ascending: true });
    if (error) {
      console.warn('Load project members failed', error);
      this.projectMembers = [];
      return [];
    }
    const userIds = [...new Set((members || []).map(member => member.user_id).filter(Boolean))];
    let profilesById = {};
    if (userIds.length) {
      const { data: profiles, error: profilesError } = await this.supabase
        .from('profiles')
        .select('id, email, display_name')
        .in('id', userIds);
      if (profilesError) console.warn('Load member profiles failed', profilesError);
      profilesById = Object.fromEntries((profiles || []).map(profile => [profile.id, profile]));
    }
    this.projectMembers = (members || []).map(member => ({
      ...member,
      profile: profilesById[member.user_id] || null
    }));
    return this.projectMembers;
  },

  async inviteProjectMember(email, role = 'editor') {
    if (!this.currentProject) throw new Error('请先打开项目');
    if (this.currentProject.owner_id !== this.currentUser.id) throw new Error('只有项目创建者可以邀请成员');
    const normalizedEmail = (email || '').trim().toLowerCase();
    if (!normalizedEmail) throw new Error('请输入对方注册邮箱');
    if (normalizedEmail === (this.currentUser.email || '').toLowerCase()) throw new Error('不能邀请自己');

    const { data: profileRows, error: profileError } = await this.supabase
      .rpc('find_profile_for_invite', { invitee_email: normalizedEmail });
    if (profileError) throw profileError;
    const profile = Array.isArray(profileRows) ? profileRows[0] : null;
    if (!profile) throw new Error('暂时不能邀请这个邮箱。请确认对方已经注册并完成邮箱验证。');

    const { data, error } = await this.supabase
      .from('project_members')
      .upsert({
        project_id: this.currentProject.id,
        user_id: profile.id,
        role,
        invited_by: this.currentUser.id
      }, { onConflict: 'project_id,user_id' })
      .select('id, role, created_at, user_id')
      .single();
    if (error) throw error;
    await this.loadProjectMembers();
    return data;
  },

  // 从 Supabase 加载所有模块数据
  async loadAllData() {
    if (!this.currentProject) return;
    
    // Load module_data records
    const { data: moduleRecords } = await this.supabase
      .from('module_data')
      .select('*')
      .eq('project_id', this.currentProject.id);
    
    const recordMap = {};
    (moduleRecords || []).forEach(r => {
      recordMap[r.module_key] = r.data;
    });
    
    // Fill moduleData
    for (const key of Object.keys(DEFAULT_DATA)) {
      if (recordMap[key]) {
        moduleData[key] = recordMap[key];
      } else {
        moduleData[key] = JSON.parse(JSON.stringify(DEFAULT_DATA[key]));
      }
      if (MODULES[key] && MODULES[key].setData) {
        MODULES[key].setData(moduleData[key]);
      }
    }
    
    // Config
    if (recordMap.config) {
      this.config = recordMap.config;
      this.users = this.config.users || DEFAULT_CONFIG.users;
    } else {
      moduleData.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
      this.config = moduleData.config;
      this.users = this.config.users;
    }
    
    updateUserUI();
    updateProjectName();
    
    // 数据加载完成后，渲染当前活动模块
    const activeModule = document.querySelector('.module-content.active');
    if (activeModule) {
      const moduleId = activeModule.id.replace('module-', '');
      if (MODULES[moduleId] && MODULES[moduleId].render) {
        MODULES[moduleId].render();
      }
    }
  },

  // 保存模块数据到 Supabase
  async syncModuleData(key, data) {
    if (!this.currentProject || !this.supabase) return;
    try {
      await this.supabase.from('module_data').upsert({
        project_id: this.currentProject.id,
        module_key: key,
        data: data,
        updated_at: new Date().toISOString()
      }, { onConflict: 'project_id,module_key' });
    } catch (e) {
      console.warn('Sync failed for ' + key, e);
    }
  },

  // 初始化 Realtime 订阅
  initRealtime() {
    if (!this.currentProject) return;
    this.supabase.channel('module_data')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'module_data', 
        filter: `project_id=eq.${this.currentProject.id}` 
      }, payload => {
        this.handleRealtimeChange(payload);
      })
      .subscribe();
  },

  handleRealtimeChange(payload) {
    const key = payload.new?.module_key || payload.old?.module_key;
    if (!key) return;
    // Reload data and refresh UI
    this.loadAllData().then(() => {
      const moduleMap = {
        'documents': 'documents',
        'budget': 'budget',
        'progress': 'progress',
        'communications': 'communications'
      };
      const moduleId = moduleMap[key];
      if (moduleId && MODULES[moduleId] && MODULES[moduleId].render) {
        MODULES[moduleId].render();
      }
    });
    this.showToast('数据已同步', 'info');
  },

  // 通用数据操作方法
  async query(table, options = {}) {
    if (!this.currentProject) return { data: [], error: null };
    let q = this.supabase.from(table).select(options.select || '*').eq('project_id', this.currentProject.id);
    if (options.order) q = q.order(options.order.column, { ascending: options.order.ascending });
    if (options.limit) q = q.limit(options.limit);
    const { data, error } = await q;
    return { data: data || [], error };
  },

  async insert(table, record) {
    if (!this.currentProject) return { data: null, error: new Error('No project') };
    record.project_id = this.currentProject.id;
    record.created_by = this.currentUser.id;
    const { data, error } = await this.supabase.from(table).insert(record).select().single();
    return { data, error };
  },

  async update(table, id, record) {
    const { data, error } = await this.supabase.from(table).update(record).eq('id', id).select().single();
    return { data, error };
  },

  async delete(table, id) {
    const { error } = await this.supabase.from(table).delete().eq('id', id);
    return { error };
  },

  // 文件上传到 Storage
  async uploadFile(bucket, filePath, file) {
    if (!this.supabase) return { error: new Error('Supabase 未初始化') };
    if (!this.currentUser || !this.currentProject) return { error: new Error('请先登录并打开项目') };
    const { data, error } = await this.supabase.storage.from(bucket).upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });
    if (error) {
      const detail = error.message || error.error || error.statusCode || JSON.stringify(error);
      const hints = [
        ['Bucket not found', `Storage bucket 不存在：${bucket}，请执行 fix-storage-rls.sql`],
        ['new row violates row-level security policy', `Storage RLS 拒绝上传：${bucket}，请执行 fix-storage-rls.sql`],
        ['row-level security policy', `Storage RLS 拒绝上传：${bucket}，请执行 fix-storage-rls.sql`],
      ];
      const match = hints.find(([needle]) => detail.includes(needle));
      const message = match ? match[1] : `${bucket} 上传失败：${detail}`;
      console.error('Storage upload failed:', { bucket, filePath, fileName: file?.name, fileType: file?.type, error });
      return { error: new Error(message) };
    }
    const { data: { publicUrl } } = this.supabase.storage.from(bucket).getPublicUrl(data.path);
    return { url: publicUrl, error: null };
  },

  showAuth() {
    const overlay = document.getElementById('authOverlay');
    if (overlay) overlay.style.display = 'flex';
    const appContainer = document.querySelector('.app-container');
    if (appContainer) appContainer.style.display = 'none';
    const userSwitcher = document.getElementById('userSwitcher');
    if (userSwitcher) userSwitcher.style.display = 'none';
  },

  hideAuth() {
    const overlay = document.getElementById('authOverlay');
    if (overlay) overlay.style.display = 'none';
    const appContainer = document.querySelector('.app-container');
    if (appContainer) appContainer.style.display = 'block';
    const userSwitcher = document.getElementById('userSwitcher');
    if (userSwitcher) userSwitcher.style.display = 'block';
  },

  switchModule(moduleId) {
    if (moduleId === currentModule) return;
    const prevModule = currentModule;
    document.querySelectorAll('.module-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.mobile-nav-item').forEach(el => el.classList.remove('active'));
    const moduleEl = document.getElementById('module-' + moduleId);
    if (moduleEl) moduleEl.classList.add('active');
    const navEl = document.getElementById('nav-' + moduleId);
    if (navEl) navEl.classList.add('active');
    document.querySelectorAll('.mobile-nav-item[data-module="' + moduleId + '"]').forEach(el => el.classList.add('active'));
    currentModule = moduleId;
    this.currentModule = moduleId;
    if (MODULES[prevModule] && MODULES[prevModule].onHide) MODULES[prevModule].onHide();
    if (MODULES[moduleId] && MODULES[moduleId].onShow) MODULES[moduleId].onShow();
  },

  async saveData() {
    // Cloud sync: data saved per-operation via setData
    updateSaveStatus('saved');
  },

  scheduleSave() {
    // Cloud sync: no local timer needed
  },

  async loadData() {
    // Data loaded via loadAllData
  },

  showToast(msg, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  confirm(msg) {
    return new Promise(resolve => {
      const overlay = document.getElementById('modalOverlay');
      const content = document.getElementById('modalContent');
      content.innerHTML = `
        <div class="modal-header">
          <div class="modal-title">确认</div>
          <button class="modal-close" onclick="closeModal()">×</button>
        </div>
        <div class="modal-body" id="confirmMessage"></div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="closeModal();window._confirmResult=false;">取消</button>
          <button class="btn btn-primary" onclick="closeModal();window._confirmResult=true;">确认</button>
        </div>
      `;
      const messageEl = document.getElementById('confirmMessage');
      if (messageEl) messageEl.textContent = String(msg || '');
      overlay.classList.add('show');
      window._confirmResult = null;
      const check = setInterval(() => {
        if (window._confirmResult !== null) {
          clearInterval(check);
          resolve(window._confirmResult);
        }
      }, 100);
    });
  },

  getData(key) {
    return moduleData[key] || JSON.parse(JSON.stringify(DEFAULT_DATA[key]));
  },

  setData(key, data) {
    moduleData[key] = data;
    this.syncModuleData(key, data);
  }
};

function getCurrentUser() {
  if (!window.App) return { id: 'user_1', name: '我', avatar: '👩' };
  const users = App.config?.users || App.users || DEFAULT_CONFIG.users;
  const currentId = App.config?.currentUserId || 'user_1';
  return users.find(u => u.id === currentId) || users[0] || { id: 'user_1', name: '我', avatar: '👩' };
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('show');
}

function escapeHtml(text) {
  if (text == null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function updateSaveStatus(status) {
  const el = document.getElementById('saveStatus');
  const icon = document.getElementById('saveIcon');
  const text = document.getElementById('saveText');
  el.className = 'save-status ' + status;
  App.saveState = status;
  if (status === 'saved') { icon.textContent = '☁️'; text.textContent = '已同步'; }
  else if (status === 'saving') { icon.textContent = '🟡'; text.textContent = '同步中...'; }
  else { icon.textContent = '🔴'; text.textContent = '未同步'; }
}

function updateUserUI() {
  const userSwitcher = document.getElementById('userSwitcher');
  if (!App.currentUser) {
    if (userSwitcher) userSwitcher.style.display = 'none';
    return;
  }
  if (userSwitcher) userSwitcher.style.display = 'block';
  
  const avatar = App.currentUser.profile?.avatar || '👤';
  const name = App.currentUser.profile?.name || App.currentUser.email?.split('@')[0] || '用户';
  document.getElementById('currentUserAvatar').textContent = avatar;
  document.getElementById('currentUserName').textContent = name;
}

function updateProjectName() {
  const name = App.currentProject?.name || App.config?.projectName || '我们的家';
  document.getElementById('projectNameDisplay').textContent = '— ' + name;
}

// Auth overlay event bindings
function initAuthEvents() {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const authError = document.getElementById('authError');
  
  function showError(msg) {
    authError.textContent = msg;
    authError.style.display = 'block';
  }
  
  function clearError() {
    authError.style.display = 'none';
    authError.textContent = '';
  }
  
  document.getElementById('showRegister').addEventListener('click', (e) => {
    e.preventDefault();
    clearError();
    loginForm.style.display = 'none';
    registerForm.style.display = 'block';
  });
  
  document.getElementById('showLogin').addEventListener('click', (e) => {
    e.preventDefault();
    clearError();
    registerForm.style.display = 'none';
    loginForm.style.display = 'block';
  });
  
  document.getElementById('btnLogin').addEventListener('click', async () => {
    clearError();
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    if (!email || !password) {
      showError('请填写邮箱和密码');
      return;
    }
    try {
      await App.signIn(email, password);
      App.showToast('登录成功', 'success');
    } catch (e) {
      showError(e.message || '登录失败');
    }
  });
  
  document.getElementById('btnRegister').addEventListener('click', async () => {
    clearError();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirm = document.getElementById('registerConfirmPassword').value;
    if (!email || !password) {
      showError('请填写邮箱和密码');
      return;
    }
    if (password.length < 8) {
      showError('密码至少8位');
      return;
    }
    if (password !== confirm) {
      showError('两次输入的密码不一致');
      return;
    }
    try {
      await App.signUp(email, password);
      showError('注册成功！请查收邮件确认后登录');
      registerForm.style.display = 'none';
      loginForm.style.display = 'block';
    } catch (e) {
      showError(e.message || '注册失败');
    }
  });
  
  // Sign out
  document.getElementById('userSignOutOption').addEventListener('click', async () => {
    document.getElementById('userDropdown').classList.remove('show');
    await App.signOut();
    App.showToast('已退出登录', 'info');
  });
}

document.getElementById('userSwitcherBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  document.getElementById('userDropdown').classList.toggle('show');
});
document.addEventListener('click', () => {
  document.getElementById('userDropdown').classList.remove('show');
});

document.querySelectorAll('.nav-item[data-module], .mobile-nav-item[data-module]').forEach(item => {
  item.addEventListener('click', () => App.switchModule(item.dataset.module));
});

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    App.saveData();
  }
});

// ==================== MODULE REGISTRATION ====================

function registerModule(id, module) {
  MODULES[id] = module;
  if (module.init) module.init();
  if (moduleData[id] && module.setData) module.setData(moduleData[id]);
  if (currentModule === id && module.render) module.render();
}

// ==================== INIT ====================

window.addEventListener('DOMContentLoaded', () => {
  // 设置按钮事件绑定
  document.getElementById('settingsBtn').addEventListener('click', async () => {
    const overlay = document.getElementById('modalOverlay');
    const content = document.getElementById('modalContent');
    const userName = App.currentUser?.profile?.name || App.currentUser?.email?.split('@')[0] || '用户';
    await App.loadAccessibleProjects();
    await App.loadProjectMembers();
    const isProjectOwner = App.currentProject?.owner_id === App.currentUser?.id;
    
    // 生成家庭成员列表HTML
    const users = App.config.users || DEFAULT_CONFIG.users;
    const currentOpId = App.config.currentUserId || 'user_1';
    
    function generateUserRows() {
      return users.map((u, idx) => `
        <div class="settings-user-row" data-user-id="${u.id}">
          <div class="settings-user-avatar">
            <select class="app-input settings-avatar-select" data-idx="${idx}">
              ${['👩','👨','👧','👦','👵','👴','🧑','🧒','🐱','🐶','🌸','⭐','🏠','💼'].map(emoji => 
                `<option value="${emoji}" ${u.avatar === emoji ? 'selected' : ''}>${emoji}</option>`
              ).join('')}
            </select>
          </div>
          <div class="settings-user-name">
            <input type="text" class="app-input settings-name-input" data-idx="${idx}" value="${escapeHtml(u.name)}" placeholder="姓名">
          </div>
          <button class="btn btn-icon settings-user-delete" data-idx="${idx}" ${users.length <= 1 ? 'disabled' : ''} title="删除">
            🗑️
          </button>
        </div>
      `).join('');
    }
    
    function generateAccountMemberRows() {
      const ownerEmail = App.currentUser?.email || '当前账号';
      const rows = [
        `<div class="settings-user-row"><div class="settings-user-name"><strong>${escapeHtml(ownerEmail)}</strong><div style="font-size:0.75rem;color:var(--ink-light)">创建者 / owner</div></div></div>`,
        ...(App.projectMembers || []).map(member => {
          const profile = member.profile || {};
          const email = profile.email || profile.display_name || member.user_id;
          const roleLabel = member.role === 'viewer' ? '只读成员' : '可编辑成员';
          return `<div class="settings-user-row"><div class="settings-user-name"><strong>${escapeHtml(email)}</strong><div style="font-size:0.75rem;color:var(--ink-light)">${roleLabel}</div></div></div>`;
        })
      ];
      return rows.join('');
    }

    content.innerHTML = `
      <div class="modal-header">
        <div class="modal-title">🔧 设置</div>
        <button class="modal-close" onclick="closeModal()">×</button>
      </div>
      <div class="modal-body">
        <!-- 当前项目 -->
        <div style="margin-bottom:20px">
          <label style="display:block;font-size:0.8rem;color:var(--ink-light);margin-bottom:6px;font-weight:600">当前项目</label>
          <select class="app-input" id="settingCurrentProject">
            ${(App.availableProjects || []).map(project => {
              const tag = project.accessType === 'shared' ? '共享' : '我的';
              return `<option value="${project.id}" ${project.id === App.currentProject?.id ? 'selected' : ''}>${escapeHtml(project.name || '未命名项目')} · ${tag}</option>`;
            }).join('')}
          </select>
          <div style="font-size:0.75rem;color:var(--ink-light);margin-top:4px">如果对方已经有一个空项目，可以在这里切到你共享给他的项目。</div>
        </div>

        <!-- 项目名称 -->
        <div style="margin-bottom:20px">
          <label style="display:block;font-size:0.8rem;color:var(--ink-light);margin-bottom:6px;font-weight:600">小家名称</label>
          <input type="text" class="app-input" id="settingProjectName" value="${App.currentProject?.name || App.config.projectName || '我们的家'}" placeholder="给我们的家起个名字" ${isProjectOwner ? '' : 'disabled'}>
          ${isProjectOwner ? '' : '<div style="font-size:0.75rem;color:var(--ink-light);margin-top:4px">共享成员不能改项目名称。</div>'}
        </div>
        
        <!-- 当前操作人 -->
        <div style="margin-bottom:20px">
          <label style="display:block;font-size:0.8rem;color:var(--ink-light);margin-bottom:6px;font-weight:600">当前操作人</label>
          <select class="app-input" id="settingCurrentUser">
            ${users.map(u => `<option value="${u.id}" ${u.id === currentOpId ? 'selected' : ''}>${u.avatar} ${escapeHtml(u.name)}</option>`).join('')}
          </select>
          <div style="font-size:0.75rem;color:var(--ink-light);margin-top:4px">切换后，新增的记录将标记为此人</div>
        </div>
        
        <!-- 家庭成员管理 -->
        <div style="margin-bottom:16px">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <label style="font-size:0.8rem;color:var(--ink-light);font-weight:600">家庭成员</label>
            <button class="btn btn-secondary btn-sm" id="btnAddMember" style="font-size:0.8rem;padding:4px 10px">
              + 添加成员
            </button>
          </div>
          <div id="settingsUsersList" style="display:flex;flex-direction:column;gap:8px">
            ${generateUserRows()}
          </div>
        </div>
        
        <!-- 项目共享账号 -->
        <div style="margin-top:20px;padding-top:16px;border-top:1px solid rgba(26,26,26,0.06)">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;gap:12px">
            <label style="font-size:0.8rem;color:var(--ink-light);font-weight:600">项目共享账号</label>
            ${isProjectOwner ? '<span style="font-size:0.72rem;color:var(--ink-light)">对方必须先注册</span>' : '<span style="font-size:0.72rem;color:var(--ink-light)">只有创建者可邀请</span>'}
          </div>
          <div id="accountMembersList" style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px">
            ${generateAccountMemberRows()}
          </div>
          ${isProjectOwner ? `
            <div style="display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center">
              <input type="email" class="app-input" id="inviteMemberEmail" placeholder="输入对方注册邮箱">
              <button class="btn btn-primary btn-sm" id="btnInviteAccountMember">邀请</button>
            </div>
            <div style="font-size:0.75rem;color:var(--ink-light);margin-top:6px">邀请成功后，对方重新登录就会看到这个项目。</div>
          ` : ''}
        </div>

        <!-- 登录账号信息 -->
        <div style="margin-top:20px;padding-top:16px;border-top:1px solid rgba(26,26,26,0.06)">
          <label style="display:block;font-size:0.8rem;color:var(--ink-light);margin-bottom:6px;font-weight:600">当前登录账号</label>
          <div class="app-input" style="background:var(--cream-deep);font-size:0.85rem">${App.currentUser?.email || userName}</div>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeModal()">取消</button>
        <button class="btn btn-primary" id="btnSaveSettings">保存</button>
      </div>
    `;
    
    // 添加成员按钮事件
    document.getElementById('btnAddMember').addEventListener('click', () => {
      const newId = 'user_' + (Date.now().toString(36) + Math.random().toString(36).slice(2, 5));
      users.push({ id: newId, name: '新成员', avatar: '🧑' });
      refreshUserRows();
    });
    
    // 刷新用户列表
    function refreshUserRows() {
      const container = document.getElementById('settingsUsersList');
      container.innerHTML = generateUserRows();
      bindUserRowEvents();
      
      // 更新当前操作人下拉框
      const currentSelect = document.getElementById('settingCurrentUser');
      const currentVal = currentSelect.value;
      currentSelect.innerHTML = users.map(u => `<option value="${u.id}" ${u.id === currentVal ? 'selected' : ''}>${u.avatar} ${escapeHtml(u.name)}</option>`).join('');
    }
    
    // 绑定用户行事件
    function bindUserRowEvents() {
      // 删除按钮
      document.querySelectorAll('.settings-user-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const idx = parseInt(e.target.dataset.idx);
          if (users.length > 1) {
            users.splice(idx, 1);
            refreshUserRows();
          }
        });
      });
    }
    
    bindUserRowEvents();
    const inviteBtn = document.getElementById('btnInviteAccountMember');
    if (inviteBtn) {
      inviteBtn.addEventListener('click', async () => {
        const input = document.getElementById('inviteMemberEmail');
        const email = input.value.trim();
        inviteBtn.disabled = true;
        inviteBtn.textContent = '邀请中...';
        try {
          await App.inviteProjectMember(email, 'editor');
          document.getElementById('accountMembersList').innerHTML = generateAccountMemberRows();
          input.value = '';
          App.showToast('已邀请成员加入项目', 'success');
        } catch (e) {
          App.showToast(e.message || '邀请失败', 'error');
        } finally {
          inviteBtn.disabled = false;
          inviteBtn.textContent = '邀请';
        }
      });
    }
    overlay.classList.add('show');

    document.getElementById('btnSaveSettings').addEventListener('click', async () => {
      const selectedProjectId = document.getElementById('settingCurrentProject')?.value;
      if (selectedProjectId && selectedProjectId !== App.currentProject?.id) {
        await App.switchProject(selectedProjectId);
        closeModal();
        App.showToast('已切换项目', 'success');
        return;
      }

      // 收集用户数据
      const nameInputs = document.querySelectorAll('.settings-name-input');
      const avatarSelects = document.querySelectorAll('.settings-avatar-select');
      
      const newUsers = [];
      nameInputs.forEach((input, idx) => {
        const name = input.value.trim() || '未命名';
        const avatar = avatarSelects[idx]?.value || '🧑';
        const id = users[idx]?.id || ('user_' + Date.now().toString(36));
        newUsers.push({ id, name, avatar });
      });
      
      // 更新配置
      App.config.users = newUsers;
      App.users = newUsers;
      App.config.currentUserId = document.getElementById('settingCurrentUser').value || newUsers[0]?.id;
      
      // 项目名称
      const newName = document.getElementById('settingProjectName').value || '我们的家';
      App.config.projectName = newName;
      if (App.currentProject && App.currentProject.owner_id === App.currentUser.id) {
        await App.update('projects', App.currentProject.id, { name: newName });
        App.currentProject.name = newName;
      }
      
      updateProjectName();
      App.setData('config', App.config);
      closeModal();
      App.showToast('设置已保存', 'success');
      
      // 刷新当前模块以应用新用户名称
      const activeModule = document.querySelector('.module-content.active');
      if (activeModule) {
        const moduleId = activeModule.id.replace('module-', '');
        if (MODULES[moduleId] && MODULES[moduleId].render) {
          MODULES[moduleId].render();
        }
      }
    });
  });

  initAuthEvents();
  App.initSupabase();
});

// ==================== MODULE PLACEHOLDERS ====================
