
CREATE TABLE public.support_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'bug' CHECK (kind IN ('bug','request','question')),
  subject TEXT NOT NULL CHECK (char_length(subject) BETWEEN 1 AND 200),
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 4000),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.support_requests TO authenticated;
GRANT ALL ON public.support_requests TO service_role;

ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own support requests"
  ON public.support_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own support requests"
  ON public.support_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Super admins can read all support requests"
  ON public.support_requests FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update support requests"
  ON public.support_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE INDEX support_requests_status_created_idx
  ON public.support_requests (status, created_at DESC);
