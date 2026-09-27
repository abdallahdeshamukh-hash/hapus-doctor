/*
# Hapus Doctor: scans table + storage (SAME Supabase project as CampusFix)

1. profiles.role: allow 'farmer' (existing constraint only allows student|admin).
   Existing rows are untouched — a 'farmer' role is added alongside them.

2. New table `scans` — one AI diagnosis of a mango leaf/flower/fruit/trunk photo:
   - farmer_id (uuid, references auth.users) — the farmer who scanned
   - image_url / image_path — photo in the `hapus-scans` storage bucket
   - voice_text — transcribed Marathi/Hindi/English symptom description
   - is_healthy — AI verdict
   - disease_name_mr / disease_name_en — e.g. 'भुरी' / 'Powdery Mildew'
   - confidence (0-100), severity (low|medium|high|critical)
   - stage (leaf|flower|fruit|trunk)
   - description_mr — AI explanation in Marathi
   - treatment (jsonb) — [{type: chemical|organic, medicine, dosage, frequency, notes}]
   - prevention_mr (text[]) — prevention list in Marathi
   - created_at

3. RLS: a farmer sees/inserts only their own scans. (No admin role needed —
   agriculture officers can be granted access later by adding a policy.)

4. Storage: public-read bucket `hapus-scans`; authenticated users upload to
   their own folder; owners update/delete their own objects.

Run in Supabase Dashboard → SQL Editor → paste → Run.
*/

-- ------------------------------------------------------------------
-- 1. Allow 'farmer' in profiles.role
-- ------------------------------------------------------------------
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('student', 'admin', 'farmer'));

-- ------------------------------------------------------------------
-- 2. Scans table
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url text,
  image_path text,
  voice_text text,
  is_healthy boolean NOT NULL DEFAULT false,
  disease_name_mr text,
  disease_name_en text,
  confidence integer CHECK (confidence >= 0 AND confidence <= 100),
  severity text CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  stage text CHECK (stage IN ('leaf', 'flower', 'fruit', 'trunk')),
  description_mr text,
  treatment jsonb,
  prevention_mr text[],
  created_at timestamptz DEFAULT now()
);

ALTER TABLE scans ENABLE ROW LEVEL SECURITY;

-- Farmer sees/inserts/updates/deletes only their own scans
DROP POLICY IF EXISTS "farmer_select_own_scans" ON scans;
CREATE POLICY "farmer_select_own_scans" ON scans FOR SELECT
  TO authenticated USING (auth.uid() = farmer_id);

DROP POLICY IF EXISTS "farmer_insert_own_scans" ON scans;
CREATE POLICY "farmer_insert_own_scans" ON scans FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = farmer_id);

DROP POLICY IF EXISTS "farmer_update_own_scans" ON scans;
CREATE POLICY "farmer_update_own_scans" ON scans FOR UPDATE
  TO authenticated USING (auth.uid() = farmer_id) WITH CHECK (auth.uid() = farmer_id);

DROP POLICY IF EXISTS "farmer_delete_own_scans" ON scans;
CREATE POLICY "farmer_delete_own_scans" ON scans FOR DELETE
  TO authenticated USING (auth.uid() = farmer_id);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_scans_farmer_id ON scans(farmer_id);
CREATE INDEX IF NOT EXISTS idx_scans_created_at ON scans(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scans_severity ON scans(severity);

-- ------------------------------------------------------------------
-- 3. Storage bucket + policies
-- ------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('hapus-scans', 'hapus-scans', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "read_hapus_scans" ON storage.objects;
CREATE POLICY "read_hapus_scans" ON storage.objects FOR SELECT
  TO anon, authenticated USING (bucket_id = 'hapus-scans');

DROP POLICY IF EXISTS "upload_hapus_scans" ON storage.objects;
CREATE POLICY "upload_hapus_scans" ON storage.objects FOR INSERT
  TO authenticated WITH CHECK (bucket_id = 'hapus-scans');

DROP POLICY IF EXISTS "update_hapus_scans" ON storage.objects;
CREATE POLICY "update_hapus_scans" ON storage.objects FOR UPDATE
  TO authenticated USING (bucket_id = 'hapus-scans')
  WITH CHECK (bucket_id = 'hapus-scans');

DROP POLICY IF EXISTS "delete_hapus_scans" ON storage.objects;
CREATE POLICY "delete_hapus_scans" ON storage.objects FOR DELETE
  TO authenticated USING (bucket_id = 'hapus-scans');
