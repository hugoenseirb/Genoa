require("dotenv").config();
const fs = require("fs");
const path = require("path");
const pool = require("../config/db");

const sql = fs.readFileSync(path.join(__dirname, "init.sql"), "utf8");

pool.query(sql)
  .then(() => {
    console.log("✅ Base de données initialisée avec succès");
    return pool.end();
  })
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Erreur lors de l'initialisation:", err.message);
    process.exit(1);
  });
