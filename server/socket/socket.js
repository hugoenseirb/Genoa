const jwt = require("jsonwebtoken");
const pool = require("../config/db");

const locks = {};

function initSocket(io) {
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
    socket.join("tree");
    socket.emit("locks:state", locks);

    socket.on("lock:acquire", (memberId) => {
      if (locks[memberId]) {
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

      io.to("tree").emit("lock:acquired", {
        memberId,
        lockedBy: socket.user.username,
      });
    });

    socket.on("lock:release", (memberId) => {
      if (locks[memberId] && locks[memberId].socketId === socket.id) {
        delete locks[memberId];
        io.to("tree").emit("lock:released", { memberId });
      }
    });

    socket.on("member:updated", (member) => {
      if (locks[member.id] && locks[member.id].socketId === socket.id) {
        delete locks[member.id];
        io.to("tree").emit("lock:released", { memberId: member.id });
      }
      io.to("tree").emit("tree:member_updated", member);
    });

    socket.on("member:created", (member) => {
      io.to("tree").emit("tree:member_created", member);
    });

    socket.on("member:deleted", (memberId) => {
      io.to("tree").emit("tree:member_deleted", memberId);
    });

    socket.on("relation:created", (relation) => {
      io.to("tree").emit("tree:relation_created", relation);
    });

    socket.on("relation:deleted", (relationId) => {
      io.to("tree").emit("tree:relation_deleted", relationId);
    });

    socket.on("disconnect", () => {
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
