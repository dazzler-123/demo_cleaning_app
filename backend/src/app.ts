import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { prisma } from './config/database.js';
import { config } from './config/index.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { usersRoutes } from './modules/users/users.routes.js';
import { agentsRoutes } from './modules/agents/agents.routes.js';
import { leadsRoutes } from './modules/leads/leads.routes.js';
import { schedulesRoutes } from './modules/schedules/schedules.routes.js';
import { assignmentsRoutes } from './modules/assignments/assignments.routes.js';
import { taskLogsRoutes } from './modules/task-logs/task-logs.routes.js';
import { dashboardRoutes } from './modules/dashboard/dashboard.routes.js';
import { auditRoutes } from './modules/audit/audit.routes.js';
import { apiLogger } from './shared/middleware/logger.middleware.js';
import { errorHandler } from './shared/middleware/errorHandler.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// CORS configuration - must be first middleware
app.use(cors({ 
  origin: ['http://localhost:5173', 'http://localhost:4000'], 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 0 // Set to 0 to disable preflight caching (for development - helps with cache issues)
}));

app.use(express.json());

// API Request Logging
app.use(apiLogger(config.nodeEnv));

// Serve uploaded images with proper headers
// Files are saved to src/shared/uploads/ (from upload middleware)
// When running from src/, __dirname is src/, so 'shared/uploads' = src/shared/uploads
// When compiled to dist/, __dirname is dist/, so '../src/shared/uploads' = src/shared/uploads
const uploadsPathDev = path.join(__dirname, 'shared', 'uploads');
const uploadsPathProd = path.join(__dirname, '../src/shared/uploads');
const uploadsPath = fs.existsSync(uploadsPathDev) ? uploadsPathDev : uploadsPathProd;
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/api/uploads', express.static(uploadsPath, {
  setHeaders: (res, filePath) => {
    res.set('Cache-Control', 'public, max-age=31536000');
    // Ensure CORS headers for images
    res.set('Access-Control-Allow-Origin', '*');
  },
}));
// Explicit OPTIONS handler for all API routes (before route handlers)
app.options('/api/*', cors({
  origin: ['http://localhost:5173', 'http://localhost:4000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 0
}));

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/agents', agentsRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/schedules', schedulesRoutes);
app.use('/api/assignments', assignmentsRoutes);
app.use('/api/task-logs', taskLogsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/audit', auditRoutes);

app.get('/api/health', async (_req, res) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    res.json({ 
      ok: true, 
      timestamp: new Date().toISOString(),
      database: {
        status: 'connected',
        provider: 'mysql'
      }
    });
  } catch (error) {
    res.status(503).json({ 
      ok: false, 
      timestamp: new Date().toISOString(),
      database: {
        status: 'disconnected',
        provider: 'mysql',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

// Debug endpoint to check uploads path
app.get('/api/debug/uploads-path', (_req, res) => {
  const uploadsPathDev = path.join(__dirname, 'shared', 'uploads');
  const uploadsPathProd = path.join(__dirname, '../src/shared/uploads');
  res.json({
    __dirname,
    uploadsPathDev,
    uploadsPathProd,
    devExists: fs.existsSync(uploadsPathDev),
    prodExists: fs.existsSync(uploadsPathProd),
    currentPath: fs.existsSync(uploadsPathDev) ? uploadsPathDev : uploadsPathProd,
  });
});

app.use(errorHandler);

export default app;
