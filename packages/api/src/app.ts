import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import { config } from './config/env';
import { errorHandler } from './middleware/errorHandler';

// Import routes (to be created)
import authRoutes from './routes/auth.routes';
import teamRoutes from './routes/team.routes';
import playerRoutes from './routes/player.routes';
import gameRoutes from './routes/game.routes';
import atBatRoutes from './routes/atBat.routes';
import pitchRoutes from './routes/pitch.routes';
import playRoutes from './routes/play.routes';
import analyticsRoutes from './routes/analytics.routes';

const app: Application = express();

// Middleware
app.use(cors({ origin: config.cors.origin }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next) => {
  console.log('📥 Incoming Request:');
  console.log('  Method:', req.method);
  console.log('  Path:', req.path);
  console.log('  URL:', req.url);
  console.log('  Query:', JSON.stringify(req.query));
  console.log('  Body:', JSON.stringify(req.body));
  console.log('  Headers:', JSON.stringify({
    'content-type': req.headers['content-type'],
    'origin': req.headers['origin'],
    'user-agent': req.headers['user-agent']
  }));
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// API Routes (prefixed with /bt-api for Namecheap routing)
app.use('/bt-api/auth', authRoutes);
app.use('/bt-api/teams', teamRoutes);
app.use('/bt-api/players', playerRoutes);
app.use('/bt-api/games', gameRoutes);
app.use('/bt-api/at-bats', atBatRoutes);
app.use('/bt-api/pitches', pitchRoutes);
app.use('/bt-api/plays', playRoutes);
app.use('/bt-api/analytics', analyticsRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  console.log('❌ 404 Not Found:');
  console.log('  Method:', req.method);
  console.log('  Path:', req.path);
  console.log('  URL:', req.url);
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;