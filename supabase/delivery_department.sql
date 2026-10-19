-- Ajout de la colonne delivery_department pour stocker le département choisi lors d'une commande hors Diourbel
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_department text;
