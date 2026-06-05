# 装修指挥官 — 执行计划

## 项目结构

```
/Users/jingwen/Documents/Kimi/Workspaces/装修/装修指挥官/
├── design/
│   └── design.md              ← 设计规范（已创建）
├── src/                       ← 开发阶段分模块代码（开发用）
│   ├── index.html             ← 最终单文件产品
│   ├── modules/
│   │   ├── core.js            ← 核心框架（导航、模块切换、File System API）
│   │   ├── board.js           ← 情绪板白板（复用+适配）
│   │   ├── documents.js       ← 文档库模块
│   │   ├── budget.js          ← 预算模块
│   │   ├── progress.js        ← 进度模块
│   │   ├── communications.js  ← 沟通模块
│   │   └── dashboard.js       ← 总览 Dashboard
│   └── styles.css             ← 全局样式
└── data/                      ← 运行时数据（用户使用时创建）
```

## 执行阶段

### Stage 1: 核心框架（主代理本地完成）
- 创建 index.html 骨架
- 实现顶部栏（Logo、项目名、用户切换、保存状态）
- 实现左侧导航（6个模块切换）
- 实现模块切换逻辑
- 实现 File System Access API 封装
- 实现数据层（JSON 读写、自动保存、首次引导）
- 全局 CSS 样式

### Stage 2: 情绪板模块（子代理 1）
- 复用已有白板代码
- 适配到产品框架中（嵌入主内容区）
- 增加自动保存到 data/board.json 的钩子
- 保留所有现有功能和 UI

### Stage 3: 功能模块并行（子代理 2-5）
- **子代理 2**: 文档库模块（文件上传、列表、预览、分类、标签）
- **子代理 3**: 预算模块（预算表格、支出记录、超支预警、统计图表）
- **子代理 4**: 进度模块（阶段时间线、照片上传、Tag 系统、筛选）
- **子代理 5**: 沟通模块（记录增删改、待办管理、待办看板）

### Stage 4: Dashboard + 集成（主代理本地完成）
- 实现总览 Dashboard（统计卡片、环形图、时间轴、近期动态）
- 集成所有子代理输出的模块代码
- 合并为单文件 index.html
- 验证运行

## 模块接口规范

### 模块注册接口

每个模块需要实现：

```javascript
// 模块注册
MODULES.register('board', {
  name: '情绪板',
  icon: '🎨',
  init: function() { /* 初始化模块 DOM */ },
  render: function() { /* 渲染模块内容 */ },
  onShow: function() { /* 切换到该模块时调用 */ },
  onHide: function() { /* 离开该模块时调用 */ },
  getData: function() { /* 返回模块数据对象，用于保存 */ },
  setData: function(data) { /* 从 JSON 加载数据 */ },
  isDirty: function() { /* 返回是否有未保存变更 */ }
});
```

### 全局数据接口

```javascript
// App 全局对象
window.App = {
  // 当前用户
  currentUser: { id: 'user_1', name: '你', avatar: '👩' },
  
  // 所有用户
  users: [
    { id: 'user_1', name: '你', avatar: '👩' },
    { id: 'user_2', name: '男朋友', avatar: '👨' }
  ],
  
  // 项目配置
  config: { projectName: '我们的家' },
  
  // 当前模块
  currentModule: 'dashboard',
  
  // 数据目录句柄（File System Access API）
  dirHandle: null,
  
  // 保存状态
  saveState: 'saved', // 'saved' | 'saving' | 'unsaved'
  
  // 全局方法
  switchUser: function(userId) { ... },
  switchModule: function(moduleId) { ... },
  saveData: async function() { ... },
  loadData: async function() { ... },
  showToast: function(msg, type) { ... },
  confirm: function(msg) { ... }
};
```

### CSS 命名规范

- 全局样式前缀：`app-`（如 `app-header`, `app-sidebar`）
- 模块样式前缀：模块 ID（如 `board-`, `doc-`, `budget-`）
- 白板内部保持原有类名（避免冲突用嵌套选择器）

## 数据文件映射

| 模块 | JSON 文件 | 数据对象键 |
|------|-----------|-----------|
| 全局配置 | `data/config.json` | `config` |
| 情绪板 | `data/board.json` | `board` |
| 文档库 | `data/documents.json` | `documents` |
| 预算 | `data/budget.json` | `budget` |
| 进度 | `data/progress.json` | `progress` |
| 沟通 | `data/communications.json` | `communications` |

## 颜色映射（PRD → Esther 设计系统）

| PRD 色值 | Esther 色值 | 用途 |
|----------|-------------|------|
| `#4A7CC9` | `#2B7FD8` | 主色调（蓝） |
| `#FFD93D` | `#F4D758` | 强调/警告（黄） |
| `#dc2626` | `#E84A5F` | 错误/滞后（红） |
| `#fefcf6` | `#fefcf6` | 背景（一致） |
| `#16a34a` | `#16a34a` | 成功/完成（绿，保留） |

## 子代理分工

### 子代理 1: 白板适配工程师
**任务**: 将已有白板代码适配到产品框架中
**输入**: 
- 已有白板代码 `/Users/jingwen/cola/outputs/无限白板工具-Miro-style/index.html`
- 核心框架接口规范
- 设计规范
**输出**: `modules/board.js`（纯 JS 模块代码）
**约束**:
- 不修改白板核心功能
- 增加 `createdBy` 和 `createdAt` 字段到卡片数据
- 增加 `getData()` / `setData()` 接口
- 自动保存钩子调用 `App.saveData()`
- 白板画布占满主内容区

### 子代理 2: 文档库模块工程师
**任务**: 实现文档库模块
**输入**:
- PRD 5.2 节
- 设计规范
- 全局接口
**输出**: `modules/documents.js` + 对应 CSS
**功能点**:
- 文件上传（拖拽 + 点击）
- 文件列表表格
- 分类筛选、标签筛选、搜索
- 文件预览（PDF embed、图片显示）
- 元数据编辑（名称、分类、标签、备注）

### 子代理 3: 预算模块工程师
**任务**: 实现预算模块
**输入**:
- PRD 5.3 节
- 设计规范
- 全局接口
**输出**: `modules/budget.js` + 对应 CSS
**功能点**:
- 预算总表（可编辑）
- 支出记录
- 超支预警（标色）
- 统计图表（CSS 条形图 + 饼图）

### 子代理 4: 进度模块工程师
**任务**: 实现进度模块
**输入**:
- PRD 5.4 节
- 设计规范
- 全局接口
**输出**: `modules/progress.js` + 对应 CSS
**功能点**:
- 6 阶段时间线卡片
- 照片上传（批量）
- Tag 系统（阶段/位置/性质）
- 筛选器
- 网格/时间线视图切换

### 子代理 5: 沟通模块工程师
**任务**: 实现沟通模块
**输入**:
- PRD 5.5 节
- 设计规范
- 全局接口
**输出**: `modules/communications.js` + 对应 CSS
**功能点**:
- 沟通记录列表（卡片式）
- 记录详情/编辑
- 待办管理（增删改）
- 待办看板（三列）

## 集成顺序

1. 主代理完成核心框架（index.html 骨架 + CSS + core.js）
2. 并行分派 5 个子代理
3. 子代理完成后，主代理收集输出
4. 主代理将各模块代码嵌入 index.html
5. 验证运行

## 验证清单

- [ ] Chrome 中打开 index.html 能正常运行
- [ ] 首次使用引导流程完整
- [ ] 6 个模块切换正常
- [ ] 情绪板功能完整（便签、图片、连线、画笔、导图）
- [ ] 文档库能上传、列表、预览
- [ ] 预算能增删改、自动计算、超支标色
- [ ] 进度 6 阶段时间线正常
- [ ] 沟通记录和待办看板正常
- [ ] Dashboard 统计卡片显示正确
- [ ] 用户切换正常
- [ ] 数据保存到 JSON 正常
