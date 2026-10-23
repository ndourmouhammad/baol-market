-- Migration pour ajouter le type de bannière (idempotent)
-- Date: 2026-10-23

-- 1. Ajout de la colonne kind avec valeur par défaut 'promo'
ALTER TABLE banners ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'promo';

-- 2. Ajout de la contrainte CHECK si elle n'existe pas déjà
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'banners_kind_check'
  ) THEN
    ALTER TABLE banners ADD CONSTRAINT banners_kind_check CHECK (kind IN ('promo', 'new_arrival'));
  END IF;
END $$;
