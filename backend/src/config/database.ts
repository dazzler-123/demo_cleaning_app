import mongoose from 'mongoose';
import { config } from './index.js';

export async function connectDatabase(): Promise<void> {
  try {
    // Remove unsupported options from connection string if present
    let mongoUri = config.mongoUri;
    // Remove buffermaxentries from connection string (not supported by MongoDB driver)
    mongoUri = mongoUri.replace(/[?&]buffermaxentries=\d+/gi, '');
    // Clean up any double ? or & characters
    mongoUri = mongoUri.replace(/\?&/g, '?').replace(/&+/g, '&');
    
    // Set buffer options BEFORE connecting
    mongoose.set('bufferCommands', true);
    
    // Add connection options for better reliability in production
    const options = {
      serverSelectionTimeoutMS: 30000, // 30 seconds instead of default 10
      socketTimeoutMS: 45000, // 45 seconds
      connectTimeoutMS: 30000, // 30 seconds
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 2, // Maintain at least 2 socket connections
    };

    // Check if already connected
    if (mongoose.connection.readyState === 1) {
      console.log('[DB] MongoDB already connected');
      return;
    }

    // If connection is in progress, wait for it
    if (mongoose.connection.readyState === 2) {
      console.log('[DB] MongoDB connection in progress, waiting...');
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Database connection timeout while waiting for existing connection'));
        }, 30000);

        mongoose.connection.once('connected', () => {
          clearTimeout(timeout);
          resolve();
        });

        mongoose.connection.once('error', (err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });
      return;
    }

    console.log('[DB] Connecting to MongoDB...');
    await mongoose.connect(mongoUri, options);
    
    // Wait for connection to be fully ready
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Database connection timeout after 30 seconds'));
      }, 30000);

      if (mongoose.connection.readyState === 1) {
        clearTimeout(timeout);
        resolve();
        return;
      }

      mongoose.connection.once('connected', () => {
        clearTimeout(timeout);
        resolve();
      });

      mongoose.connection.once('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
    
    console.log('[DB] MongoDB connected successfully');

    // Add connection event handlers
    mongoose.connection.on('error', (err) => {
      console.error('[DB] MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('[DB] MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('[DB] MongoDB reconnected');
    });

    // Handle process termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('[DB] MongoDB connection closed through app termination');
      process.exit(0);
    });
  } catch (error) {
    console.error('[DB] MongoDB connection error:', error);
    // In Vercel/serverless, don't exit immediately - let it retry
    if (process.env.VERCEL !== '1') {
      process.exit(1);
    }
    throw error;
  }
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1; // 1 = connected
}
