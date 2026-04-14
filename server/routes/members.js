const express = require("express");
const pool = require("../config/db");
const upload = require("../middleware/upload");
const { verifyToken, requireEditor } = require("../middleware/auth");

const router = express.Router();

// GET /members
// Liste tous les membres. Les données privées sont masquées pour les lecteurs.
// Recherche par nom/prénom via ?q=
router.get("/", verifyToken, (req, res) => {
  const { q } = req.query;
  const isEditor = req.user.role === "admin" || req.user.role === "editor";

  let query;
  let params = [];

  if (q) {
    query = `
      SELECT id, first_name, last_name, gender, birth_date, birth_place,
             death_date, death_place, photo_url, is_private, notes_public,
             professions, created_by, created_at,
             ${isEditor ? "contacts, notes_private," : ""}
             CASE WHEN is_private = true AND $1 = false THEN NULL ELSE contacts END as contacts_visible
      FROM members
      WHERE lower(first_name) LIKE lower($${isEditor ? 1 : 1}) OR lower(last_name) LIKE lower($${isEditor ? 1 : 1})
      ORDER BY last_name, first_name
    `;

    // Requête simplifiée avec la logique de visibilité
    if (isEditor) {
      query = `
        SELECT id, first_name, last_name, gender, birth_date, birth_place,
               death_date, death_place, photo_url, is_private, notes_public,
               notes_private, contacts, professions, created_by, created_at
        FROM members
        WHERE lower(first_name) LIKE lower($1) OR lower(last_name) LIKE lower($1)
        ORDER BY last_name, first_name
      `;
      params = [`%${q}%`];
    } else {
      query = `
        SELECT id, first_name, last_name, gender, birth_date, birth_place,
               death_date, death_place, photo_url, is_private, notes_public,
               professions, created_by, created_at
        FROM members
        WHERE lower(first_name) LIKE lower($1) OR lower(last_name) LIKE lower($1)
        ORDER BY last_name, first_name
      `;
      params = [`%${q}%`];
    }
  } else {
    if (isEditor) {
      query = `
        SELECT id, first_name, last_name, gender, birth_date, birth_place,
               death_date, death_place, photo_url, is_private, notes_public,
               notes_private, contacts, professions, created_by, created_at
        FROM members
        ORDER BY last_name, first_name
      `;
    } else {
      query = `
        SELECT id, first_name, last_name, gender, birth_date, birth_place,
               death_date, death_place, photo_url, is_private, notes_public,
               professions, created_by, created_at
        FROM members
        ORDER BY last_name, first_name
      `;
    }
  }

  pool.query(query, params)
    .then(({ rows }) => res.json(rows))
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: "Erreur serveur" });
    });
});

// GET /members/:id
// Détail d'un membre. Les champs privés sont masqués pour les lecteurs.
router.get("/:id", verifyToken, (req, res) => {
  const isEditor = req.user.role === "admin" || req.user.role === "editor";

  const query = isEditor
    ? `SELECT id, first_name, last_name, gender, birth_date, birth_place,
              death_date, death_place, photo_url, is_private, notes_public,
              notes_private, contacts, professions, created_by, created_at
       FROM members WHERE id = $1`
    : `SELECT id, first_name, last_name, gender, birth_date, birth_place,
              death_date, death_place, photo_url, is_private, notes_public,
              professions, created_by, created_at
       FROM members WHERE id = $1`;

  pool.query(query, [req.params.id])
    .then(({ rows }) => {
      if (rows.length === 0) {
        return res.status(404).json({ message: "Membre introuvable" });
      }
      const member = rows[0];
      // Si le membre est privé et que l'utilisateur est lecteur, on masque les champs sensibles
      if (member.is_private && !isEditor && req.user.id !== member.created_by) {
        member.contacts = null;
        member.notes_public = null;
      }
      res.json(member);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: "Erreur serveur" });
    });
});

// POST /members
// Créer un nouveau membre de la famille
router.post("/", verifyToken, requireEditor, (req, res) => {
  const {
    first_name, last_name, gender, birth_date, birth_place,
    death_date, death_place, is_private, notes_public,
    notes_private, contacts, professions
  } = req.body;

  if (!first_name || !last_name) {
    return res.status(400).json({ message: "first_name et last_name sont requis" });
  }

  pool.query(
    `INSERT INTO members
      (first_name, last_name, gender, birth_date, birth_place, death_date, death_place,
       is_private, notes_public, notes_private, contacts, professions, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [
      first_name, last_name, gender || null, birth_date || null, birth_place || null,
      death_date || null, death_place || null, is_private || false,
      notes_public || null, notes_private || null,
      contacts ? JSON.stringify(contacts) : null,
      professions ? JSON.stringify(professions) : null,
      req.user.id
    ]
  )
    .then(({ rows }) => res.status(201).json(rows[0]))
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: "Erreur serveur" });
    });
});

// PUT /members/:id
// Modifier un membre existant
router.put("/:id", verifyToken, requireEditor, (req, res) => {
  const {
    first_name, last_name, gender, birth_date, birth_place,
    death_date, death_place, is_private, notes_public,
    notes_private, contacts, professions
  } = req.body;

  if (!first_name || !last_name) {
    return res.status(400).json({ message: "first_name et last_name sont requis" });
  }

  pool.query(
    `UPDATE members SET
      first_name=$1, last_name=$2, gender=$3, birth_date=$4, birth_place=$5,
      death_date=$6, death_place=$7, is_private=$8, notes_public=$9,
      notes_private=$10, contacts=$11, professions=$12
     WHERE id=$13
     RETURNING *`,
    [
      first_name, last_name, gender || null, birth_date || null, birth_place || null,
      death_date || null, death_place || null, is_private || false,
      notes_public || null, notes_private || null,
      contacts ? JSON.stringify(contacts) : null,
      professions ? JSON.stringify(professions) : null,
      req.params.id
    ]
  )
    .then(({ rows }) => {
      if (rows.length === 0) {
        return res.status(404).json({ message: "Membre introuvable" });
      }
      res.json(rows[0]);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: "Erreur serveur" });
    });
});

// DELETE /members/:id
// Supprimer un membre
router.delete("/:id", verifyToken, requireEditor, (req, res) => {
  pool.query("DELETE FROM members WHERE id = $1 RETURNING id", [req.params.id])
    .then(({ rows }) => {
      if (rows.length === 0) {
        return res.status(404).json({ message: "Membre introuvable" });
      }
      res.status(204).send();
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: "Erreur serveur" });
    });
});

// POST /members/:id/photo
// Upload de la photo d'un membre
router.post("/:id/photo", verifyToken, requireEditor, upload.single("photo"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Aucun fichier envoyé" });
  }

  const photoUrl = `/uploads/${req.file.filename}`;

  pool.query(
    "UPDATE members SET photo_url = $1 WHERE id = $2 RETURNING id, photo_url",
    [photoUrl, req.params.id]
  )
    .then(({ rows }) => {
      if (rows.length === 0) {
        return res.status(404).json({ message: "Membre introuvable" });
      }
      res.json({ message: "Photo mise à jour", photo_url: rows[0].photo_url });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: "Erreur serveur" });
    });
});

module.exports = router;
