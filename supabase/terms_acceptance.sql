-- Migration : traçabilité de l'acceptation des CGV à l'inscription.
-- Idempotente : peut être exécutée plusieurs fois sans erreur.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS terms_version text;
