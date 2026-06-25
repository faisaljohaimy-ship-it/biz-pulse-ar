
CREATE POLICY "aria_docs_storage_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'aria-documents' AND (auth.uid()::text = (storage.foldername(name))[1] OR has_role(auth.uid(),'admin')));
CREATE POLICY "aria_docs_storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'aria-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "aria_docs_storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'aria-documents' AND (auth.uid()::text = (storage.foldername(name))[1] OR has_role(auth.uid(),'admin')));
