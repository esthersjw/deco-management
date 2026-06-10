-- ============================================
-- 安全加固：profiles RLS + 邀请查询 RPC
-- 在 Supabase Dashboard → SQL Editor 中执行
-- ============================================

-- 1. 收紧 profiles 读取权限：用户只能看自己，或同项目成员的 profile。
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view own or project member profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.project_members pm_self
      JOIN public.project_members pm_other ON pm_other.project_id = pm_self.project_id
      WHERE pm_self.user_id = auth.uid()
        AND pm_other.user_id = profiles.id
    )
    OR EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.owner_id = auth.uid()
        AND p.owner_id = profiles.id
    )
    OR EXISTS (
      SELECT 1
      FROM public.projects p
      JOIN public.project_members pm ON pm.project_id = p.id
      WHERE p.owner_id = auth.uid()
        AND pm.user_id = profiles.id
    )
    OR EXISTS (
      SELECT 1
      FROM public.projects p
      JOIN public.project_members pm_self ON pm_self.project_id = p.id
      WHERE p.owner_id = profiles.id
        AND pm_self.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 2. 邀请用 RPC：前端不再直接全表读取 profiles。
-- 注意：这个函数仍会让已登录用户按精确邮箱查到一个用户，用于邀请。
-- 前端应返回统一错误，避免暴露更多枚举信息。
CREATE OR REPLACE FUNCTION public.find_profile_for_invite(invitee_email TEXT)
RETURNS TABLE(id UUID, email TEXT, display_name TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.email, p.display_name
  FROM public.profiles p
  WHERE lower(p.email) = lower(trim(invitee_email))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.find_profile_for_invite(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_profile_for_invite(TEXT) TO authenticated;
