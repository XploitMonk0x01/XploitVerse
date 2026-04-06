import mongoose from "mongoose";
import config from "./index.js";
import { createModuleLogger } from '../utils/logger.js'

const log = createModuleLogger('mongodb')

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongoUri, {
      // Mongoose 8 uses these defaults, but being explicit for clarity
      autoIndex: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    log.info({ host: conn.connection.host }, 'MongoDB connected');

    // Handle connection events
    mongoose.connection.on("error", (err) => {
      log.error({ err }, 'MongoDB connection error');
    });

    mongoose.connection.on("disconnected", () => {
      log.warn('MongoDB disconnected, attempting to reconnect...');
    });

    mongoose.connection.on("reconnected", () => {
      log.info('MongoDB reconnected');
    });

    return conn;
  } catch (error) {
    log.fatal({ err: error.message }, 'MongoDB connection failed');
    process.exit(1);
  }
};

export default connectDB;
