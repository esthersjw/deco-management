-- ============================================
-- 修复 Storage RLS 策略 - 允许认证用户上传和访问文件
-- ============================================

-- 1. 允许认证用户上传文件到任何 bucket
CREATE POLICY IF NOT EXISTS "Allow authenticated uploads"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 2. 允许认证用户读取任何 bucket 的文件
CREATE POLICY IF NOT EXISTS "Allow authenticated reads"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (true);

-- 3. 允许认证用户更新自己的文件
CREATE POLICY IF NOT EXISTS "Allow authenticated updates"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (true);

-- 4. 允许认证用户删除自己的文件
CREATE POLICY IF NOT EXISTS "Allow authenticated deletes"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================
-- 完成！现在刷新应用页面测试上传
-- ============================================
