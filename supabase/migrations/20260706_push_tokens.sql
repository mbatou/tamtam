-- Native (Expo) push tokens for the mobile app.
-- Web push subscriptions stay in push_subscriptions; this table holds the
-- ExpoPushToken[...] identifiers of native devices. One row per device;
-- re-registering the same token for another user moves it (upsert on token).
--
-- Run in the Supabase SQL editor before deploying the mobile push release.

CREATE TABLE IF NOT EXISTS public.push_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  platform text NOT NULL DEFAULT 'android' CHECK (platform IN ('android', 'ios')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  last_used_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT push_tokens_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS push_tokens_user_id_idx ON public.push_tokens (user_id);

-- Service-role access only (the API routes use the service client)
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
