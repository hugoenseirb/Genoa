# Genoa — Application de gestion d'arbre généalogique

INP – ENSEIRB-MATMECA – Télécom 2A  
ET8 PG219 : Développement d'applications pour terminaux mobiles

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Frontend | React Native (Expo) |
| Backend / API | Node.js + Express |
| Base de données | PostgreSQL |
| Authentification | JWT (jsonwebtoken + bcryptjs) |
| Temps réel | Socket.IO |
| Visualisation arbre | D3.js / d3-dag (via WebView) |

## Fonctionnalités implémentées

### 🔐 1. Inscription & Authentification — *Antoine Husser*
- Inscription avec email unique et mot de passe hashé (bcrypt)
- Le premier inscrit devient automatiquement administrateur
- Les inscriptions suivantes sont en attente de validation admin
- Connexion avec génération d'un JWT valide 24h
- Blocage de la connexion si le compte est en attente ou désactivé
- Route `GET /auth/me` pour récupérer l'utilisateur courant

### 👤 2. Gestion des utilisateurs (Administration) — *Antoine Husser*
- Liste de tous les utilisateurs
- Liste des inscriptions en attente
- Validation d'une inscription (pending → active)
- Modification du rôle d'un utilisateur (admin / editor / reader)
- Modification d'un compte (email, username, password)
- Création d'un compte pour un tiers directement actif
- Suppression d'un compte

### 🌳 3. Gestion des membres — *Antoine Husser (API) / Membre B (UI)*
- Création d'un membre avec tous les attributs : nom, prénom, sexe, photo, dates, professions, coordonnées, notes publiques/privées
- Modification et suppression d'un membre
- Upload de photo (jpeg, png, webp — 5MB max)
- Recherche par nom ou prénom (`?q=`)
- Les données privées (`notes_private`, `contacts`) sont masquées pour les lecteurs

### 🔗 4. Gestion des relations familiales — *Antoine Husser (API) / Membre B (UI)*
- Création de relations de type **couple** (avec dates d'union/séparation, type : mariage/partenariat)
- Création de relations **parent-enfant** (biologique ou adopté)
- Validation de cohérence : pas de doublon, pas de self-relation
- Détection de cycle : empêche qu'un descendant devienne ancêtre (CTE récursif PostgreSQL)
- Suppression d'une relation

### 📊 5. Visualisation de l'arbre généalogique — *Membre B*
- Affichage graphique interactif (D3.js via WebView)
- Zoom / déplacement
- Clic sur un nœud → détails du membre
- Filtres : ascendants, descendants, fratrie, conjoints

### 🔎 6. API de navigation dans l'arbre — *Antoine Husser*
- `GET /tree/:memberId` — sous-graphe (membre + parents + enfants + conjoints)
- `GET /tree/ancestors/:memberId` — tous les ancêtres (CTE récursif)
- `GET /tree/descendants/:memberId` — tous les descendants (CTE récursif)
- `GET /tree/siblings/:memberId` — fratrie

### 📈 7. Statistiques familiales — *Antoine Husser (API) / Membre B (UI)*
- Nombre total de membres
- Répartition hommes / femmes
- Espérance de vie moyenne (membres décédés)
- Nombre moyen d'enfants par parent
- Nombre de générations
- Nombre de couples

### 🛡️ 8. Gestion des droits & confidentialité — *Antoine Husser*
- 3 rôles : `admin`, `editor`, `reader`
- Middleware `verifyToken` : vérifie le JWT sur chaque route protégée
- Middleware `requireEditor` / `requireAdmin` : contrôle d'accès par rôle
- Données privées visibles uniquement par les éditeurs et administrateurs

### ⚡ 9. Temps réel Socket.IO — *Antoine Husser (serveur) / Membre B (client)*
- Authentification Socket.IO via JWT (handshake)
- Système de verrous : indique qu'un membre est en cours de modification
- Événements `lock:acquire`, `lock:release`, `lock:denied`
- Broadcast des modifications en temps réel : `tree:member_updated`, `tree:relation_created`, etc.
- Libération automatique des verrous à la déconnexion

---

## Installation et démarrage

### Prérequis
- Node.js 18+
- PostgreSQL 16+
- Expo CLI

### Backend

```bash
cd server
npm install
cp .env.example .env   # Remplir DATABASE_URL et JWT_SECRET
node db/migrate.js     # Initialiser la base de données
npm start              # Démarrer sur le port 3000
```

### Frontend

```bash
npm install
npx expo start
```

---

## Variables d'environnement

Copier `server/.env.example` en `server/.env` et remplir :

```
DATABASE_URL=postgresql://utilisateur@localhost:5432/genoa
JWT_SECRET=un_secret_long_et_aleatoire
JWT_EXPIRES_IN=24h
PORT=3000
CLIENT_URL=http://localhost:8081
UPLOAD_DIR=./uploads
```

---

## Routes API

| Méthode | Route | Rôle requis |
|---------|-------|-------------|
| POST | `/api/v1/auth/register` | Public |
| POST | `/api/v1/auth/login` | Public |
| GET | `/api/v1/auth/me` | Connecté |
| GET | `/api/v1/users` | Admin |
| GET | `/api/v1/users/pending` | Admin |
| PATCH | `/api/v1/users/:id/approve` | Admin |
| PATCH | `/api/v1/users/:id/role` | Admin |
| PUT | `/api/v1/users/:id` | Admin |
| POST | `/api/v1/users` | Admin |
| DELETE | `/api/v1/users/:id` | Admin |
| GET | `/api/v1/members` | Connecté |
| POST | `/api/v1/members` | Éditeur+ |
| GET | `/api/v1/members/:id` | Connecté |
| PUT | `/api/v1/members/:id` | Éditeur+ |
| DELETE | `/api/v1/members/:id` | Éditeur+ |
| POST | `/api/v1/members/:id/photo` | Éditeur+ |
| GET | `/api/v1/relations?memberId=` | Connecté |
| POST | `/api/v1/relations` | Éditeur+ |
| DELETE | `/api/v1/relations/:id` | Éditeur+ |
| GET | `/api/v1/tree/:memberId` | Connecté |
| GET | `/api/v1/tree/ancestors/:memberId` | Connecté |
| GET | `/api/v1/tree/descendants/:memberId` | Connecté |
| GET | `/api/v1/tree/siblings/:memberId` | Connecté |
| GET | `/api/v1/stats` | Connecté |

---

## Structure du projet

```
Genoa/
├── server/                  # API REST Node.js + Express
│   ├── config/db.js         # Connexion PostgreSQL
│   ├── middleware/
│   │   ├── auth.js          # verifyToken, requireRole
│   │   └── upload.js        # Multer photos
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── members.js
│   │   ├── relations.js
│   │   ├── tree.js
│   │   └── stats.js
│   ├── socket/socket.js     # Socket.IO
│   ├── db/
│   │   ├── init.sql         # Schéma BDD
│   │   ├── migrate.js
│   │   └── rollback.js
│   └── index.js             # Entry point
│
└── app/                     # Application React Native (Expo)
    └── ...
```
