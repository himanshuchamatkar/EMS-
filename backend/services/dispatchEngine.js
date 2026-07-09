const db = require('../database/db');
const { calculateDistance } = require('../utils/haversine');

/**
 * Finds and lists all available ambulances sorted by their Haversine distance
 * to the given emergency location.
 * 
 * @param {number} emergencyLat Latitude of the emergency
 * @param {number} emergencyLon Longitude of the emergency
 * @returns {Array} List of available ambulances with an added 'distance' field (in km)
 */
function findNearestAvailableAmbulances(emergencyLat, emergencyLon) {
  const ambulances = db.getAmbulances();
  
  // Filter for available ambulances only
  const available = ambulances.filter(amb => amb.status === 'Available');

  // Calculate distance for each
  const list = available.map(amb => {
    const distance = calculateDistance(
      emergencyLat,
      emergencyLon,
      amb.latitude,
      amb.longitude
    );
    return {
      ...amb,
      distance
    };
  });

  // Sort by distance ascending
  return list.sort((a, b) => a.distance - b.distance);
}

/**
 * Assigns the nearest available ambulance to an emergency.
 * 
 * @param {string} emergencyId The UUID of the emergency
 * @returns {Object|null} The assigned ambulance, or null if none was available
 */
function autoAssignAmbulance(emergencyId) {
  const emergency = db.getEmergencyById(emergencyId);
  if (!emergency || emergency.status !== 'Pending') {
    return null;
  }

  const sortedAvailable = findNearestAvailableAmbulances(
    emergency.latitude,
    emergency.longitude
  );

  if (sortedAvailable.length === 0) {
    return null;
  }

  const nearestAmbulance = sortedAvailable[0];

  // Update ambulance status to Busy
  db.updateAmbulance(nearestAmbulance.id, {
    status: 'Busy',
    speed: 40 // Simulate typical emergency response speed in km/h
  });

  // Update emergency status to Assigned
  db.updateEmergency(emergencyId, {
    status: 'Assigned',
    assigned_ambulance: nearestAmbulance.id
  });

  // Create dispatch log
  db.addDispatchLog({
    emergency_id: emergencyId,
    ambulance_id: nearestAmbulance.id,
    status: 'Dispatched'
  });

  return db.getAmbulanceById(nearestAmbulance.id);
}

module.exports = {
  findNearestAvailableAmbulances,
  autoAssignAmbulance
};
