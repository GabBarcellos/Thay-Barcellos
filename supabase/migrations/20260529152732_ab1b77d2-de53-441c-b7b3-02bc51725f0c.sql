
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS phone text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery', 'gallery', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Gallery public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'gallery');

CREATE POLICY "Authenticated upload to gallery"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'gallery');

CREATE POLICY "Authenticated update gallery"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'gallery');

CREATE POLICY "Authenticated delete gallery"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'gallery');
