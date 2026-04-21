import app from './app';
import { config } from './config/env';
import pool from './config/database';
import { init as initWsServer } from './websocket/wsServer';

console.log('🔄 Server script starting...');
console.log('🔄 Imports completed');

const PORT = config.port;
console.log(`✅ PORT set to ${PORT}`);

// Test database connection before starting server
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('❌ Failed to connect to database:', err);
        process.exit(1);
    }
    console.log('✅ Database connection successful');
    console.log('📅 Current time from DB:', res.rows[0].now);
});

// Start server
const server = app.listen(PORT, () => {
    initWsServer(server);
    console.log('🚀 Baseball Tracker API Server');
    console.log(`📡 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${config.nodeEnv}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log('');
    console.log('📋 Registered Routes:');
    console.log('  GET  /health');
    console.log('  POST /bt-api/auth/register');
    console.log('  POST /bt-api/auth/login');
    console.log('  GET  /bt-api/teams');
    console.log('  GET  /bt-api/players');
    console.log('  GET  /bt-api/games');
    console.log('  GET  /bt-api/at-bats');
    console.log('  GET  /bt-api/pitches');
    console.log('  GET  /bt-api/plays');
    console.log('  GET  /bt-api/analytics');
    console.log('');
    console.log('✅ Express server is RUNNING and ready to accept requests');
});

// Server error handling
server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
    } else {
        console.error('❌ Server error:', error);
    }
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        pool.end(() => {
            console.log('Database pool closed');
            process.exit(0);
        });
    });
});
