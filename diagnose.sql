-- ============================================
-- 诊断 SQL - 检查 module_data 表和 RLS 状态
-- ============================================

-- 1. 检查 module_data 表是否存在
SELECT * FROM information_schema.tables WHERE table_name = 'module_data';

-- 2. 检查 module_data 的 RLS 策略
SELECT * FROM pg_policies WHERE tablename = 'module_data';

-- 3. 检查 projects 表中的项目（确认有数据）
SELECT id, name, owner_id FROM projects LIMIT 5;

-- 4. 检查 auth.users 中的用户（确认有数据）
SELECT id, email FROM auth.users LIMIT 5;

-- 5. 临时关闭 module_data 的 RLS（测试用，确认是否是 RLS 问题）
-- ALTER TABLE module_data DISABLE ROW LEVEL SECURITY;

-- 6. 如果确认是 RLS 问题，重新启用并创建宽松策略
-- ALTER TABLE module_data ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all" ON module_data FOR ALL USING (true) WITH CHECK (true);
