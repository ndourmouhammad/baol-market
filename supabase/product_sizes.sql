-- Migration pour la gestion des tailles de produits (idempotent)
-- Date: 2026-10-23

-- 1. Ajout des colonnes de taille sur la table products
-- size_options: liste des tailles disponibles (NULL ou tableau vide = produit sans taille)
ALTER TABLE products ADD COLUMN IF NOT EXISTS size_options text[];

-- size_notes: conseils de mesure ou guide (facultatif, 600 caractères max)
ALTER TABLE products ADD COLUMN IF NOT EXISTS size_notes text;

-- 2. Ajout de la colonne size sur la table order_items
-- size: taille choisie pour cet article (NULL si produit sans taille)
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS size text;
