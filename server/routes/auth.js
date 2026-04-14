const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const pool = require("../config/db");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

// POST /auth/register
// Inscription. Le 1er utilisateur inscrit devient automatiquement admin (status=active).
// Les suivants ont status=pending et doivent être validés par un admin.
router.post("/register", (req, res) => {
  const { email, password, username } = req.body;

  if (!email || !password || !username) {
    return res.status(400).json({ message: "email, password et username sont requis" });
  }

  // Vérifie si c'est le premier utilisateur
  pool.query("SELECT COUNT(*) FROM users")
    .then(({ rows }) => {
      const isFirst = parseInt(rows[0].count) === 0;
      const role = isFirst ? "admin" : "reader";
      const status = isFirst ? "active" : "pending";

      return bcrypt.hash(password, 10).then((hashedPassword) => {
        return pool.query(
          `INSERT INTO users (email, password, username, role, status)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, email, username, role, status, created_at`,
          [email, hashedPassword, username, role, status]
        );
      });
    })
    .then(({ rows }) => {
      const user = rows[0];
      if (user.status === "pending") {
        return res.status(201).json({
          message: "Inscription réussie. En attente de validation par un administrateur.",
          user,
        });
      }
      // Premier utilisateur : on retourne directement un token
      const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
      );
      res.status(201).json({ message: "Compte administrateur créé.", token, user });
    })
    .catch((err) => {
      if (err.code === "23505") {
        return res.status(409).json({ message: "Cet email est déjà utilisé" });
      }
      console.error(err);
      res.status(500).json({ message: "Erreur serveur" });
    });
});

// POST /auth/login
// Connexion. Bloqué si status !== 'active'.
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "email et password sont requis" });
  }

  pool.query("SELECT * FROM users WHERE email = $1", [email])
    .then(({ rows }) => {
      if (rows.length === 0) {
        return res.status(401).json({ message: "Email ou mot de passe incorrect" });
      }

      const user = rows[0];

      if (user.status === "pending") {
        return res.status(403).json({ message: "Votre compte est en attente de validation par un administrateur" });
      }
      if (user.status === "disabled") {
        return res.status(403).json({ message: "Votre compte a été désactivé" });
      }

      return bcrypt.compare(password, user.password).then((match) => {
        if (!match) {
          return res.status(401).json({ message: "Email ou mot de passe incorrect" });
        }

        const token = jwt.sign(
          { userId: user.id, role: user.role },
          process.env.JWT_SECRET,
          { expiresIn: process.env.JWT_EXPIRES_IN || "24h" }
        );

        delete user.password;
        res.json({ token, user });
      });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: "Erreur serveur" });
    });
});

// GET /auth/me
// Retourne l'utilisateur courant (token requis).
router.get("/me", verifyToken, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
