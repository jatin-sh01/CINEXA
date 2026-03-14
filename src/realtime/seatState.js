const LOCK_TTL_MS = 2 * 60 * 1000;

const seatStore = new Map();

function getOrCreateShowState(showId) {
  if (!seatStore.has(showId)) {
    seatStore.set(showId, {
      locked: new Map(),
      booked: new Set(),
    });
  }
  return seatStore.get(showId);
}

function cleanupExpiredLocks(showId) {
  const state = getOrCreateShowState(showId);
  const now = Date.now();
  const expired = [];

  for (const [seatId, lock] of state.locked.entries()) {
    if (lock.expiresAt <= now) {
      state.locked.delete(seatId);
      expired.push(seatId);
    }
  }

  return expired;
}

export function lockSeats(showId, seatIds, socketId, userId = null) {
  const state = getOrCreateShowState(showId);
  cleanupExpiredLocks(showId);

  const lockedSeatIds = [];
  const rejectedSeatIds = [];

  seatIds.forEach((seatId) => {
    if (state.booked.has(seatId)) {
      rejectedSeatIds.push(seatId);
      return;
    }

    const existing = state.locked.get(seatId);
    if (existing && existing.socketId !== socketId) {
      rejectedSeatIds.push(seatId);
      return;
    }

    state.locked.set(seatId, {
      socketId,
      userId,
      expiresAt: Date.now() + LOCK_TTL_MS,
    });
    lockedSeatIds.push(seatId);
  });

  return { lockedSeatIds, rejectedSeatIds };
}

export function releaseSeats(showId, seatIds, socketId) {
  const state = getOrCreateShowState(showId);
  const released = [];

  seatIds.forEach((seatId) => {
    const existing = state.locked.get(seatId);
    if (existing && existing.socketId === socketId) {
      state.locked.delete(seatId);
      released.push(seatId);
    }
  });

  return released;
}

export function releaseAllSeatsBySocket(socketId) {
  const releasedByShow = [];

  for (const [showId, state] of seatStore.entries()) {
    const released = [];
    for (const [seatId, lock] of state.locked.entries()) {
      if (lock.socketId === socketId) {
        state.locked.delete(seatId);
        released.push(seatId);
      }
    }

    if (released.length) {
      releasedByShow.push({ showId, seatIds: released });
    }
  }

  return releasedByShow;
}

export function markSeatsBooked(showId, seatIds) {
  const state = getOrCreateShowState(showId);
  seatIds.forEach((seatId) => {
    state.booked.add(seatId);
    state.locked.delete(seatId);
  });
}

export function hydrateBookedSeats(showId, seatIds) {
  const state = getOrCreateShowState(showId);
  state.booked = new Set(seatIds);

  for (const seatId of state.locked.keys()) {
    if (state.booked.has(seatId)) {
      state.locked.delete(seatId);
    }
  }
}

export function getSeatSnapshot(showId) {
  const state = getOrCreateShowState(showId);
  cleanupExpiredLocks(showId);

  return {
    lockedSeatIds: [...state.locked.keys()],
    bookedSeatIds: [...state.booked],
  };
}
