
-- Create items table for cross-device sync
CREATE TABLE public.items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_key UUID NOT NULL,
  type TEXT NOT NULL,
  folder TEXT,
  title TEXT NOT NULL,
  content TEXT DEFAULT '',
  datetime TIMESTAMPTZ,
  done BOOLEAN NOT NULL DEFAULT false,
  confirmed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index on sync_key for fast lookups
CREATE INDEX idx_items_sync_key ON public.items (sync_key);

-- Enable RLS
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- Since no auth is used, allow all operations for anon role
-- Security is via the sync_key (UUID is hard to guess)
CREATE POLICY "Anyone can read items" ON public.items
  FOR SELECT TO anon USING (true);

CREATE POLICY "Anyone can insert items" ON public.items
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Anyone can update items" ON public.items
  FOR UPDATE TO anon USING (true);

CREATE POLICY "Anyone can delete items" ON public.items
  FOR DELETE TO anon USING (true);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_items_updated_at
  BEFORE UPDATE ON public.items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
