const db = require('../database/db');
const { calculateDistance } = require('../utils/haversine');
const modeService = require('./modeService');

let simulationInterval = null;
let ioInstance = null;
let isSimulationRunning = false;

// Step size in degrees per second for simulation. 
// 0.001 degrees is ~111 meters. At 60 km/h, an ambulance moves ~16.6 m/s.
// To make the prototype engaging and visually active, we move at ~150-200m per step (0.0015 degrees).
const SIMULATION_STEP_SIZE = 0.0015; 

function startSimulation(io) {
  if (isSimulationRunning) return;
  
  ioInstance = io;
  isSimulationRunning = true;
  
  simulationInterval = setInterval(() => {
    tickSimulation();
  }, 1000);

  // Broadcast simulation state
  io.emit('simulation:state', { running: true });
}

function pauseSimulation() {
  if (!isSimulationRunning) return;
  
  clearInterval(simulationInterval);
  simulationInterval = null;
  isSimulationRunning = false;

  if (ioInstance) {
    ioInstance.emit('simulation:state', { running: false });
  }
}

function resetSimulation(io) {
  pauseSimulation();
  db.reset();
  
  if (io) {
    io.emit('simulation:state', { running: false });
    io.emit('simulation:reset');
    // Broadcast refreshed ambulance and emergency lists
    io.emit('ambulances:list', db.getAmbulances());
    io.emit('emergencies:list', db.getEmergencies());
  }
}

function tickSimulation() {
  if (!ioInstance) return;
  if (modeService.getMode() !== 'simulation') return;

  const ambulances = db.getAmbulances();
  const emergencies = db.getEmergencies();
  
  let databaseUpdated = false;

  emergencies.forEach(emergency => {
    // Only move ambulances towards assigned, non-resolved emergencies
    if (emergency.status === 'Assigned' && emergency.assigned_ambulance) {
      const ambulance = ambulances.find(amb => amb.id === emergency.assigned_ambulance);
      if (!ambulance) return;

      const diffLat = emergency.latitude - ambulance.latitude;
      const diffLon = emergency.longitude - ambulance.longitude;
      const distance = calculateDistance(
        ambulance.latitude,
        ambulance.longitude,
        emergency.latitude,
        emergency.longitude
      );

      // Check if ambulance arrived (within ~150 meters or ~0.0015 degrees)
      if (distance <= 0.15) {
        // Arrived at emergency scene!
        // Update emergency status to Resolved
        db.updateEmergency(emergency.id, {
          status: 'Resolved'
        });

        // Update ambulance status to Available (stays at emergency scene for now)
        db.updateAmbulance(ambulance.id, {
          status: 'Available',
          speed: 0,
          heading: 0,
          latitude: emergency.latitude, // Snap to target
          longitude: emergency.longitude
        });

        // Update dispatch log
        db.updateDispatchLogForEmergency(emergency.id, {
          status: 'Delivered',
          response_time: new Date().toISOString()
        });

        databaseUpdated = true;

        // Broadcast specific status changes
        ioInstance.emit('ambulance:updated', db.getAmbulanceById(ambulance.id));
        ioInstance.emit('emergency:updated', db.getEmergencyById(emergency.id));
        ioInstance.emit('dispatch:resolved', {
          emergency_id: emergency.id,
          ambulance_id: ambulance.id
        });
      } else {
        // Move towards emergency
        const angle = Math.atan2(diffLat, diffLon);
        const newLat = ambulance.latitude + Math.sin(angle) * SIMULATION_STEP_SIZE;
        const newLon = ambulance.longitude + Math.cos(angle) * SIMULATION_STEP_SIZE;
        
        // Calculate heading in degrees (0 = North, 90 = East, etc.)
        // Math.atan2 takes (y, x). In maps, latitude is Y, longitude is X.
        // We want 0 at North (up), clockwise.
        let headingDegrees = Math.round((Math.atan2(diffLon, diffLat) * 180) / Math.PI);
        headingDegrees = (headingDegrees + 360) % 360;

        const updatedAmbulance = db.updateAmbulance(ambulance.id, {
          latitude: Number(newLat.toFixed(6)),
          longitude: Number(newLon.toFixed(6)),
          heading: headingDegrees,
          speed: 50 // km/h simulation speed
        });

        databaseUpdated = true;

        // Broadcast movement
        ioInstance.emit('ambulance:moved', updatedAmbulance);
      }
    }
  });

  // If anything updated in bulk, broadcast updated lists just in case
  if (databaseUpdated) {
    ioInstance.emit('ambulances:list', db.getAmbulances());
    ioInstance.emit('emergencies:list', db.getEmergencies());
  }
}

module.exports = {
  startSimulation,
  pauseSimulation,
  resetSimulation,
  isRunning: () => isSimulationRunning
};
