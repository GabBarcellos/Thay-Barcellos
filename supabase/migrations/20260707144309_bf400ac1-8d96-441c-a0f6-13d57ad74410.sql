
ALTER TABLE public.support_requests
  ADD COLUMN IF NOT EXISTS admin_reply TEXT,
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rating SMALLINT,
  ADD COLUMN IF NOT EXISTS rating_feedback TEXT,
  ADD COLUMN IF NOT EXISTS rated_at TIMESTAMPTZ;

ALTER TABLE public.support_requests
  DROP CONSTRAINT IF EXISTS support_requests_rating_check;
ALTER TABLE public.support_requests
  ADD CONSTRAINT support_requests_rating_check
  CHECK (rating IS NULL OR (rating BETWEEN 1 AND 5));

-- Allow the owner user to update ONLY rating fields and acknowledgement on their own resolved requests.
DROP POLICY IF EXISTS "Users can rate their own resolved requests" ON public.support_requests;
CREATE POLICY "Users can rate their own resolved requests"
  ON public.support_requests
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'resolved')
  WITH CHECK (auth.uid() = user_id AND status = 'resolved');
