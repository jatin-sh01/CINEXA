import app from './src/app.js';
import { config } from './src/config/config.js';
import connectDB from './src/config/db.js';
const startServer = () => {
  connectDB();
  const server = app.listen(config.port, () => {
    console.log(`server is running on ${config.port}`);
  });
};

startServer();
