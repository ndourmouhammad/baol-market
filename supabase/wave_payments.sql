-- ============================================================
-- Wave Payments – colonnes et tables supplémentaires
-- Script idempotent : peut être exécuté plusieurs fois.
-- ============================================================

-- 1. Nouvelles colonnes sur orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_provider    text NOT NULL DEFAULT 'paytech';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS wave_checkout_id    text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS wave_transaction_id text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_amount       integer;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_method       text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_note         text;

-- 2. Index unique partiel : un wave_checkout_id ne peut être lié qu'à une seule commande
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_wave_checkout_id
  ON orders (wave_checkout_id)
  WHERE wave_checkout_id IS NOT NULL;

-- 3. Table d'audit des événements de paiement (webhook)
CREATE TABLE IF NOT EXISTS payment_events (
  event_id    text PRIMARY KEY,
  provider    text NOT NULL,
  event_type  text NOT NULL,
  order_id    uuid,
  received_at timestamptz DEFAULT now()
);

-- RLS activée, aucune policy : accès exclusif via supabaseAdmin (service_role)
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
