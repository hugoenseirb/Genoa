require("dotenv").config();
const pool = require("../config/db");

const sql = `
  DROP TABLE IF EXISTS relations;
  DROP TABLE IF EXISTS members;
  DROP TABLE IF EXISTS users;
`;

pool.query(sql)
  .then(() => {
    console.log("✅ Tables supprimées avec succès");
    return pool.end();
  })
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Erreur lors du rollback:", err.message);
    process.exit(1);
  });
