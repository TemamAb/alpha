import express from 'express';
import http from 'http';
import cors from 'cors';
import bodyParser from 'body-parser';
import controlRoutes from './routes/controlRoutes';
import { AlphaOrionWebSocketServer } from './websocket/WebSocketServer';
import { ProfitStreamService } from './services/ProfitStreamService';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// API Routes
app.use('/api/v1', controlRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Create HTTP Server
const server = http.createServer(app);

// Initialize WebSocket Server
const wsServer = new AlphaOrionWebSocketServer(server);

// Initialize Profit Stream Service
const streamService = new ProfitStreamService(wsServer);
streamService.start();

// Start Server
server.listen(PORT, () => {
  console.log(`🚀 Alpha-Orion Backend running on port ${PORT}`);
  console.log(`📡 WebSocket Stream available at ws://localhost:${PORT}/ws`);
});