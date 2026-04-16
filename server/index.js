require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const initSocket = require("./socket/socket");

const authRoutes = require("./routes/auth");
const usersRoutes = require("./routes/users");
const membersRoutes = require("./routes/members");
const relationsRoutes = require("./routes/relations");
const treeRoutes = require("./routes/tree");
const statsRoutes = require("./routes/stats");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "*",
    methods: ["GET", "POST"],
  },
});

const PORT = process.env.PORT || 3000;

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", usersRoutes);
app.use("/api/v1/members", membersRoutes);
app.use("/api/v1/relations", relationsRoutes);
app.use("/api/v1/tree", treeRoutes);
app.use("/api/v1/stats", statsRoutes);

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  res.status(404).json({ message: "Route introuvable" });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Erreur interne du serveur" });
});

initSocket(io);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Serveur démarré sur http://0.0.0.0:${PORT}`);
});
