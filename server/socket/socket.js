const jwt = require("jsonwebtoken");
const pool = require("../config/db");

// Stocke les verrous actifs : { memberId: { userId, username, socketId } }
const locks = {};

function initSocket(io) {

  // Vérifie le JWT à la connexion Socket.IO (comme verifyToken mais pour les websockets)
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error("Token manquant"));
    }

    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET);

      pool.query("SELECT id, username, role, status FROM users WHERE id = $1", [payload.userId])
        .then(({ rows }) => {
          if (rows.length === 0) return next(new Error("Utilisateur introuvable"));
          if (rows[0].status !== "active") return next(new Error("Compte inactif"));
          socket.user = rows[0];
          next();
        })
        .catch(() => next(new Error("Erreur serveur")));
    } catch {
      return next(new Error("Token invalide"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`Socket connecté : ${socket.user.username} (${socket.id})`);

    // Rejoindre la room "tree" pour recevoir les mises à jour en temps réel
    socket.join("tree");

    // Envoie l'état actuel des verrous au nouveau connecté
    socket.emit("locks:state", locks);

    // ── Verrous ──────────────────────────────────────────────────────────────

    // Un éditeur commence à modifier un membre → pose un verrou
    socket.on("lock:acquire", (memberId) => {
      if (locks[memberId]) {
        // Verrou déjà pris par quelqu'un d'autre
        socket.emit("lock:denied", {
          memberId,
          lockedBy: locks[memberId].username,
        });
        return;
      }

      locks[memberId] = {
        userId: socket.user.id,
        username: socket.user.username,
        socketId: socket.id,
      };

      // Notifie tous les clients du nouveau verrou
      io.to("tree").emit("lock:acquired", {
        memberId,
        lockedBy: socket.user.username,
      });
    });

    // Un éditeur a fini de modifier → libère le verrou
    socket.on("lock:release", (memberId) => {
      if (locks[memberId] && locks[memberId].socketId === socket.id) {
        delete locks[memberId];
        io.to("tree").emit("lock:released", { memberId });
      }
    });

    // ── Mises à jour temps réel ───────────────────────────────────────────────

    // Diffuse une mise à jour de membre à tous les clients
    socket.on("member:updated", (member) => {
      // Libère automatiquement le verrou après modification
      if (locks[member.id] && locks[member.id].socketId === socket.id) {
        delete locks[member.id];
        io.to("tree").emit("lock:released", { memberId: member.id });
      }
      io.to("tree").emit("tree:member_updated", member);
    });

    // Diffuse un nouveau membre
    socket.on("member:created", (member) => {
      io.to("tree").emit("tree:member_created", member);
    });

    // Diffuse la suppression d'un membre
    socket.on("member:deleted", (memberId) => {
      io.to("tree").emit("tree:member_deleted", memberId);
    });

    // Diffuse une nouvelle relation
    socket.on("relation:created", (relation) => {
      io.to("tree").emit("tree:relation_created", relation);
    });

    // Diffuse la suppression d'une relation
    socket.on("relation:deleted", (relationId) => {
      io.to("tree").emit("tree:relation_deleted", relationId);
    });

    // ── Déconnexion ───────────────────────────────────────────────────────────

    // Libère tous les verrous du socket déconnecté
    socket.on("disconnect", () => {
      console.log(`Socket déconnecté : ${socket.user.username} (${socket.id})`);

      Object.keys(locks).forEach((memberId) => {
        if (locks[memberId].socketId === socket.id) {
          delete locks[memberId];
          io.to("tree").emit("lock:released", { memberId });
        }
      });
    });
  });
}

module.exports = initSocket;
