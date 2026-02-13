import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
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

app.use(cors({ origin: true, credentials: true }));
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
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/agents', agentsRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/schedules', schedulesRoutes);
app.use('/api/assignments', assignmentsRoutes);
app.use('/api/task-logs', taskLogsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/audit', auditRoutes);

app.get('/api/health', (_req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  const readyStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  res.json({ 
    ok: dbStatus === 'connected', 
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
      readyState: mongoose.connection.readyState,
      readyStateText: readyStates[mongoose.connection.readyState as keyof typeof readyStates] || 'unknown'
    }
  });
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
