-- ============================================
-- 装修指挥官 - 完整修复 SQL
-- 运行方式: Supabase Dashboard → SQL Editor → New Query → 粘贴 → Run
-- ============================================

-- 1. 确保 UUID 扩展已启用
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. 创建模块数据表（如果不存在）
CREATE TABLE IF NOT EXISTS module_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, module_key)
);

-- 3. 启用 RLS
ALTER TABLE module_data ENABLE ROW LEVEL SECURITY;

-- 4. 删除旧策略（避免冲突）
DROP POLICY IF EXISTS "Users can view project module_data" ON module_data;
DROP POLICY IF EXISTS "Users can manage project module_data" ON module_data;
DROP POLICY IF EXISTS "Users can insert project module_data" ON module_data;
DROP POLICY IF EXISTS "Users can update project module_data" ON module_data;
DROP POLICY IF EXISTS "Users can delete project module_data" ON module_data;

-- 5. 创建完整 RLS 策略
CREATE POLICY "Users can view project module_data" ON module_data
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert project module_data" ON module_data
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update project module_data" ON module_data
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete project module_data" ON module_data
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM projects WHERE owner_id = auth.uid()
      UNION
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

-- 6. 创建自动更新 updated_at 触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_module_data_updated_at ON module_data;
CREATE TRIGGER update_module_data_updated_at BEFORE UPDATE ON module_data
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. 启用 Realtime 同步
BEGIN;
  ALTER PUBLICATION supabase_realtime ADD TABLE module_data;
COMMIT;

-- ============================================
-- 完成！请刷新应用页面后测试上传功能
-- ============================================
