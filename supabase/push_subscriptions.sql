-- Table des abonnements Push Notifications (Web Push)
-- À exécuter dans la console SQL de Supabase (base de production).

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index pour accélérer la recherche des abonnements par utilisateur
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- Activation de RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour que chaque utilisateur connecté gère ses propres abonnements
CREATE POLICY "Les utilisateurs peuvent voir leurs abonnements"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent insérer leurs abonnements"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent modifier leurs abonnements"
  ON push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent supprimer leurs abonnements"
  ON push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- IMPORTANT POUR LE TEMPS RÉEL (PASTILLE IN-APP ET SUIVI EN DIRECT) :
-- Activer la réplication Realtime sur les tables order_notifications et orders
-- pour que le composant NotificationBell et la page des commandes reçoivent les événements en direct.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'order_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE order_notifications;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE orders;
  END IF;
END $$;
