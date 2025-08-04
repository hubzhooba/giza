-- Add Arweave/STOAR fields to documents table
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS "arweaveId" TEXT,
ADD COLUMN IF NOT EXISTS "arweaveUrl" TEXT;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_documents_arweave_id ON documents("arweaveId");
CREATE INDEX IF NOT EXISTS idx_documents_room_id ON documents(room_id);

-- Add comments for documentation
COMMENT ON COLUMN documents."arweaveId" IS 'STOAR/Arweave transaction ID for permanent storage';
COMMENT ON COLUMN documents."arweaveUrl" IS 'Direct URL to access the document on Arweave';

-- Update RLS policies to include new fields
ALTER POLICY "Users can view documents in their rooms" ON documents
USING (
  EXISTS (
    SELECT 1 FROM room_participants
    WHERE room_participants.room_id = documents.room_id
    AND room_participants.user_id = auth.uid()
  )
);

-- Add a function to track Arweave upload status
CREATE OR REPLACE FUNCTION update_document_arweave_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the updated_at timestamp when Arweave fields are modified
  IF NEW."arweaveId" IS DISTINCT FROM OLD."arweaveId" OR 
     NEW."arweaveUrl" IS DISTINCT FROM OLD."arweaveUrl" THEN
    NEW.updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for the function
DROP TRIGGER IF EXISTS update_document_arweave_status_trigger ON documents;
CREATE TRIGGER update_document_arweave_status_trigger
BEFORE UPDATE ON documents
FOR EACH ROW
EXECUTE FUNCTION update_document_arweave_status();

-- Add a view for documents with Arweave status
CREATE OR REPLACE VIEW documents_with_arweave_status AS
SELECT 
  d.*,
  CASE 
    WHEN d."arweaveId" IS NOT NULL THEN 'uploaded'
    ELSE 'pending'
  END as arweave_status,
  r.name as room_name,
  r.status as room_status
FROM documents d
JOIN rooms r ON d.room_id = r.id;

-- Grant access to the view
GRANT SELECT ON documents_with_arweave_status TO authenticated;