# 装修指挥官 — 设计规范

> 基于 Esther 设计系统 + PRD v1.0
> 类型：App型 / 功能型单页应用
> 输出：单文件 index.html（纯 HTML+CSS+JS，零依赖）

---

## 1. 品牌基因

### 1.1 三色系统（融合 PRD 与 Esther 规范）

| 色名 | 色值 | 比例 | 用途 |
|------|------|------|------|
| 蓝 | `#2B7FD8` | 60% | 主色调、导航选中、按钮、链接、重点标记 |
| 黄/金 | `#F4D758` | 30% | 强调、装饰、badges、高亮、便签默认色 |
| 红 | `#E84A5F` | 10% | 点缀、删除/警告、超支提醒、逾期标记 |

**扩展色（功能状态）**：
- 成功/完成：`#16a34a`（绿色）
- 警告/超支：`#F4D758`（黄色，与品牌黄一致）
- 错误/滞后：`#E84A5F`（红色，与品牌红一致）
- 未开始/灰色：`#888`

### 1.2 背景色阶

| 场景 | 色值 |
|------|------|
| 全局背景 | `#fefcf6`（奶油暖底） |
| 卡片背景 | `#fff` |
| 深色面板（仅 Dashboard 统计卡片） | `#151821` |
| 输入框背景 | `#fff` |
| 悬停背景 | `rgba(43,127,216,0.06)` |

### 1.3 文字色阶

| 用途 | 色值 |
|------|------|
| 主文字 | `#1A1A2E`（墨色，非纯黑） |
| 次要文字 | `#4A4A5A` |
| 辅助/占位 | `#888` |
| 反白文字（深色底） | `#fefcf6` |

---

## 2. 字体系统

### 2.1 字体栈

| 用途 | 字体 |
|------|------|
| 中文标题 | `Noto Serif SC`, `Songti SC`, serif |
| 中文正文 | `-apple-system`, `BlinkMacSystemFont`, `'Noto Sans SC'`, `PingFang SC`, `Helvetica Neue`, sans-serif |
| 英文装饰 | `Fraunces` italic（如可用） |
| 手写/便签 | `Caveat`, cursive |
| 等宽/代码 | `Fira Code`, `SF Mono`, Menlo, monospace |

### 2.2 字号系统（App 页面简化）

| 元素 | 字号 | 说明 |
|------|------|------|
| 产品标题 | `1.1rem` | 顶部栏，加粗 |
| 模块标题 | `1.05rem` | 当前模块名 |
| 卡片标题 | `0.95rem` | 卡片内标题 |
| 正文 | `14px` | 列表、表格内容 |
| 辅助文字 | `0.78rem ~ 0.85rem` | 标签、时间、状态 |
| 大数字（Dashboard） | `clamp(1.8rem, 4vw, 2.6rem)` | 统计数字 |

**App 页面约束**：标题控制在 `1.2rem` 以内，不用超大标题。

---

## 3. 布局架构

### 3.1 整体布局

```
┌─────────────────────────────────────────────────────────────┐
│  🏠 装修指挥官 — 我们的家          [👩 你 ▼]  [💾 已保存]  │  ← Top Bar (48px)
├──────────┬──────────────────────────────────────────────────┤
│          │                                                  │
│  🎨      │              主内容区域                          │
│  情绪板   │         （根据左侧导航切换不同模块）              │
│  📁      │                                                  │
│  文档库   │                                                  │
│  💰      │                                                  │
│  预算    │                                                  │
│  📅      │                                                  │
│  进度    │                                                  │
│  💬      │                                                  │
│  沟通    │                                                  │
│  ─────── │                                                  │
│  📊      │                                                  │
│  总览    │                                                  │
│          │                                                  │
└──────────┴──────────────────────────────────────────────────┘
         ↑
    左侧导航 (200px)
```

### 3.2 尺寸规范

| 元素 | 尺寸 |
|------|------|
| 顶部栏高度 | `48px` |
| 左侧导航宽度 | `200px` |
| 导航项高度 | `44px` |
| 主内容区 padding | `24px` |
| 卡片圆角 | `12px` |
| 按钮圆角 | `10px` |
| 输入框圆角 | `8px` |

---

## 4. 组件规范

### 4.1 导航项

```css
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 0.9rem;
  color: #4A4A5A;
  cursor: pointer;
  transition: all 0.18s;
  margin: 2px 8px;
}
.nav-item:hover {
  background: rgba(43,127,216,0.06);
}
.nav-item.active {
  background: #2B7FD8;
  color: #fff;
  font-weight: 600;
}
```

### 4.2 卡片（App 型）

```css
.app-card {
  background: #fff;
  border-radius: 12px;
  padding: 1.25rem;
  box-shadow: 0 2px 12px rgba(0,0,0,.04);
  transition: transform .2s, box-shadow .2s;
}
.app-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0,0,0,.08);
}
```

### 4.3 按钮

**主按钮**：
```css
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 16px;
  border-radius: 10px;
  border: none;
  background: #2B7FD8;
  color: #fff;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all .18s;
}
.btn-primary:hover {
  background: #1e6bc0;
  transform: translateY(-1px);
}
```

**次要按钮**：
```css
.btn-secondary {
  background: transparent;
  border: 1.5px solid rgba(43,127,216,0.25);
  color: #2B7FD8;
}
.btn-secondary:hover {
  background: rgba(43,127,216,0.06);
}
```

**危险按钮**：
```css
.btn-danger {
  background: transparent;
  border: 1.5px solid rgba(232,74,95,0.3);
  color: #E84A5F;
}
.btn-danger:hover {
  background: rgba(232,74,95,0.06);
}
```

### 4.4 输入框

```css
.app-input {
  border: 1.5px solid rgba(26,26,26,.1);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 0.9rem;
  transition: border-color .2s;
  background: #fff;
  color: #1A1A2E;
  font-family: inherit;
}
.app-input:focus {
  outline: none;
  border-color: #2B7FD8;
  box-shadow: 0 0 0 3px rgba(43,127,216,0.1);
}
```

### 4.5 标签/徽章

```css
.badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 500;
}
.badge-blue { background: rgba(43,127,216,0.1); color: #2B7FD8; }
.badge-yellow { background: rgba(244,215,88,0.2); color: #9a8100; }
.badge-red { background: rgba(232,74,95,0.1); color: #E84A5F; }
.badge-green { background: rgba(22,163,74,0.1); color: #16a34a; }
.badge-gray { background: rgba(0,0,0,0.05); color: #888; }
```

### 4.6 表格

```css
.data-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 0.85rem;
}
.data-table th {
  text-align: left;
  padding: 12px 16px;
  font-weight: 600;
  color: #4A4A5A;
  border-bottom: 2px solid rgba(0,0,0,0.06);
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.data-table td {
  padding: 14px 16px;
  border-bottom: 1px solid rgba(0,0,0,0.04);
  color: #1A1A2E;
}
.data-table tr:hover td {
  background: rgba(43,127,216,0.03);
}
```

---

## 5. 模块视觉规范

### 5.1 情绪板（🎨）

- 全屏白板区域，占满主内容区
- 保留原有白板的工具栏、画布、缩放控制
- 顶部工具栏融入产品顶部栏下方
- 底部缩放控制保留

### 5.2 文档库（📁）

- 筛选栏：分类下拉 + 标签筛选 + 搜索框
- 文件列表：表格形式
- 操作列：预览 👁、删除 🗑
- 上传按钮：主按钮样式，右上角

### 5.3 预算（💰）

- 顶部警告横幅（超支时显示）
- 可编辑表格：项目 | 分类 | 预算 | 实际 | 差额 | 状态 | 备注
- 底部汇总行
- 标签切换：预算总表 / 支出明细 / 统计图表

### 5.4 进度（📅）

- 标签切换：阶段时间线 / 照片墙
- 阶段卡片：横向排列，箭头连接
- 照片墙：网格视图 + 筛选器（阶段/位置/性质/日期/拍摄者）

### 5.5 沟通（💬）

- 标签切换：全部记录 / 待办看板
- 记录卡片：日期 | 标题 | 作者 | 参与方 | 待办数量
- 待办看板：三列（待办/已完成/逾期）

### 5.6 总览 Dashboard（📊）

- 顶部统计卡片行（6个）
- 预算环形图（CSS conic-gradient）
- 进度时间轴（横向）
- 近期动态区域
- 周报按钮

---

## 6. 交互规范

### 6.1 模块切换

- 点击左侧导航切换模块
- 切换前自动保存当前模块数据
- 当前模块高亮显示
- 切换动画：淡入淡出 0.2s

### 6.2 保存状态

- 顶部栏显示保存状态指示器
- 🟢 已保存 / 🟡 保存中 / 🔴 未保存
- 任何数据变更后 2 秒自动保存
- Ctrl+S 立即保存

### 6.3 用户切换

- 顶部栏下拉选择
- 切换后所有新建内容自动标记为当前用户
- 历史内容显示作者标记（不可修改）

### 6.4 首次引导

1. 打开产品 → 请求选择文件夹权限
2. 选择空文件夹 → 自动创建目录结构
3. 显示欢迎弹窗 → 设置项目名称和两位用户
4. 进入总览 Dashboard

---

## 7. 响应式规则

- **桌面端**：左侧导航固定 200px，主内容区自适应
- **平板端（< 900px）**：左侧导航收缩为图标栏（60px），hover 展开
- **移动端（< 600px）**：底部 Tab 栏替代左侧导航

---

## 8. 禁忌清单

- ❌ 蓝紫渐变
- ❌ glassmorphism
- ❌ neon 效果
- ❌ bounce 动画
- ❌ Inter / Roboto 字体
- ❌ 所有 section 居中
- ❌ HTML 默认 blockquote / 列表 / 表格样式
- ❌ 看起来像 AI 生成的通用模板
- ❌ 深色面板（仅 Dashboard 统计卡片可用）
- ❌ 纯黑 `#000` 或纯白 `#fff` 背景

---

## 9. 自检清单

### P0（必须全过）
- [ ] 品牌三色比例正确
- [ ] 无禁忌元素
- [ ] 无 HTML 默认样式
- [ ] 暖底背景 `#fefcf6`
- [ ] 衬线+无衬线混搭
- [ ] 响应式基础
- [ ] 每个模块视觉风格一致
- [ ] 截图发 Twitter 不会被说"又是 AI 做的"

### P1（应过）
- [ ] 至少一个视觉惊喜（Dashboard 环形图）
- [ ] 字号对比合理
- [ ] 交互反馈清晰

### P2（加分）
- [ ] 装饰元素克制
- [ ] prefers-reduced-motion 支持
