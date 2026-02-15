import type { VercelRequest, VercelResponse } from '@vercel/node';

// Dynamic imports to handle path resolution
let app: any;
let connectDatabase: () => Promise<void>;

// Initialize modules - try dist first, fallback to src
let modulesInitialized = false;
async function initializeModules() {
  if (modulesInitialized) {
    return; // Already initialized
  }

  try {
    // Try importing from dist (production build)
    const appModule = await import('../dist/app.js');
    const dbModule = await import('../dist/config/database.js');
      app = appModule.default;
      connectDatabase = dbModule.connectDatabase;
      modulesInitialized = true;
      console.log('[Vercel] Loaded modules from dist');
  } catch (distError) {
    try {
      // Fallback to src (development/TypeScript)
      const appModule = await import('../src/app.js');
      const dbModule = await import('../src/config/database.js');
      app = appModule.default;
      connectDatabase = dbModule.connectDatabase;
      modulesInitialized = true;
      console.log('[Vercel] Loaded modules from src');
    } catch (srcError) {
      console.error('[Vercel] Failed to load modules from both dist and src');
      console.error('Dist error:', distError);
      console.error('Src error:', srcError);
      throw new Error('Failed to load application modules');
    }
  }
}

// Cache the connection promise to avoid multiple connection attempts
let connectionPromise: Promise<void> | null = null;

async function ensureDatabaseConnection(): Promise<void> {
  // Ensure modules are loaded first
  await initializeModules();

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

