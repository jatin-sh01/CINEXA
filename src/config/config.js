import { config as conf } from "dotenv";
conf();
const _config = {
  port: process.env.PORT,
  DB_URI: process.env.DB_URI,
  env: process.env.NODE_ENV,
  JWT_SECRET: process.env.JWT_SECRET,

};

export const config = Object.freeze(_config);
