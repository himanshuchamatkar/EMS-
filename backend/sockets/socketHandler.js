const db = require('../database/db');
const simulationEngine = require('../services/simulationEngine');

function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Send initial state to the connected client
    socket.emit('ambulances:list', db.getAmbulances());
    socket.emit('emergencies:list', db.getEmergencies());
    socket.emit('simulation:state', { running: simulationEngine.isRunning() });

    // Handle manual simulation start/pause from client via sockets (optional convenience)
    socket.on('simulation:start', () => {
      simulationEngine.startSimulation(io);
    });

    socket.on('simulation:pause', () => {
      simulationEngine.pauseSimulation();
    });

    socket.on('simulation:reset', () => {
      simulationEngine.resetSimulation(io);
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
}

module.exports = {
  registerSocketHandlers
};
