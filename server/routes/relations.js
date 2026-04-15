const express = require("express");
const pool = require("../config/db");
const { verifyToken, requireEditor } = require("../middleware/auth");

const router = express.Router();

// GET /relations?memberId=xxx  ou  GET /relations (toutes)
// Sans memberId : retourne toutes les relations (pour la visualisation de l'arbre)
// Avec memberId : retourne uniquement les relations d'un membre
router.get("/", verifyToken, (req, res) => {
  const { memberId } = req.query;

  if (memberId) {
    pool.query(
      `SELECT r.*,
         ma.first_name AS member_a_first_name, ma.last_name AS member_a_last_name,
         mb.first_name AS member_b_first_name, mb.last_name AS member_b_last_name
       FROM relations r
       JOIN members ma ON ma.id = r.member_a_id
       JOIN members mb ON mb.id = r.member_b_id
       WHERE r.member_a_id = $1 OR r.member_b_id = $1
       ORDER BY r.created_at`,
      [memberId]
    )
      .then(({ rows }) => res.json(rows))
      .catch((err) => {
        console.error(err);
        res.status(500).json({ message: "Erreur serveur" });
      });
  } else {
    pool.query(
      `SELECT r.*,
         ma.first_name AS member_a_first_name, ma.last_name AS member_a_last_name,
         mb.first_name AS member_b_first_name, mb.last_name AS member_b_last_name
       FROM relations r
       JOIN members ma ON ma.id = r.member_a_id
       JOIN members mb ON mb.id = r.member_b_id
       ORDER BY r.created_at`
    )
      .then(({ rows }) => res.json(rows))
      .catch((err) => {
        console.error(err);
        res.status(500).json({ message: "Erreur serveur" });
      });
  }
});

// POST /relations
// Créer une relation entre deux membres (couple ou parent-enfant)
router.post("/", verifyToken, requireEditor, (req, res) => {
  const { type, member_a_id, member_b_id, union_date, separation_date, union_type, filiation_type } = req.body;

  if (!type || !member_a_id || !member_b_id) {
    return res.status(400).json({ message: "type, member_a_id et member_b_id sont requis" });
  }

  const validTypes = ["couple", "parent_child"];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ message: "type doit être 'couple' ou 'parent_child'" });
  }

  if (member_a_id === member_b_id) {
    return res.status(400).json({ message: "Un membre ne peut pas avoir une relation avec lui-même" });
  }

  // Vérifie que les deux membres existent
  pool.query("SELECT id FROM members WHERE id = ANY($1)", [[member_a_id, member_b_id]])
    .then(({ rows }) => {
      if (rows.length < 2) {
        return res.status(404).json({ message: "Un ou plusieurs membres introuvables" });
      }

      // Vérifie qu'une relation identique n'existe pas déjà
      return pool.query(
        `SELECT id FROM relations
         WHERE type = $1
           AND ((member_a_id = $2 AND member_b_id = $3) OR (member_a_id = $3 AND member_b_id = $2))`,
        [type, member_a_id, member_b_id]
      );
    })
    .then((result) => {
      // result est undefined si on a retourné une réponse 404 plus haut
      if (!result) return;

      if (result.rows.length > 0) {
        return res.status(409).json({ message: "Cette relation existe déjà" });
      }

      // Pour parent_child : vérifie qu'un enfant ne devient pas son propre ancêtre (cycle)
      if (type === "parent_child") {
        return checkCycle(member_b_id, member_a_id).then((hasCycle) => {
          if (hasCycle) {
            return res.status(400).json({ message: "Cette relation créerait un cycle impossible dans l'arbre" });
          }
          return insertRelation(res, type, member_a_id, member_b_id, union_date, separation_date, union_type, filiation_type);
        });
      }

      return insertRelation(res, type, member_a_id, member_b_id, union_date, separation_date, union_type, filiation_type);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: "Erreur serveur" });
    });
});

// Vérifie qu'en ajoutant parent→enfant on ne crée pas un cycle
// (un descendant de l'enfant ne doit pas être déjà ancêtre du parent)
function checkCycle(childId, parentId) {
  return pool.query(
    `WITH RECURSIVE descendants AS (
       SELECT member_b_id AS id FROM relations WHERE member_a_id = $1 AND type = 'parent_child'
       UNION
       SELECT r.member_b_id FROM relations r JOIN descendants d ON r.member_a_id = d.id WHERE r.type = 'parent_child'
     )
     SELECT id FROM descendants WHERE id = $2`,
    [childId, parentId]
  ).then(({ rows }) => rows.length > 0);
}

function insertRelation(res, type, member_a_id, member_b_id, union_date, separation_date, union_type, filiation_type) {
  return pool.query(
    `INSERT INTO relations (type, member_a_id, member_b_id, union_date, separation_date, union_type, filiation_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [type, member_a_id, member_b_id, union_date || null, separation_date || null, union_type || null, filiation_type || null]
  ).then(({ rows }) => res.status(201).json(rows[0]));
}

// DELETE /relations/:id
// Supprimer une relation
router.delete("/:id", verifyToken, requireEditor, (req, res) => {
  pool.query("DELETE FROM relations WHERE id = $1 RETURNING id", [req.params.id])
    .then(({ rows }) => {
      if (rows.length === 0) {
        return res.status(404).json({ message: "Relation introuvable" });
      }
      res.status(204).send();
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: "Erreur serveur" });
    });
});

module.exports = router;
