require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on("connect", () => {
  console.log("Connecté à la base de données PostgreSQL");
});

pool.on("error", (err) => {
  console.error("Erreur de connexion à la base de données:", err);
});

module.exports = pool;
