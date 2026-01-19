import { config as conf } from 'dotenv';
conf();
const _config = {
  port: process.env.port,
  DB_URI: process.env.DB_URI,
  env: process.env.NODE_ENV,
};

export const config = Object.freeze(_config);
