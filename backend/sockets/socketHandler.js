const db = require('../database/db');
const simulationEngine = require('../services/simulationEngine');
const modeService = require('../services/modeService');

function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Send initial state to the connected client
    socket.emit('ambulances:list', db.getAmbulances());
    socket.emit('emergencies:list', db.getEmergencies());
    socket.emit('hospitals:list', db.getHospitals().map(h => {
      const { password_hash, ...hData } = h;
      const facilities = db.getHospitalFacilities(h.hospital_id);
      return { ...hData, facilities };
    }));
    socket.emit('simulation:state', { running: simulationEngine.isRunning() });
    socket.emit('system:mode', { mode: modeService.getMode() });

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

    // Driver app registers which ambulance it represents so the server can
    // target that single device with dispatch offers (see dispatch:offer).
    socket.on('driver:register', ({ ambulance_id } = {}) => {
      if (!ambulance_id) return;
      socket.join(`ambulance:${ambulance_id}`);
      socket.data.ambulanceId = ambulance_id;
      console.log(`Driver registered: socket ${socket.id} -> ambulance ${ambulance_id}`);
    });

    // Hospital dashboard registers which hospital it represents so the server can
    // target that single device with emergency offers.
    socket.on('hospital:register', ({ hospital_id } = {}) => {
      if (!hospital_id) return;
      socket.join(`hospital:${hospital_id}`);
      socket.data.hospitalId = hospital_id;
      console.log(`Hospital registered: socket ${socket.id} -> hospital ${hospital_id}`);
    });
 
    // Handle police marking incident as seen/acknowledged
    socket.on('emergency:police-seen', ({ emergency_id } = {}) => {
      if (!emergency_id) return;
      try {
        console.log(`Incident marked as seen by police: ${emergency_id}`);
        const updatedEmergency = db.updateEmergency(emergency_id, {
          police_seen: true
        });

        // Broadcast updated lists and detail changes to all connected clients
        io.emit('emergency:updated', updatedEmergency);
        io.emit('emergencies:list', db.getEmergencies());
        
        // Also target the assigned ambulance driver room to alert them directly
        if (updatedEmergency.assigned_ambulance) {
          io.to(`ambulance:${updatedEmergency.assigned_ambulance}`).emit('emergency:updated', updatedEmergency);
        }
      } catch (err) {
        console.error('Failed to update police_seen status:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });
}

module.exports = {
  registerSocketHandlers
};
