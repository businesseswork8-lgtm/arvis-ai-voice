
-- Add user_id to items
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS items_user_id_idx ON public.items(user_id);

-- Add user_id to google_calendar_connections
ALTER TABLE public.google_calendar_connections ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE UNIQUE INDEX IF NOT EXISTS gcal_user_id_unique ON public.google_calendar_connections(user_id);

-- user_settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  api_key text NOT NULL DEFAULT '',
  model text NOT NULL DEFAULT 'gemini-2.0-flash',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Drop old wide-open policies on items
DROP POLICY IF EXISTS "Anyone can delete items" ON public.items;
DROP POLICY IF EXISTS "Anyone can insert items" ON public.items;
DROP POLICY IF EXISTS "Anyone can read items" ON public.items;
DROP POLICY IF EXISTS "Anyone can update items" ON public.items;

CREATE POLICY "Users select own items" ON public.items FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own items" ON public.items FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own items" ON public.items FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own items" ON public.items FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Drop old wide-open policies on gcal connections
DROP POLICY IF EXISTS "Anyone can delete gcal connections" ON public.google_calendar_connections;
DROP POLICY IF EXISTS "Anyone can insert gcal connections" ON public.google_calendar_connections;
DROP POLICY IF EXISTS "Anyone can read gcal connections" ON public.google_calendar_connections;
DROP POLICY IF EXISTS "Anyone can update gcal connections" ON public.google_calendar_connections;

CREATE POLICY "Users select own gcal" ON public.google_calendar_connections FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own gcal" ON public.google_calendar_connections FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own gcal" ON public.google_calendar_connections FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own gcal" ON public.google_calendar_connections FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- user_settings policies
CREATE POLICY "Users select own settings" ON public.user_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own settings" ON public.user_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own settings" ON public.user_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own settings" ON public.user_settings FOR DELETE TO authenticated USING (auth.uid() = user_id);
