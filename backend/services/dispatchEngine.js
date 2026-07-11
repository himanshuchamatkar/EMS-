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

/**
 * Live-mode dispatch: offers the emergency to the nearest available ambulance
 * that hasn't already been offered it (and declined/is being skipped), without
 * locking the ambulance as Busy. The driver app must call /dispatch/accept to
 * actually commit the assignment, or /dispatch/reject to move to the next one.
 *
 * @param {string} emergencyId The UUID of the emergency
 * @param {string[]} excludedIds Ambulance IDs to skip (already offered/rejected)
 * @returns {{emergency: Object|null, ambulance: Object|null, distance: number|null}}
 */
function offerNearestAmbulance(emergencyId, excludedIds = []) {
  const emergency = db.getEmergencyById(emergencyId);
  if (!emergency) {
    return { emergency: null, ambulance: null, distance: null };
  }

  const candidates = findNearestAvailableAmbulances(
    emergency.latitude,
    emergency.longitude
  ).filter(amb => !excludedIds.includes(amb.id));

  if (candidates.length === 0) {
    const exhaustedEmergency = db.updateEmergency(emergencyId, {
      status: 'Pending',
      assigned_ambulance: null,
      offered_to: excludedIds
    });
    return { emergency: exhaustedEmergency, ambulance: null, distance: null };
  }

  const nearest = candidates[0];

  const offeredEmergency = db.updateEmergency(emergencyId, {
    status: 'Offered',
    assigned_ambulance: nearest.id,
    offered_to: [...excludedIds, nearest.id]
  });

  return {
    emergency: offeredEmergency,
    ambulance: db.getAmbulanceById(nearest.id),
    distance: nearest.distance
  };
}

module.exports = {
  findNearestAvailableAmbulances,
  autoAssignAmbulance,
  offerNearestAmbulance
};
