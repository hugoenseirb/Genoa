# Genoa - Application de gestion d'arbre genealogique

INP – ENSEIRB-MATMECA – Télécom 2A  
ET8 PG219 : Développement d'applications pour terminaux mobiles

## Stack technique

| Composant           | Technologie                   |
| ------------------- | ----------------------------- |
| Frontend            | React Native (Expo)           |
| Backend / API       | Node.js + Express             |
| Base de données     | PostgreSQL                    |
| Authentification    | JWT (jsonwebtoken + bcryptjs) |
| Temps reel          | Socket.IO                     |
| Visualisation arbre | D3.js / d3-dag (via WebView)  |

## Fonctionnalités implémentées

### Inscription & Authentification

- Inscription avec email unique et mot de passe hashé (bcrypt) — Antoine Husser
- Le premier inscrit devient automatiquement administrateur — Antoine Husser
- Les inscriptions suivantes sont en attente de validation admin — Antoine Husser
- Connexion avec génération d'un JWT valide 24h — Antoine Husser
- Blocage de la connexion si le compte est en attente ou désactivé — Antoine Husser
- Route `GET /auth/me` pour récupérer l'utilisateur courant — Antoine Husser
- Interface de connexion / inscription (React Native) — Hugo

### Gestion des utilisateurs (Administration)

- Liste de tous les utilisateurs — Antoine Husser
- Liste des inscriptions en attente — Antoine Husser
- Validation d'une inscription (pending → active) — Antoine Husser
- Modification du rôle d'un utilisateur (admin / editor / reader) — Antoine Husser
- Modification d'un compte (email, username, password) — Antoine Husser
- Création d'un compte pour un tiers directement actif — Antoine Husser
- Suppression d'un compte — Antoine Husser
- Interface d'administration — Hugo

### Gestion des membres

- Création d'un membre avec les attributs : nom, prénom, sexe, dates, professions, coordonnées, notes publiques/privées — Hugo
- Modification d'un membre — Hugo
- Suppression d'un membre — Hugo
- Upload de photo (jpeg, png, webp - 5MB max) — Hugo
- Affichage des photos dans l'application — Antoine Husser
- Recherche par nom ou prénom (`?q=`) — Antoine Husser
- Gestion des données privées (`notes_private`, `contacts`) et masquage pour les lecteurs — Antoine Husser

### Gestion des relations familiales

- Création de relations de type couple (avec dates d'union/séparation, type : mariage/partenariat) — Antoine Husser (API) / Hugo (UI)
- Création de relations parent-enfant (biologique ou adopté) — Antoine Husser (API) / Hugo (UI)
- Validation de cohérence : pas de doublon, pas de self-relation — Antoine Husser
- Détection de cycle : empêche qu'un descendant devienne ancêtre (CTE récursif PostgreSQL) — Antoine Husser
- Suppression d'une relation — Hugo

### Visualisation de l'arbre genealogique

- Affichage graphique interactif (D3.js via WebView) — Antoine Husser
- Zoom / déplacement — Antoine Husser
- Clic sur un nœud → détails du membre — Antoine Husser
- Filtres : ascendants, descendants, fratrie, conjoints — Antoine Husser

### API de navigation dans l'arbre

- `GET /tree/:memberId` — sous-graphe (membre + parents + enfants + conjoints) — Antoine Husser
- `GET /tree/ancestors/:memberId` — tous les ancêtres (CTE récursif) — Antoine Husser
- `GET /tree/descendants/:memberId` — tous les descendants (CTE récursif) — Antoine Husser
- `GET /tree/siblings/:memberId` — fratrie — Antoine Husser

### Statistiques familiales

- Nombre total de membres — Antoine Husser (API) / Hugo (UI)
- Répartition hommes / femmes — Antoine Husser (API) / Hugo (UI)
- Espérance de vie moyenne (membres décédés) — Antoine Husser (API) / Hugo (UI)
- Nombre moyen d'enfants par parent — Antoine Husser (API) / Hugo (UI)
- Nombre de générations — Antoine Husser (API) / Hugo (UI)
- Nombre de couples — Antoine Husser (API) / Hugo (UI)

### Gestion des droits & confidentialite

- 3 rôles : `admin`, `editor`, `reader` — Antoine Husser
- Middleware `verifyToken` : vérifie le JWT sur chaque route protégée — Antoine Husser
- Middleware `requireEditor` / `requireAdmin` : contrôle d'accès par rôle — Antoine Husser
- Données privées visibles uniquement par les éditeurs et administrateurs — Antoine Husser

### Temps reel Socket.IO

- Authentification Socket.IO via JWT (handshake) — Antoine Husser
- Système de verrous : indique qu'un membre est en cours de modification — Antoine Husser
- Événements `lock:acquire`, `lock:release`, `lock:denied` — Antoine Husser
- Broadcast des modifications en temps réel : `tree:member_updated`, `tree:relation_created`, etc. — Antoine Husser
- Libération automatique des verrous à la déconnexion — Antoine Husser
- Intégration client côté application — Hugo

---

## Installation et démarrage

### Prérequis

- Node.js 18+
- PostgreSQL 16+
- Expo CLI

### Lancement global

```bash
npm install
npm run dev
```
