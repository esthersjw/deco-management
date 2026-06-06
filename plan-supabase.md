# 装修指挥官 - Supabase 实时协作方案

## 目标
将纯前端本地应用升级为支持多人实时协作的云端应用，使用 Supabase 作为后端。

## 技术栈
- **前端**: 纯 HTML+CSS+JS（保持零构建工具）
- **后端**: Supabase（PostgreSQL + Auth + Storage + Realtime）
- **部署**: Vercel（静态托管 + Serverless Functions）

## 需要你配合的步骤（无法代劳）

### Step 1: 创建 Supabase 项目
1. 访问 [supabase.com](https://supabase.com)，用 GitHub 账号登录
2. 点击 "New Project"
3. 填写项目名称：`deco-management`
4. 选择地区：Asia Pacific (Singapore) 或离你最近的
5. 等待项目创建完成（约 2 分钟）

### Step 2: 获取 API 密钥
项目创建后，进入 Project Settings → API：
- 复制 `Project URL`（如 `https://xxxxx.supabase.co`）
- 复制 `anon public` API Key（以 `eyJ...` 开头）
- 把这两个值发给我

### Step 3: 运行数据库初始化 SQL
进入 SQL Editor → New Query，粘贴我提供的 `schema.sql`，点击 Run。

### Step 4: 创建 Storage Bucket
进入 Storage → New Bucket：
- 创建 `documents` bucket（公开访问）
- 创建 `images` bucket（公开访问）
- 两个 bucket 的 Policy 设置为 `public`

### Step 5: 部署到 Vercel
1. 访问 [vercel.com](https://vercel.com)，用 GitHub 登录
2. Import GitHub Repository → 选择 `esthersjw/deco-management`
3. 在 Environment Variables 中添加：
   - `SUPABASE_URL` = 你的 Project URL
   - `SUPABASE_ANON_KEY` = 你的 anon key
4. 点击 Deploy

## 我可以帮你完成的步骤

### Phase 1: 数据库 Schema 设计
设计所有表结构、关系、RLS（Row Level Security）策略。

### Phase 2: 前端重构
- 引入 Supabase JS Client（CDN 方式，保持零构建）
- 重写数据层：所有 CRUD 操作改为 Supabase API 调用
- 实现用户认证界面（登录/注册/退出）
- 实现图片上传 → Supabase Storage
- 实现 Realtime 订阅（数据变化实时同步）

### Phase 3: 离线支持
- 本地缓存策略（IndexedDB 作为离线缓存）
- 网络恢复后自动同步

### Phase 4: 部署配置
- 准备 Vercel 部署配置
- 准备环境变量模板

## 数据库 Schema 概览

```
projects          -- 装修项目（目前单项目，预留多项目扩展）
  id, name, address, owner_id, created_at

profiles          -- 用户资料（与 auth.users 关联）
  id, email, display_name, avatar_url, created_at

documents         -- 文档/合同
  id, project_id, name, category, file_url, file_type, size, tags, notes, created_by, created_at

budget_items      -- 预算条目
  id, project_id, category, item_name, vendor, estimated, actual, status, notes, created_by, created_at

progress_phases   -- 装修阶段
  id, project_id, name, order_index, status, start_date, end_date

progress_tasks    -- 阶段下的任务
  id, phase_id, project_id, name, status, assignee, due_date, notes, created_by, created_at

communications    -- 沟通记录
  id, project_id, type, content, contact_name, contact_role, status, created_by, created_at

board_items       -- 情绪板元素
  id, project_id, type, content, x, y, width, height, color, z_index, created_by, created_at
```

## 实时协作机制

### 数据同步
- 每个表启用 Supabase Realtime
- 前端订阅 `INSERT/UPDATE/DELETE` 事件
- 数据变化时自动刷新对应模块

### 冲突处理
- 乐观更新：本地先更新，API 成功后确认
- 最后写入优先（Last Write Wins）
- 预留字段：`updated_at` 用于冲突检测

### 用户感知
- 显示"对方正在编辑"提示
- 显示最后同步时间

## 安全策略（RLS）

所有表启用 RLS，策略规则：
- 用户只能访问自己 `project_id` 下的数据
- 通过 `project_members` 表管理协作权限
- 项目创建者可以邀请其他用户

## 预计工作量
- 数据库 Schema + SQL: 1 小时
- 前端重构（数据层）: 3-4 小时
- 用户认证界面: 1 小时
- 图片上传重构: 1 小时
- Realtime 订阅: 1-2 小时
- 测试调试: 1-2 小时
- **总计: 约 8-10 小时**

## 费用
- Supabase 免费版：足够 2 人使用（500MB 数据库 + 1GB 存储）
- Vercel 免费版：足够使用
- **总费用：0 元**
