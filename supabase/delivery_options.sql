-- Migration : Options de livraison (livraison locale Diourbel, retrait sur place, hors Diourbel)
-- Script idempotent à exécuter dans l'éditeur SQL de Supabase (base de production).
-- Ne supprime ni n'écrase aucune donnée existante.

-- 1. Ajout de la colonne zone_kind sur delivery_zones ('local' pour Diourbel, 'region' pour les autres régions)
ALTER TABLE delivery_zones 
ADD COLUMN IF NOT EXISTS zone_kind text NOT NULL DEFAULT 'local';

-- Contrainte de valeurs valides ('local', 'region') pour zone_kind
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'delivery_zones_zone_kind_check'
  ) THEN
    ALTER TABLE delivery_zones 
    ADD CONSTRAINT delivery_zones_zone_kind_check 
    CHECK (zone_kind IN ('local', 'region'));
  END IF;
END $$;

-- 2. Ajout du mode de remise (fulfillment_method) sur la table orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS fulfillment_method text NOT NULL DEFAULT 'delivery';

-- Contrainte de valeurs valides pour fulfillment_method ('delivery', 'pickup', 'self_arranged')
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'orders_fulfillment_method_check'
  ) THEN
    ALTER TABLE orders 
    ADD CONSTRAINT orders_fulfillment_method_check 
    CHECK (fulfillment_method IN ('delivery', 'pickup', 'self_arranged'));
  END IF;
END $$;

-- 3. Rendre la zone de livraison optionnelle pour permettre le retrait en boutique ('pickup')
ALTER TABLE orders 
ALTER COLUMN delivery_zone_id DROP NOT NULL;

-- 4. Insertion des 13 autres régions du Sénégal (hors Diourbel)
-- Chaque région est insérée uniquement si aucune zone portant le même nom n'existe déjà.
INSERT INTO delivery_zones (name, fee, is_variable, display_group, sort_order, zone_kind)
SELECT 'Dakar', 0, false, 'Autres régions du Sénégal', 1001, 'region'
WHERE NOT EXISTS (SELECT 1 FROM delivery_zones WHERE name = 'Dakar');

INSERT INTO delivery_zones (name, fee, is_variable, display_group, sort_order, zone_kind)
SELECT 'Fatick', 0, false, 'Autres régions du Sénégal', 1002, 'region'
WHERE NOT EXISTS (SELECT 1 FROM delivery_zones WHERE name = 'Fatick');

INSERT INTO delivery_zones (name, fee, is_variable, display_group, sort_order, zone_kind)
SELECT 'Kaffrine', 0, false, 'Autres régions du Sénégal', 1003, 'region'
WHERE NOT EXISTS (SELECT 1 FROM delivery_zones WHERE name = 'Kaffrine');

INSERT INTO delivery_zones (name, fee, is_variable, display_group, sort_order, zone_kind)
SELECT 'Kaolack', 0, false, 'Autres régions du Sénégal', 1004, 'region'
WHERE NOT EXISTS (SELECT 1 FROM delivery_zones WHERE name = 'Kaolack');

INSERT INTO delivery_zones (name, fee, is_variable, display_group, sort_order, zone_kind)
SELECT 'Kédougou', 0, false, 'Autres régions du Sénégal', 1005, 'region'
WHERE NOT EXISTS (SELECT 1 FROM delivery_zones WHERE name = 'Kédougou');

INSERT INTO delivery_zones (name, fee, is_variable, display_group, sort_order, zone_kind)
SELECT 'Kolda', 0, false, 'Autres régions du Sénégal', 1006, 'region'
WHERE NOT EXISTS (SELECT 1 FROM delivery_zones WHERE name = 'Kolda');

INSERT INTO delivery_zones (name, fee, is_variable, display_group, sort_order, zone_kind)
SELECT 'Louga', 0, false, 'Autres régions du Sénégal', 1007, 'region'
WHERE NOT EXISTS (SELECT 1 FROM delivery_zones WHERE name = 'Louga');

INSERT INTO delivery_zones (name, fee, is_variable, display_group, sort_order, zone_kind)
SELECT 'Matam', 0, false, 'Autres régions du Sénégal', 1008, 'region'
WHERE NOT EXISTS (SELECT 1 FROM delivery_zones WHERE name = 'Matam');

INSERT INTO delivery_zones (name, fee, is_variable, display_group, sort_order, zone_kind)
SELECT 'Saint-Louis', 0, false, 'Autres régions du Sénégal', 1009, 'region'
WHERE NOT EXISTS (SELECT 1 FROM delivery_zones WHERE name = 'Saint-Louis');

INSERT INTO delivery_zones (name, fee, is_variable, display_group, sort_order, zone_kind)
SELECT 'Sédhiou', 0, false, 'Autres régions du Sénégal', 1010, 'region'
WHERE NOT EXISTS (SELECT 1 FROM delivery_zones WHERE name = 'Sédhiou');

INSERT INTO delivery_zones (name, fee, is_variable, display_group, sort_order, zone_kind)
SELECT 'Tambacounda', 0, false, 'Autres régions du Sénégal', 1011, 'region'
WHERE NOT EXISTS (SELECT 1 FROM delivery_zones WHERE name = 'Tambacounda');

INSERT INTO delivery_zones (name, fee, is_variable, display_group, sort_order, zone_kind)
SELECT 'Thiès', 0, false, 'Autres régions du Sénégal', 1012, 'region'
WHERE NOT EXISTS (SELECT 1 FROM delivery_zones WHERE name = 'Thiès');

INSERT INTO delivery_zones (name, fee, is_variable, display_group, sort_order, zone_kind)
SELECT 'Ziguinchor', 0, false, 'Autres régions du Sénégal', 1013, 'region'
WHERE NOT EXISTS (SELECT 1 FROM delivery_zones WHERE name = 'Ziguinchor');

-- 5. Vérification et revue manuelle :
-- Requête pour consulter l'ensemble des zones configurées :
-- SELECT id, name, fee, display_group, sort_order, zone_kind FROM delivery_zones ORDER BY sort_order, name;
--
-- NOTE IMPORTANTE :
-- D'éventuelles anciennes zones génériques « hors Diourbel » préexistantes doivent être
-- revues à la main dans la base de données (aucune suppression ni modification automatique
-- n'a été effectuée par ce script pour préserver l'historique des commandes).
