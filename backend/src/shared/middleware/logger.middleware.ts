import morgan from 'morgan';
import { Request } from 'express';

// Custom token for user ID if available
morgan.token('user', (req: Request) => {
  return (req as any).user?.userId || '-';
});

// Development format - more detailed
const devFormat = ':method :url :status :response-time ms :res[content-length] - :user';

// Production format - concise
const prodFormat = ':method :url :status :response-time ms - :user';

export const apiLogger = (env: string = 'development') => {
  if (env === 'production') {
    return morgan(prodFormat, {
      skip: (req: Request) => {
        // Skip health check endpoints
        return req.url === '/api/health';
      },
    });
  }
  
  return morgan(devFormat, {
    skip: (req: Request) => {
      // Skip health check endpoints
      return req.url === '/api/health';
    },
  });
};
