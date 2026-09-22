-- Storage policies for whatsapp-backgrounds bucket
-- Note: Bucket itself is created via tool, we only manage policies here.

-- Allow public access to view backgrounds
CREATE POLICY "Public Access to WhatsApp Backgrounds"
ON storage.objects FOR SELECT
USING (bucket_id = 'whatsapp-backgrounds');

-- Allow authenticated users to upload their own backgrounds
CREATE POLICY "Users can upload WhatsApp backgrounds"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'whatsapp-backgrounds' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to delete their own backgrounds
CREATE POLICY "Users can delete WhatsApp backgrounds"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'whatsapp-backgrounds' AND (storage.foldername(name))[1] = auth.uid()::text);
