# Baol Market - Logo Guidelines

Ce document définit les règles d'utilisation de la nouvelle identité visuelle de Baol Market. Le logo repose sur le concept du "Sceau", symbolisant la vérification physique des produits, l'ancrage local dans la région du Baol, et la confiance absolue d'une marketplace structurée.

## 1. Le Logo et ses Déclinaisons

Le logo principal est composé du **Symbole (le Sceau "B")** et du **Wordmark ("Baol Market")**.

- **Fond clair (`logo-complet-clair.svg`)** : Symbole `--baobab` (brun foncé) et `--terre` (ocre), wordmark `--baobab`. À utiliser sur fond blanc ou `--sable` (`#F1E7D3`).
- **Fond sombre (`logo-complet-sombre.svg`)** : Symbole `--sable` et `--terre`, wordmark `--sable`. À utiliser sur fond `--nuit-diourbel` (`#23404A`) ou `--baobab`.
- **Symbole seul (`symbole-seul.svg`)** : Réservé aux avatars, icônes d'application (PWA, Favicon), et espaces très restreints.
- **Monochromes (`symbole-monochrome-noir.svg`, `symbole-monochrome-blanc.svg`)** : Usage exclusif pour les tampons physiques, factures imprimées en noir et blanc, ou incrustation en filigrane sur des photos.

## 2. Règles d'Usage

### A. Zone de Protection (Clear Space)
Afin de préserver la lisibilité et l'impact du logo, une zone de protection doit toujours être respectée autour de celui-ci.
- **Symbole seul** : La zone de protection équivaut à **la hauteur de la "coche" (checkmark)** intégrée au symbole.
- **Logo complet** : La zone de protection équivaut à la hauteur de la lettre "B" de Baol. Aucun texte ou élément graphique ne doit pénétrer cette zone.

### B. Taille Minimale
Pour garantir une parfaite lisibilité de la géométrie et du texte :
- **Logo complet** : 120px de largeur pour le web / 30mm pour le print.
- **Symbole seul** : 16px de largeur (lisibilité validée pour le format favicon).

### C. Usages Interdits (À ne pas faire)
Pour maintenir l'intégrité de la marque, les manipulations suivantes sont strictement interdites :
- ❌ **Déformation** : Ne jamais étirer ou compresser le logo (respecter le ratio d'aspect original).
- ❌ **Changement de couleurs** : Ne pas recoloriser le logo en dehors de la palette officielle (`--terre`, `--baobab`, `--sable`).
- ❌ **Ombres et dégradés** : Ne jamais ajouter de "drop shadow", d'effets 3D, de brillance (glossy) ou de dégradés. L'identité doit rester "flat" et géométrique.
- ❌ **Altération de la typographie** : Ne pas changer la police du wordmark ni modifier l'espacement des lettres (kerning).
- ❌ **Contraste insuffisant** : Ne pas utiliser le logo clair sur une image chargée ou un fond clair n'offrant pas au moins un ratio de contraste de 4.5:1.

## 3. Livrables et Fichiers Fournis

Tous les fichiers ont été générés et placés dans le dossier `public/logo/` du projet :

| Fichier | Format | Usage prévu |
| :--- | :--- | :--- |
| `logo-complet-clair.svg` | SVG | Header du site web, documents officiels, fond clair |
| `logo-complet-sombre.svg` | SVG | Footer du site web, bannières, fond sombre |
| `symbole-seul.svg` | SVG | Avatar réseaux sociaux, espaces carrés contraints |
| `symbole-monochrome-noir.svg`| SVG | Tampons physiques sur emballages, impression N&B |
| `symbole-monochrome-blanc.svg`| SVG | Filigranes sur photos produits |
| `wordmark-seul.svg` | SVG | Navigation avec icône dissociée |
| `logo-512x512.png` | PNG | PWA Manifest, grand format web |
| `logo-192x192.png` | PNG | PWA Manifest |
| `logo-96x96.png` | PNG | Anciens appareils Android |
| `logo-48x48.png` | PNG | Tailles intermédiaires |
| `favicon-32x32.png` | PNG | Favicon standard (utilisé en `icon.png` pour Next.js) |
| `favicon-16x16.png` | PNG | Petit Favicon |
| `apple-touch-icon.png` | PNG | Icône d'écran d'accueil iOS (`apple-icon.png`) |

*Note technique Next.js :* Les fichiers `icon.png` et `apple-icon.png` ont été placés à la racine du dossier `app/` et remplaceront automatiquement l'ancien `favicon.ico` grâce aux conventions de routage Next.js (App Router).
