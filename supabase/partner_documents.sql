-- Migration idempotente : colonnes d'adresse et de documents pour riders et merchants,
-- et bucket Storage privé pour les pièces d'identité et photos.
-- À exécuter dans le SQL Editor de Supabase (service_role).

-- ────────────────────────────────────────────────────────────
-- 1. Riders : colonnes d'adresse + chemins de fichiers
-- ────────────────────────────────────────────────────────────
ALTER TABLE riders ADD COLUMN IF NOT EXISTS region text;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS department text;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS neighborhood text;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS photo_path text;
ALTER TABLE riders ADD COLUMN IF NOT EXISTS id_document_path text;

-- ────────────────────────────────────────────────────────────
-- 2. Merchants : colonnes d'adresse + chemins de fichiers
-- ────────────────────────────────────────────────────────────
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS region text;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS department text;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS neighborhood text;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS photo_path text;
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS id_document_path text;

-- ────────────────────────────────────────────────────────────
-- 3. Bucket Storage privé « partner-documents »
--    Accès uniquement via supabaseAdmin (service_role).
--    Aucune policy publique.
-- ────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('partner-documents', 'partner-documents', false, 5242880)
ON CONFLICT (id) DO NOTHING;
