import app from "./src/app.js";
import { config } from "./src/config/config.js";
import connectDB from "./src/config/db.js";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { setSocketIO } from "./src/realtime/io.js";
import { registerSeatGateway } from "./src/realtime/seatGateway.js";

const startServer = () => {
  connectDB();

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: /^http:\/\/(localhost|127\.0\.0\.1):\d+$/,
      credentials: true,
    },
  });

  setSocketIO(io);
  registerSeatGateway(io);

  httpServer.listen(config.port, () => {
    console.log(`server is running on ${config.port}`);
  });
};

startServer();
