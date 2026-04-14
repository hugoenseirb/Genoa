const jwt = require("jsonwebtoken");
const pool = require("../config/db");

// Vérifie le JWT et attache req.user — inspiré du verifyToken de TP3
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token manquant ou invalide" });
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    pool.query(
      "SELECT id, email, username, role, status FROM users WHERE id = $1",
      [payload.userId]
    )
      .then(({ rows }) => {
        if (rows.length === 0) {
          return res.status(401).json({ message: "Utilisateur introuvable" });
        }
        const user = rows[0];
        if (user.status !== "active") {
          return res.status(403).json({ message: "Compte désactivé ou en attente de validation" });
        }
        req.user = user;
        next();
      })
      .catch(() => res.status(500).json({ message: "Erreur serveur" }));
  } catch {
    return res.status(401).json({ message: "Token invalide ou expiré" });
  }
};

// Vérifie que l'utilisateur a bien un des rôles requis
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Non authentifié" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Droits insuffisants" });
    }
    next();
  };
};

const requireAdmin = requireRole("admin");
const requireEditor = requireRole("admin", "editor");

module.exports = { verifyToken, requireRole, requireAdmin, requireEditor };
