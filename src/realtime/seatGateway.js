import {
  getSeatSnapshot,
  lockSeats,
  releaseAllSeatsBySocket,
  releaseSeats,
} from "./seatState.js";

function getRoom(showId) {
  return `show:${showId}`;
}

function normalizeSeatIds(seatIds) {
  if (!Array.isArray(seatIds)) return [];
  return seatIds
    .filter(Boolean)
    .map((s) => String(s).trim())
    .filter(Boolean);
}

export function registerSeatGateway(io) {
  io.on("connection", (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    socket.on("join_show", ({ showId } = {}) => {
      if (!showId) return;
      socket.join(getRoom(showId));
      socket.emit("seat_snapshot", {
        showId,
        ...getSeatSnapshot(showId),
      });
    });

    socket.on("leave_show", ({ showId } = {}) => {
      if (!showId) return;
      socket.leave(getRoom(showId));
    });

    socket.on("lock_seats", ({ showId, seatIds } = {}) => {
      if (!showId) return;
      const normalized = normalizeSeatIds(seatIds);
      if (!normalized.length) return;

      const { lockedSeatIds, rejectedSeatIds } = lockSeats(
        showId,
        normalized,
        socket.id
      );

      if (lockedSeatIds.length) {
        io.to(getRoom(showId)).emit("seat_locked", {
          showId,
          seatIds: lockedSeatIds,
        });
      }

      if (rejectedSeatIds.length) {
        socket.emit("seat_lock_rejected", { showId, seatIds: rejectedSeatIds });
      }
    });

    socket.on("release_seats", ({ showId, seatIds } = {}) => {
      if (!showId) return;
      const normalized = normalizeSeatIds(seatIds);
      if (!normalized.length) return;

      const releasedSeatIds = releaseSeats(showId, normalized, socket.id);
      if (releasedSeatIds.length) {
        io.to(getRoom(showId)).emit("seat_released", {
          showId,
          seatIds: releasedSeatIds,
        });
      }
    });

    socket.on("disconnect", () => {
      const releasedByShow = releaseAllSeatsBySocket(socket.id);
      releasedByShow.forEach(({ showId, seatIds }) => {
        io.to(getRoom(showId)).emit("seat_released", { showId, seatIds });
      });
    });
  });
}
