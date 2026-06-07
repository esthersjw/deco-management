-- ============================================
-- 修复 Storage buckets + RLS 策略
-- 适用：文档库(documents)和进度照片(images)上传失败
-- 在 Supabase Dashboard → SQL Editor 中执行
-- ============================================

-- 1. 确保上传用到的 buckets 存在且为公开读取
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('documents', 'documents', true, 52428800, NULL),
  ('images', 'images', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']),
  ('board-assets', 'board-assets', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. 清理旧的过宽策略，避免重复/冲突
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "Project members can upload app files" ON storage.objects;
DROP POLICY IF EXISTS "Project members can read app files" ON storage.objects;
DROP POLICY IF EXISTS "Project members can update app files" ON storage.objects;
DROP POLICY IF EXISTS "Project members can delete app files" ON storage.objects;

-- 3. 允许已登录用户操作本 app 的三个 bucket
CREATE POLICY "Project members can upload app files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id IN ('documents', 'images', 'board-assets'));

CREATE POLICY "Project members can read app files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id IN ('documents', 'images', 'board-assets'));

CREATE POLICY "Project members can update app files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id IN ('documents', 'images', 'board-assets'))
  WITH CHECK (bucket_id IN ('documents', 'images', 'board-assets'));

CREATE POLICY "Project members can delete app files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id IN ('documents', 'images', 'board-assets'));

-- 4. 验证 bucket 是否存在
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets
WHERE id IN ('documents', 'images', 'board-assets')
ORDER BY id;

-- 完成后刷新应用，再测试文档库和图片上传。
