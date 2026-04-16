const express = require("express");
const pool = require("../config/db");
const { verifyToken } = require("../middleware/auth");

const router = express.Router();

router.get("/", verifyToken, (req, res) => {
  const totalMembers = pool.query("SELECT COUNT(*) FROM members");

  const genderCount = pool.query(
    "SELECT gender, COUNT(*) FROM members GROUP BY gender"
  );

  const lifeExpectancy = pool.query(
    `SELECT ROUND(AVG(EXTRACT(YEAR FROM AGE(death_date, birth_date))), 1) AS avg_life_expectancy
     FROM members
     WHERE death_date IS NOT NULL AND birth_date IS NOT NULL`
  );

  const avgChildren = pool.query(
    `SELECT ROUND(AVG(child_count), 2) AS avg_children_per_parent
     FROM (
       SELECT member_a_id, COUNT(*) AS child_count
       FROM relations
       WHERE type = 'parent_child'
       GROUP BY member_a_id
     ) AS parent_counts`
  );

  const generations = pool.query(
    `WITH RECURSIVE gen AS (
       SELECT m.id, 1 AS generation
       FROM members m
       WHERE m.id NOT IN (
         SELECT member_b_id FROM relations WHERE type = 'parent_child'
       )
       UNION
       SELECT r.member_b_id AS id, g.generation + 1
       FROM relations r
       JOIN gen g ON r.member_a_id = g.id
       WHERE r.type = 'parent_child'
     )
     SELECT MAX(generation) AS total_generations FROM gen`
  );

  const couples = pool.query(
    "SELECT COUNT(*) FROM relations WHERE type = 'couple'"
  );

  Promise.all([totalMembers, genderCount, lifeExpectancy, avgChildren, generations, couples])
    .then(([totalRes, genderRes, lifeRes, avgChildRes, genRes, couplesRes]) => {
      const genderMap = {};
      genderRes.rows.forEach((row) => {
        genderMap[row.gender || "unknown"] = parseInt(row.count);
      });

      res.json({
        total_members: parseInt(totalRes.rows[0].count),
        gender_distribution: genderMap,
        avg_life_expectancy: lifeRes.rows[0].avg_life_expectancy
          ? parseFloat(lifeRes.rows[0].avg_life_expectancy)
          : null,
        avg_children_per_parent: avgChildRes.rows[0].avg_children_per_parent
          ? parseFloat(avgChildRes.rows[0].avg_children_per_parent)
          : null,
        total_generations: genRes.rows[0].total_generations
          ? parseInt(genRes.rows[0].total_generations)
          : 0,
        total_couples: parseInt(couplesRes.rows[0].count),
      });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ message: "Erreur serveur" });
    });
});

module.exports = router;
