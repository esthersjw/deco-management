-- ============================================
-- 装修指挥官 - Supabase 数据库 Schema
-- 运行方式: Supabase Dashboard → SQL Editor → New Query → 粘贴 → Run
-- ============================================

-- 启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. 项目表 (projects)
-- ============================================
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL DEFAULT '我的装修项目',
  address TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: 用户只能看到自己的项目
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "Users can insert own projects" ON projects
  FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (owner_id = auth.uid());
CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (owner_id = auth.uid());

-- ============================================
-- 2. 项目成员表 (project_members) - 用于协作邀请
-- ============================================
CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'editor', 'viewer')),
  invited_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view project members" ON project_members
  FOR SELECT USING (
    user_id = auth.uid() OR
    project_id IN (SELECT id FROM projects WHERE owner_id = auth.uid())
  );

-- ============================================
-- 3. 用户资料表 (profiles) - 扩展 auth.users
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable" ON profiles
  FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- 自动创建 profile 的触发器
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 4. 文档表 (documents)
-- ============================================
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '其他',
  file_url TEXT,
  file_type TEXT,
  file_size INTEGER,
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view project documents" ON documents
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert project documents" ON documents
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update project documents" ON documents
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete project documents" ON documents
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 5. 预算表 (budget_items)
-- ============================================
CREATE TABLE IF NOT EXISTS budget_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  item_name TEXT NOT NULL,
  vendor TEXT,
  estimated NUMERIC(12,2) DEFAULT 0,
  actual NUMERIC(12,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT '计划中' CHECK (status IN ('计划中', '已确认', '已支付', '已取消')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE budget_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view project budget" ON budget_items
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "Users can manage project budget" ON budget_items
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 6. 装修阶段表 (progress_phases)
-- ============================================
CREATE TABLE IF NOT EXISTS progress_phases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT '未开始' CHECK (status IN ('未开始', '进行中', '已完成')),
  start_date DATE,
  end_date DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE progress_phases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view project phases" ON progress_phases
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "Users can manage project phases" ON progress_phases
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 7. 任务表 (progress_tasks)
-- ============================================
CREATE TABLE IF NOT EXISTS progress_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phase_id UUID NOT NULL REFERENCES progress_phases(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT '待办' CHECK (status IN ('待办', '进行中', '已完成')),
  assignee TEXT,
  due_date DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE progress_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view project tasks" ON progress_tasks
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "Users can manage project tasks" ON progress_tasks
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 8. 沟通记录表 (communications)
-- ============================================
CREATE TABLE IF NOT EXISTS communications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT '其他' CHECK (type IN ('微信', '电话', '现场', '邮件', '其他')),
  content TEXT NOT NULL,
  contact_name TEXT,
  contact_role TEXT,
  status TEXT NOT NULL DEFAULT '待跟进' CHECK (status IN ('待跟进', '已确认', '已解决')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE communications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view project communications" ON communications
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "Users can manage project communications" ON communications
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 9. 情绪板元素表 (board_items)
-- ============================================
CREATE TABLE IF NOT EXISTS board_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('sticky', 'text', 'image', 'drawing')),
  content TEXT NOT NULL,
  x NUMERIC(10,2) DEFAULT 0,
  y NUMERIC(10,2) DEFAULT 0,
  width NUMERIC(10,2) DEFAULT 200,
  height NUMERIC(10,2) DEFAULT 150,
  color TEXT,
  z_index INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE board_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view project board" ON board_items
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );
CREATE POLICY "Users can manage project board" ON board_items
  FOR ALL USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 10. 模块数据表 (module_data) - 存储各模块 JSON 数据
-- ============================================
CREATE TABLE IF NOT EXISTS module_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, module_key)
);

ALTER TABLE module_data ENABLE ROW LEVEL SECURITY;

-- SELECT: 用户可以查看自己项目的数据
CREATE POLICY "Users can view project module_data" ON module_data
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

-- INSERT: 用户可以向自己项目插入数据
CREATE POLICY "Users can insert project module_data" ON module_data
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

-- UPDATE: 用户可以更新自己项目的数据
CREATE POLICY "Users can update project module_data" ON module_data
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

-- DELETE: 用户可以删除自己项目的数据
CREATE POLICY "Users can delete project module_data" ON module_data
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

CREATE TRIGGER update_module_data_updated_at BEFORE UPDATE ON module_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 11. 创建 Storage Buckets
-- ============================================
-- 在 Supabase Dashboard → Storage 中手动创建:
-- 1. documents bucket (公开) - 存放合同、报价单等文档
-- 2. images bucket (公开) - 存放进度照片
-- 3. board-assets bucket (公开) - 存放情绪板图片

-- ============================================
-- 12. 启用 Realtime (数据实时同步)
-- ============================================
-- 在 Supabase Dashboard → Database → Replication 中启用:
-- module_data (核心，包含所有模块 JSON 数据)

-- 或者通过 SQL 启用:
BEGIN;
  ALTER PUBLICATION supabase_realtime ADD TABLE module_data;
COMMIT;

-- ============================================
-- 12. 辅助函数
-- ============================================

-- 自动更新 updated_at 的触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为所有表添加 updated_at 自动更新触发器
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_budget_items_updated_at BEFORE UPDATE ON budget_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_progress_phases_updated_at BEFORE UPDATE ON progress_phases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_progress_tasks_updated_at BEFORE UPDATE ON progress_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_communications_updated_at BEFORE UPDATE ON communications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_board_items_updated_at BEFORE UPDATE ON board_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 13. 创建默认项目（可选，首次注册用户时自动创建）
-- ============================================
-- 这个通过前端代码实现：用户注册后自动调用 API 创建项目

-- ============================================
-- 完成！请检查:
-- 1. 所有表已创建
-- 2. RLS 策略已启用
-- 3. Realtime 已启用
-- 4. 去 Storage 创建 3 个 bucket: documents, images, board-assets
-- ============================================
