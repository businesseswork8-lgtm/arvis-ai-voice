
DROP POLICY IF EXISTS "Anyone can delete push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Anyone can insert push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Anyone can read push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Anyone can update push subscriptions" ON public.push_subscriptions;

CREATE POLICY "Users select own push subs" ON public.push_subscriptions FOR SELECT TO authenticated USING (auth.uid() = sync_key);
CREATE POLICY "Users insert own push subs" ON public.push_subscriptions FOR INSERT TO authenticated WITH CHECK (auth.uid() = sync_key);
CREATE POLICY "Users update own push subs" ON public.push_subscriptions FOR UPDATE TO authenticated USING (auth.uid() = sync_key);
CREATE POLICY "Users delete own push subs" ON public.push_subscriptions FOR DELETE TO authenticated USING (auth.uid() = sync_key);
