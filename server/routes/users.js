const express = require("express");
const bcrypt = require("bcryptjs");
const pool = require("../config/db");
const { verifyToken, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// Toutes les routes de ce fichier nécessitent d'être connecté et admin
router.use(verifyToken, requireAdmin);

// GET /users
// Liste tous les utilisateurs (sans le mot de passe)
router.get("/", (req, res) => {
  pool.query(
    "SELECT id, email, username, role, status, created_at, updated_at FROM users ORDER BY created_at DESC"
  )
    .then(({ rows }) => res.json(rows))
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: "Erreur serveur" });
    });
});

// GET /users/pending
// Liste uniquement les inscriptions en attente de validation
router.get("/pending", (req, res) => {
  pool.query(
    "SELECT id, email, username, role, status, created_at FROM users WHERE status = 'pending' ORDER BY created_at ASC"
  )
    .then(({ rows }) => res.json(rows))
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: "Erreur serveur" });
    });
});

// PATCH /users/:id/approve
// Valider l'inscription d'un utilisateur (pending → active)
router.patch("/:id/approve", (req, res) => {
  pool.query(
    "UPDATE users SET status = 'active' WHERE id = $1 AND status = 'pending' RETURNING id, email, username, role, status",
    [req.params.id]
  )
    .then(({ rows }) => {
      if (rows.length === 0) {
        return res.status(404).json({ message: "Utilisateur introuvable ou déjà validé" });
      }
      res.json({ message: "Utilisateur validé", user: rows[0] });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: "Erreur serveur" });
    });
});

// PATCH /users/:id/role
// Modifier le rôle d'un utilisateur (admin, editor, reader)
router.patch("/:id/role", (req, res) => {
  const { role } = req.body;
  const validRoles = ["admin", "editor", "reader"];

  if (!role || !validRoles.includes(role)) {
    return res.status(400).json({ message: "Rôle invalide. Valeurs acceptées : admin, editor, reader" });
  }

  // Un admin ne peut pas se retirer ses propres droits admin
  if (req.params.id === req.user.id && role !== "admin") {
    return res.status(403).json({ message: "Vous ne pouvez pas modifier votre propre rôle" });
  }

  pool.query(
    "UPDATE users SET role = $1 WHERE id = $2 RETURNING id, email, username, role, status",
    [role, req.params.id]
  )
    .then(({ rows }) => {
      if (rows.length === 0) {
        return res.status(404).json({ message: "Utilisateur introuvable" });
      }
      res.json({ message: "Rôle mis à jour", user: rows[0] });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: "Erreur serveur" });
    });
});

// PUT /users/:id
// Modifier un compte utilisateur (email, username, password optionnel)
router.put("/:id", (req, res) => {
  const { email, username, password } = req.body;

  if (!email || !username) {
    return res.status(400).json({ message: "email et username sont requis" });
  }

  // Si un nouveau mot de passe est fourni on le hache, sinon on fait la mise à jour directement
  const doUpdate = (hashedPassword) => {
    if (hashedPassword) {
      return pool.query(
        "UPDATE users SET email = $1, username = $2, password = $3 WHERE id = $4 RETURNING id, email, username, role, status",
        [email, username, hashedPassword, req.params.id]
      );
    }
    return pool.query(
      "UPDATE users SET email = $1, username = $2 WHERE id = $3 RETURNING id, email, username, role, status",
      [email, username, req.params.id]
    );
  };

  const start = password ? bcrypt.hash(password, 10) : Promise.resolve(null);

  start
    .then((hash) => doUpdate(hash))
    .then(({ rows }) => {
      if (rows.length === 0) {
        return res.status(404).json({ message: "Utilisateur introuvable" });
      }
      res.json({ message: "Compte mis à jour", user: rows[0] });
    })
    .catch((err) => {
      if (err.code === "23505") {
        return res.status(409).json({ message: "Cet email est déjà utilisé" });
      }
      console.error(err);
      res.status(500).json({ message: "Erreur serveur" });
    });
});

// POST /users
// Créer un compte pour un tiers (admin crée directement un compte actif)
router.post("/", (req, res) => {
  const { email, password, username, role } = req.body;
  const validRoles = ["admin", "editor", "reader"];

  if (!email || !password || !username) {
    return res.status(400).json({ message: "email, password et username sont requis" });
  }
  if (role && !validRoles.includes(role)) {
    return res.status(400).json({ message: "Rôle invalide" });
  }

  bcrypt.hash(password, 10)
    .then((hashedPassword) => {
      return pool.query(
        `INSERT INTO users (email, password, username, role, status)
         VALUES ($1, $2, $3, $4, 'active')
         RETURNING id, email, username, role, status, created_at`,
        [email, hashedPassword, username, role || "reader"]
      );
    })
    .then(({ rows }) => {
      res.status(201).json({ message: "Compte créé", user: rows[0] });
    })
    .catch((err) => {
      if (err.code === "23505") {
        return res.status(409).json({ message: "Cet email est déjà utilisé" });
      }
      console.error(err);
      res.status(500).json({ message: "Erreur serveur" });
    });
});

// DELETE /users/:id
// Supprimer un compte utilisateur
router.delete("/:id", (req, res) => {
  // Un admin ne peut pas se supprimer lui-même
  if (req.params.id === req.user.id) {
    return res.status(403).json({ message: "Vous ne pouvez pas supprimer votre propre compte" });
  }

  pool.query("DELETE FROM users WHERE id = $1 RETURNING id", [req.params.id])
    .then(({ rows }) => {
      if (rows.length === 0) {
        return res.status(404).json({ message: "Utilisateur introuvable" });
      }
      res.status(204).send();
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: "Erreur serveur" });
    });
});

module.exports = router;
