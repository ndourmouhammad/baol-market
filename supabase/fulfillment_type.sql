-- Migration : Ajout du type de vente (fulfillment_type) aux catégories
-- Valeurs possibles : 'standard', 'express', 'visit' (immobilier, automobiles, etc.)

ALTER TABLE categories ADD COLUMN IF NOT EXISTS fulfillment_type text NOT NULL DEFAULT 'standard';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'categories_fulfillment_type_check'
  ) THEN
    ALTER TABLE categories
    ADD CONSTRAINT categories_fulfillment_type_check
    CHECK (fulfillment_type IN ('standard', 'express', 'visit'));
  END IF;
END $$;
