-- Migration idempotente : table service_providers et bucket Storage public service-photos.
-- À exécuter dans le SQL Editor de Supabase (service_role).

-- ────────────────────────────────────────────────────────────
-- 1. Table service_providers
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  profession text NOT NULL CHECK (profession IN ('mason', 'plumber', 'carpenter', 'electrician', 'painter', 'taxi')),
  years_experience integer NOT NULL CHECK (years_experience BETWEEN 0 AND 60),
  region text NOT NULL DEFAULT 'Diourbel' CHECK (region = 'Diourbel'),
  department text NOT NULL,
  neighborhood text,
  address_details text,
  phone text NOT NULL,
  photo_path text,
  id_document_path text,
  license_path text,
  insurance_path text,
  license_expires_on date,
  insurance_expires_on date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index utiles
CREATE INDEX IF NOT EXISTS idx_service_providers_profession ON service_providers(profession);
CREATE INDEX IF NOT EXISTS idx_service_providers_is_active ON service_providers(is_active);

-- Activer RLS sans aucune policy publique : tout passe par supabaseAdmin côté serveur.
ALTER TABLE service_providers ENABLE ROW LEVEL SECURITY;

-- ────────────────────────────────────────────────────────────
-- 2. Bucket Storage PUBLIC « service-photos »
--    Uniquement pour les photos (JPEG, PNG, WEBP, 5 Mo max).
--    Les pièces (CNI, permis, assurance) vont dans partner-documents.
-- ────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'service-photos',
  'service-photos',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- Policy de lecture publique pour le bucket service-photos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects'
      AND schemaname = 'storage'
      AND policyname = 'Public Access for service-photos'
  ) THEN
    CREATE POLICY "Public Access for service-photos"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'service-photos');
  END IF;
END $$;
