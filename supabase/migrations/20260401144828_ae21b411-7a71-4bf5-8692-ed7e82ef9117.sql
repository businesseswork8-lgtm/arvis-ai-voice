ALTER TABLE public.items ADD COLUMN end_datetime timestamp with time zone DEFAULT NULL;
ALTER TABLE public.items ADD COLUMN event_color text DEFAULT NULL;