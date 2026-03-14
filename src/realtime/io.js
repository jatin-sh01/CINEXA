let io = null;

export function setSocketIO(instance) {
  io = instance;
}

export function getSocketIO() {
  return io;
}
