-- Add parent_id column for sub-tasks
ALTER TABLE public.items ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.items(id) ON DELETE CASCADE;

-- Create push_subscriptions table
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_key UUID NOT NULL,
  endpoint TEXT NOT NULL,
  subscription JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add unique constraint on sync_key + endpoint
ALTER TABLE public.push_subscriptions ADD CONSTRAINT push_subscriptions_sync_key_endpoint_key UNIQUE (sync_key, endpoint);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies (no auth, matches existing pattern)
CREATE POLICY "Anyone can read push subscriptions" ON public.push_subscriptions FOR SELECT TO anon USING (true);
CREATE POLICY "Anyone can insert push subscriptions" ON public.push_subscriptions FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anyone can update push subscriptions" ON public.push_subscriptions FOR UPDATE TO anon USING (true);
CREATE POLICY "Anyone can delete push subscriptions" ON public.push_subscriptions FOR DELETE TO anon USING (true);