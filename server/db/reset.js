require("dotenv").config();
const pool = require("../config/db");
const fs = require("fs");
const path = require("path");

const rollbackSql = `
  DROP TABLE IF EXISTS relations;
  DROP TABLE IF EXISTS members;
  DROP TABLE IF EXISTS users;
`;

const initSql = fs.readFileSync(path.join(__dirname, "init.sql"), "utf8");

pool.query(rollbackSql)
  .then(() => pool.query(initSql))
  .then(() => {
    console.log("✅ Base de données réinitialisée avec succès");
    return pool.end();
  })
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Erreur lors de la réinitialisation:", err.message);
    process.exit(1);
  });
