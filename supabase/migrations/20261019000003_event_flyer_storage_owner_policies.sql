DROP POLICY IF EXISTS "Authenticated Insert Access for Event Flyers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update Access for Event Flyers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete Access for Event Flyers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Insert Access for Org Logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update Access for Org Logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete Access for Org Logos" ON storage.objects;

CREATE POLICY "Users can insert own event flyer objects"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'event-flyers'
  AND auth.uid() IS NOT NULL
  AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "Users can update own event flyer objects"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'event-flyers'
  AND auth.uid() IS NOT NULL
  AND (
    owner_id = auth.uid()::text
    OR split_part(name, '/', 1) = auth.uid()::text
  )
)
WITH CHECK (
  bucket_id = 'event-flyers'
  AND auth.uid() IS NOT NULL
  AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "Users can delete own event flyer objects"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'event-flyers'
  AND auth.uid() IS NOT NULL
  AND (
    owner_id = auth.uid()::text
    OR split_part(name, '/', 1) = auth.uid()::text
  )
);

CREATE POLICY "Users can insert own organization logo objects"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'organization-logos'
  AND auth.uid() IS NOT NULL
  AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "Users can update own organization logo objects"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'organization-logos'
  AND auth.uid() IS NOT NULL
  AND (
    owner_id = auth.uid()::text
    OR split_part(name, '/', 1) = auth.uid()::text
  )
)
WITH CHECK (
  bucket_id = 'organization-logos'
  AND auth.uid() IS NOT NULL
  AND split_part(name, '/', 1) = auth.uid()::text
);

CREATE POLICY "Users can delete own organization logo objects"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'organization-logos'
  AND auth.uid() IS NOT NULL
  AND (
    owner_id = auth.uid()::text
    OR split_part(name, '/', 1) = auth.uid()::text
  )
);
