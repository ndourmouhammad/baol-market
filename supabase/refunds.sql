-- ============================================================
-- Ajout des colonnes de suivi de paiement et de remboursement
-- ============================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at      timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refunded_at  timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_reference text;

-- ============================================================
-- Rattrapage : date de paiement approximative
-- On prend updated_at comme estimation pour les commandes déjà
-- passées par le paiement. C'est une date APPROXIMATIVE, la
-- vraie date de paiement PayTech n'ayant pas été enregistrée.
-- ============================================================

UPDATE orders
SET    paid_at = updated_at
WHERE  paid_at IS NULL
  AND  status IN ('paid', 'preparing', 'confirmed', 'delivering', 'delivered', 'refunded');

-- NOTE : on ne touche PAS aux commandes 'cancelled'.
-- Certaines ont peut-être été payées puis annulées, mais on
-- n'a aucune certitude. L'IPN PayTech enregistrera paid_at
-- à partir de maintenant, même si la commande est déjà annulée.
