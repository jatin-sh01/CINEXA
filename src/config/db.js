import mongoose from 'mongoose';
import { config } from './config.js';
const connectDB = async () => {
  try {
    mongoose.connection.on('connected', () => {
      console.log('connected to database successfully');
    });
    mongoose.connection.on('error', (err) => {
      console.log('error in connecting database', err);
    });
    await mongoose.connect(config.DB_URI);
  } catch (err) {
    console.error('failed to connect database', err);
    process.exit(1);
  }
};

export default connectDB;
