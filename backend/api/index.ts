import type { VercelRequest, VercelResponse } from '@vercel/node';
import mongoose from 'mongoose';
import app from '../dist/app.js';
import { connectDatabase } from '../dist/config/database.js';

// Cache the connection promise to avoid multiple connection attempts
let connectionPromise: Promise<void> | null = null;

async function ensureDatabaseConnection(): Promise<void> {
  // Check if already connected using mongoose connection state
  if (mongoose.connection.readyState === 1) {
    return; // Already connected
  }

  // If connection is in progress, wait for it
  if (connectionPromise) {
    return connectionPromise;
  }

  // Start new connection
  connectionPromise = (async () => {
    try {
      await connectDatabase();
      console.log('[Vercel] Database connected successfully');
    } catch (error) {
      console.error('[Vercel] Database connection failed:', error);
      connectionPromise = null; // Reset on error so we can retry
      throw error;
    }
  })();

  return connectionPromise;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<VercelResponse | void> {
  try {
    // Ensure database is connected before handling request
    await ensureDatabaseConnection();

    // Handle request with Express app
    return new Promise((resolve) => {
      app(req, res, () => {
        resolve(undefined);
      });
    });
  } catch (error) {
    console.error('[Vercel] Handler error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

