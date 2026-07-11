const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const ambulanceRoutes = require('./routes/ambulanceRoutes');
const emergencyRoutes = require('./routes/emergencyRoutes');
const dispatchRoutes = require('./routes/dispatchRoutes');
const simulationRoutes = require('./routes/simulationRoutes');
const systemRoutes = require('./routes/systemRoutes');
const { registerSocketHandlers } = require('./sockets/socketHandler');

const app = express();
const server = http.createServer(app);

// Enable CORS for API requests
app.use(cors({
  origin: '*', // Allow frontend development port or custom client links
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

app.use(express.json());

// Setup Socket.IO with CORS settings
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Store io in express app config to access in controllers
app.set('io', io);

// Register API Routes
app.use('/api/ambulances', ambulanceRoutes);
app.use('/api/emergencies', emergencyRoutes);
app.use('/api/dispatch', dispatchRoutes);
app.use('/api/simulation', simulationRoutes);
app.use('/api/system', systemRoutes);

// Simple Status Endpoint
app.get('/api/status', (req, res) => {
  res.json({ status: 'OK', message: 'Smart Ambulance Tracking API is active.' });
});

// Bind Socket.IO Event Handlers
registerSocketHandlers(io);

// Handle errors
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong on the server!' });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
