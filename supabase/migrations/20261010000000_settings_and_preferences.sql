-- Migration: 20261010000000_settings_and_preferences.sql
-- Description: Add workspace email and logo columns, create user_preferences table with RLS, and configure organization-logos storage bucket.

-- 1. Extend workspaces table with email and logo_url
ALTER TABLE public.workspaces
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- 2. Create user_preferences table
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  default_event_type TEXT,
  default_event_format TEXT,
  default_timezone TEXT DEFAULT 'Asia/Kolkata',
  default_location TEXT,
  notify_registration_updates BOOLEAN NOT NULL DEFAULT true,
  notify_event_updates BOOLEAN NOT NULL DEFAULT true,
  notify_check_in_updates BOOLEAN NOT NULL DEFAULT true,
  notify_integration_alerts BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Basic index for user_preferences
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);

-- Updated_at trigger for user_preferences
CREATE OR REPLACE FUNCTION public.set_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_preferences_updated_at ON public.user_preferences;
CREATE TRIGGER trigger_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.set_user_preferences_updated_at();

-- 3. Enable RLS on user_preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own preferences" ON public.user_preferences;
CREATE POLICY "Users can view own preferences"
  ON public.user_preferences FOR SELECT
  USING ( auth.uid() = user_id );

DROP POLICY IF EXISTS "Users can insert own preferences" ON public.user_preferences;
CREATE POLICY "Users can insert own preferences"
  ON public.user_preferences FOR INSERT
  WITH CHECK ( auth.uid() = user_id );

DROP POLICY IF EXISTS "Users can update own preferences" ON public.user_preferences;
CREATE POLICY "Users can update own preferences"
  ON public.user_preferences FOR UPDATE
  USING ( auth.uid() = user_id );

-- 4. Create dedicated storage bucket for organization logos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'organization-logos',
  'organization-logos',
  true,
  2097152, -- 2MB limit
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

-- 5. Storage policies for organization-logos bucket
DROP POLICY IF EXISTS "Public Read Access for Org Logos" ON storage.objects;
CREATE POLICY "Public Read Access for Org Logos"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'organization-logos' );

DROP POLICY IF EXISTS "Authenticated Insert Access for Org Logos" ON storage.objects;
CREATE POLICY "Authenticated Insert Access for Org Logos"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK ( bucket_id = 'organization-logos' );

DROP POLICY IF EXISTS "Authenticated Update Access for Org Logos" ON storage.objects;
CREATE POLICY "Authenticated Update Access for Org Logos"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING ( bucket_id = 'organization-logos' );

DROP POLICY IF EXISTS "Authenticated Delete Access for Org Logos" ON storage.objects;
CREATE POLICY "Authenticated Delete Access for Org Logos"
  ON storage.objects FOR DELETE
  TO authenticated
  USING ( bucket_id = 'organization-logos' );
