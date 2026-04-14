const express = require("express");
const pool = require("../config/db");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

// GET /tree/:memberId
// Retourne le sous-graphe autour d'un membre : lui-même + parents + enfants + conjoints
// Paramètres optionnels : ?depth=1 (profondeur) &direction=all|ancestors|descendants
router.get("/:memberId", verifyToken, (req, res) => {
  const { memberId } = req.params;
  const direction = req.query.direction || "all";
  const isEditor = req.user.role === "admin" || req.user.role === "editor";

  const memberFields = isEditor
    ? "id, first_name, last_name, gender, birth_date, death_date, photo_url, is_private, notes_public, notes_private, contacts, professions"
    : "id, first_name, last_name, gender, birth_date, death_date, photo_url, is_private, notes_public";

  // On récupère le membre central, ses parents, ses enfants et ses conjoints en 3 requêtes parallèles
  const getMember = pool.query(`SELECT ${memberFields} FROM members WHERE id = $1`, [memberId]);

  const getParents = pool.query(
    `SELECT ${memberFields}
     FROM members
     WHERE id IN (
       SELECT member_a_id FROM relations
       WHERE member_b_id = $1 AND type = 'parent_child'
     )`,
    [memberId]
  );

  const getChildren = pool.query(
    `SELECT ${memberFields}
     FROM members
     WHERE id IN (
       SELECT member_b_id FROM relations
       WHERE member_a_id = $1 AND type = 'parent_child'
     )`,
    [memberId]
  );

  const getSpouses = pool.query(
    `SELECT ${memberFields}
     FROM members
     WHERE id IN (
       SELECT CASE WHEN member_a_id = $1 THEN member_b_id ELSE member_a_id END
       FROM relations
       WHERE (member_a_id = $1 OR member_b_id = $1) AND type = 'couple'
     )`,
    [memberId]
  );

  const getRelations = pool.query(
    `SELECT * FROM relations
     WHERE member_a_id = $1 OR member_b_id = $1`,
    [memberId]
  );

  Promise.all([getMember, getParents, getChildren, getSpouses, getRelations])
    .then(([memberRes, parentsRes, childrenRes, spousesRes, relationsRes]) => {
      if (memberRes.rows.length === 0) {
        return res.status(404).json({ message: "Membre introuvable" });
      }

      const result = {
        member: memberRes.rows[0],
        parents: parentsRes.rows,
        children: childrenRes.rows,
        spouses: spousesRes.rows,
        relations: relationsRes.rows,
      };

      if (direction === "ancestors") {
        delete result.children;
        delete result.spouses;
      } else if (direction === "descendants") {
        delete result.parents;
        delete result.spouses;
      }

      res.json(result);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: "Erreur serveur" });
    });
});

// GET /tree/ancestors/:memberId
// Tous les ancêtres d'un membre via CTE récursif
router.get("/ancestors/:memberId", verifyToken, (req, res) => {
  const isEditor = req.user.role === "admin" || req.user.role === "editor";
  const memberFields = isEditor
    ? "m.id, m.first_name, m.last_name, m.gender, m.birth_date, m.death_date, m.photo_url"
    : "m.id, m.first_name, m.last_name, m.gender, m.birth_date, m.death_date, m.photo_url";

  pool.query(
    `WITH RECURSIVE ancestors AS (
       -- Point de départ : parents directs
       SELECT r.member_a_id AS id, 1 AS generation
       FROM relations r
       WHERE r.member_b_id = $1 AND r.type = 'parent_child'

       UNION

       -- Remonte récursivement
       SELECT r.member_a_id AS id, a.generation + 1
       FROM relations r
       JOIN ancestors a ON r.member_b_id = a.id
       WHERE r.type = 'parent_child'
     )
     SELECT ${memberFields}, a.generation
     FROM ancestors a
     JOIN members m ON m.id = a.id
     ORDER BY a.generation, m.last_name`,
    [req.params.memberId]
  )
    .then(({ rows }) => res.json(rows))
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: "Erreur serveur" });
    });
});

// GET /tree/descendants/:memberId
// Tous les descendants d'un membre via CTE récursif
router.get("/descendants/:memberId", verifyToken, (req, res) => {
  const isEditor = req.user.role === "admin" || req.user.role === "editor";
  const memberFields = isEditor
    ? "m.id, m.first_name, m.last_name, m.gender, m.birth_date, m.death_date, m.photo_url"
    : "m.id, m.first_name, m.last_name, m.gender, m.birth_date, m.death_date, m.photo_url";

  pool.query(
    `WITH RECURSIVE descendants AS (
       -- Point de départ : enfants directs
       SELECT r.member_b_id AS id, 1 AS generation
       FROM relations r
       WHERE r.member_a_id = $1 AND r.type = 'parent_child'

       UNION

       -- Descend récursivement
       SELECT r.member_b_id AS id, d.generation + 1
       FROM relations r
       JOIN descendants d ON r.member_a_id = d.id
       WHERE r.type = 'parent_child'
     )
     SELECT ${memberFields}, d.generation
     FROM descendants d
     JOIN members m ON m.id = d.id
     ORDER BY d.generation, m.last_name`,
    [req.params.memberId]
  )
    .then(({ rows }) => res.json(rows))
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: "Erreur serveur" });
    });
});

// GET /tree/siblings/:memberId
// Fratrie d'un membre (même parent)
router.get("/siblings/:memberId", verifyToken, (req, res) => {
  pool.query(
    `SELECT m.id, m.first_name, m.last_name, m.gender, m.birth_date, m.death_date, m.photo_url
     FROM members m
     WHERE m.id != $1
       AND m.id IN (
         -- Tous les enfants des parents du membre
         SELECT r2.member_b_id
         FROM relations r1
         JOIN relations r2 ON r1.member_a_id = r2.member_a_id
         WHERE r1.member_b_id = $1
           AND r1.type = 'parent_child'
           AND r2.type = 'parent_child'
       )
     ORDER BY m.birth_date`,
    [req.params.memberId]
  )
    .then(({ rows }) => res.json(rows))
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: "Erreur serveur" });
    });
});

module.exports = router;
