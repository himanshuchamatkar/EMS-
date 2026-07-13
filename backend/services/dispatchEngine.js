const db = require('../database/db');
const { calculateDistance } = require('../utils/haversine');

// "First Responder Wins": how far (km) to broadcast an incident offer, and
// the fallback candidate count when nobody available falls inside that
// radius (so a sparse area still gets offers instead of going unanswered).
// Both configurable via env for different deployments/MVP tuning.
const DISPATCH_RADIUS_KM = Number(process.env.DISPATCH_RADIUS_KM) || 5;
const DISPATCH_FALLBACK_TOP_N = Number(process.env.DISPATCH_FALLBACK_TOP_N) || 3;

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
 * Candidate pool for a "First Responder Wins" broadcast: every available
 * ambulance within DISPATCH_RADIUS_KM, excluding any already offered/rejected
 * in a prior round. Falls back to the nearest DISPATCH_FALLBACK_TOP_N
 * ambulances (regardless of radius) when the radius search comes up empty,
 * so sparsely-covered areas still get offers sent out.
 *
 * @param {number} emergencyLat
 * @param {number} emergencyLon
 * @param {string[]} excludedIds Ambulance IDs to skip (already offered this emergency)
 * @returns {Array} Candidate ambulances with a 'distance' field, nearest first
 */
function findCandidateAmbulances(emergencyLat, emergencyLon, excludedIds = []) {
  const sorted = findNearestAvailableAmbulances(emergencyLat, emergencyLon)
    .filter(amb => !excludedIds.includes(amb.id));

  const withinRadius = sorted.filter(amb => amb.distance <= DISPATCH_RADIUS_KM);
  if (withinRadius.length > 0) {
    return withinRadius;
  }

  // Nobody in range — broaden to the nearest N so the incident doesn't stall.
  return sorted.slice(0, DISPATCH_FALLBACK_TOP_N);
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
 * Live-mode "First Responder Wins" dispatch: broadcasts the emergency to
 * EVERY available ambulance within range simultaneously (see
 * findCandidateAmbulances), without locking any of them as Busy. The first
 * driver to call /dispatch/accept wins the incident; the rest are notified
 * via `incident:locked`. If every offered ambulance rejects, call this again
 * with the accumulated exclusion list to broaden the search to the next
 * nearest batch.
 *
 * @param {string} emergencyId The UUID of the emergency
 * @param {string[]} excludedIds Ambulance IDs to skip (already offered this emergency in an earlier round)
 * @returns {{emergency: Object|null, ambulances: Array, distances: number[]}}
 */
function offerToAllCandidates(emergencyId, excludedIds = []) {
  const emergency = db.getEmergencyById(emergencyId);
  if (!emergency) {
    return { emergency: null, ambulances: [], distances: [] };
  }

  const candidates = findCandidateAmbulances(
    emergency.latitude,
    emergency.longitude,
    excludedIds
  );

  if (candidates.length === 0) {
    const exhaustedEmergency = db.updateEmergency(emergencyId, {
      status: 'Pending',
      assigned_ambulance: null,
      offered_to: excludedIds
    });
    return { emergency: exhaustedEmergency, ambulances: [], distances: [] };
  }

  const candidateIds = candidates.map(c => c.id);

  const offeredEmergency = db.updateEmergency(emergencyId, {
    status: 'Offered',
    assigned_ambulance: null, // Not locked yet — first ACCEPT wins
    offered_to: [...excludedIds, ...candidateIds]
  });

  return {
    emergency: offeredEmergency,
    ambulances: candidates,
    distances: candidates.map(c => c.distance)
  };
}

module.exports = {
  DISPATCH_RADIUS_KM,
  DISPATCH_FALLBACK_TOP_N,
  findNearestAvailableAmbulances,
  findCandidateAmbulances,
  autoAssignAmbulance,
  offerToAllCandidates
};
