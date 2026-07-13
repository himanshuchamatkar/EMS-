const db = require('../database/db');
const { findNearestAvailableAmbulances, offerNearestAmbulance } = require('../services/dispatchEngine');

exports.findNearest = (req, res) => {
  try {
    const { latitude, longitude } = req.body;
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Missing latitude or longitude in body' });
    }
    const list = findNearestAvailableAmbulances(Number(latitude), Number(longitude));
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.assign = (req, res) => {
  try {
    const { emergency_id, ambulance_id } = req.body;

    if (!emergency_id || !ambulance_id) {
      return res.status(400).json({ error: 'Missing emergency_id or ambulance_id' });
    }

    const emergency = db.getEmergencyById(emergency_id);
    const ambulance = db.getAmbulanceById(ambulance_id);

    if (!emergency) {
      return res.status(404).json({ error: 'Emergency not found' });
    }
    if (!ambulance) {
      return res.status(404).json({ error: 'Ambulance not found' });
    }
    if (ambulance.status !== 'Available') {
      return res.status(400).json({ error: 'Ambulance is not available' });
    }

    // Cancel existing assignment if any
    if (emergency.assigned_ambulance) {
      const prevAmbId = emergency.assigned_ambulance;
      db.updateAmbulance(prevAmbId, {
        status: 'Available',
        speed: 0,
        heading: 0
      });
      db.updateDispatchLogForEmergency(emergency.id, {
        status: 'Reassigned'
      });
    }

    // Update new ambulance status to Busy
    const updatedAmbulance = db.updateAmbulance(ambulance_id, {
      status: 'Busy',
      speed: 40
    });

    // Update emergency
    const updatedEmergency = db.updateEmergency(emergency_id, {
      status: 'Assigned',
      assigned_ambulance: ambulance_id
    });

    // Create new dispatch log
    const log = db.addDispatchLog({
      emergency_id,
      ambulance_id,
      status: 'Dispatched'
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('dispatch:assigned', {
        emergency: updatedEmergency,
        ambulance: updatedAmbulance,
        log
      });
      io.emit('ambulance:updated', updatedAmbulance);
      io.emit('emergency:updated', updatedEmergency);
      io.emit('ambulances:list', db.getAmbulances());
      io.emit('emergencies:list', db.getEmergencies());
    }

    res.json({
      message: 'Ambulance assigned successfully',
      emergency: updatedEmergency,
      ambulance: updatedAmbulance
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.cancelAssignment = (req, res) => {
  try {
    const { emergency_id } = req.body;

    if (!emergency_id) {
      return res.status(400).json({ error: 'Missing emergency_id' });
    }

    const emergency = db.getEmergencyById(emergency_id);
    if (!emergency) {
      return res.status(404).json({ error: 'Emergency not found' });
    }

    const ambulanceId = emergency.assigned_ambulance;
    if (!ambulanceId) {
      return res.status(400).json({ error: 'Emergency is not currently assigned to any ambulance' });
    }

    // Update ambulance
    const updatedAmbulance = db.updateAmbulance(ambulanceId, {
      status: 'Available',
      speed: 0,
      heading: 0
    });

    // Update emergency
    const updatedEmergency = db.updateEmergency(emergency_id, {
      status: 'Pending',
      assigned_ambulance: null
    });

    // Update dispatch log
    db.updateDispatchLogForEmergency(emergency_id, {
      status: 'Cancelled'
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('dispatch:cancelled', {
        emergency_id,
        ambulance_id: ambulanceId
      });
      io.emit('ambulance:updated', updatedAmbulance);
      io.emit('emergency:updated', updatedEmergency);
      io.emit('ambulances:list', db.getAmbulances());
      io.emit('emergencies:list', db.getEmergencies());
    }

    res.json({
      message: 'Assignment cancelled successfully',
      emergency: updatedEmergency,
      ambulance: updatedAmbulance
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Driver app accepts a dispatch:offer sent while in Live mode.
exports.acceptOffer = (req, res) => {
  try {
    const { emergency_id, ambulance_id } = req.body;

    if (!emergency_id || !ambulance_id) {
      return res.status(400).json({ error: 'Missing emergency_id or ambulance_id' });
    }

    const emergency = db.getEmergencyById(emergency_id);
    if (!emergency) {
      return res.status(404).json({ error: 'Emergency not found' });
    }

    const ambulance = db.getAmbulanceById(ambulance_id);
    if (!ambulance) {
      return res.status(404).json({ error: 'Ambulance not found' });
    }

    // Verify this ambulance was offered and the emergency is still Offered
    if (emergency.status !== 'Offered' || !emergency.offered_to || !emergency.offered_to.includes(ambulance_id)) {
      return res.status(400).json({ error: 'This emergency is not currently offered to this ambulance' });
    }

    const updatedAmbulance = db.updateAmbulance(ambulance_id, {
      status: 'Busy',
      speed: 40
    });

    const updatedEmergency = db.updateEmergency(emergency_id, {
      status: 'Assigned',
      assigned_ambulance: ambulance_id
    });

    const log = db.addDispatchLog({
      emergency_id,
      ambulance_id,
      status: 'Dispatched'
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('dispatch:assigned', {
        emergency: updatedEmergency,
        ambulance: updatedAmbulance,
        log
      });

      // Clear/cancel the offer screen for other offered drivers who didn't accept fast enough
      const otherAmbulanceIds = (emergency.offered_to || []).filter(id => id !== ambulance_id);
      otherAmbulanceIds.forEach(otherId => {
        io.to(`ambulance:${otherId}`).emit('dispatch:offer:exhausted', { emergency_id });
      });

      io.emit('ambulance:updated', updatedAmbulance);
      io.emit('emergency:updated', updatedEmergency);
      io.emit('ambulances:list', db.getAmbulances());
      io.emit('emergencies:list', db.getEmergencies());
    }

    res.json({
      message: 'Offer accepted, ambulance dispatched',
      emergency: updatedEmergency,
      ambulance: updatedAmbulance
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Driver app rejects a dispatch:offer; backend re-offers to the next nearest ambulance.
exports.rejectOffer = (req, res) => {
  try {
    const { emergency_id, ambulance_id } = req.body;

    if (!emergency_id || !ambulance_id) {
      return res.status(400).json({ error: 'Missing emergency_id or ambulance_id' });
    }

    const emergency = db.getEmergencyById(emergency_id);
    if (!emergency) {
      return res.status(404).json({ error: 'Emergency not found' });
    }

    if (emergency.status !== 'Offered' || !emergency.offered_to || !emergency.offered_to.includes(ambulance_id)) {
      return res.status(400).json({ error: 'This emergency is not currently offered to this ambulance' });
    }

    // Record this driver rejection
    let rejectedBy = emergency.rejected_by || [];
    if (!rejectedBy.includes(ambulance_id)) {
      rejectedBy.push(ambulance_id);
    }

    const io = req.app.get('io');
    if (io) {
      // Clear screen of rejecting driver immediately
      io.to(`ambulance:${ambulance_id}`).emit('dispatch:offer:exhausted', { emergency_id });
    }

    // Try to find the next candidate available driver to maintain the dual-driver offer pool
    const excludedIds = emergency.offered_to || [];
    const { emergency: nextEmergency, ambulances: nextAmbulances, distances } = offerNearestAmbulance(emergency_id, excludedIds);

    let updatedEmergency = nextEmergency || emergency;
    updatedEmergency = db.updateEmergency(emergency_id, {
      rejected_by: rejectedBy
    });

    if (nextAmbulances && nextAmbulances.length > 0) {
      const nextAmbulance = nextAmbulances[0];
      const distance = distances[0];

      if (io) {
        io.to(`ambulance:${nextAmbulance.id}`).emit('dispatch:offer', { emergency: updatedEmergency, distance });
        io.emit('emergency:updated', updatedEmergency);
        io.emit('emergencies:list', db.getEmergencies());
      }

      return res.json({
        message: 'Offer rejected, re-offered to next nearest available ambulance',
        emergency: updatedEmergency,
        offered_to_ambulance: nextAmbulance
      });
    }

    // No new candidates are available. Check if everyone we offered it to has rejected
    const activeOffersCount = (updatedEmergency.offered_to || []).filter(id => !rejectedBy.includes(id)).length;

    if (activeOffersCount === 0) {
      const exhaustedEmergency = db.updateEmergency(emergency_id, {
        status: 'Pending',
        assigned_ambulance: null
      });

      if (io) {
        io.emit('dispatch:offer:exhausted', { emergency_id });
        io.emit('emergency:updated', exhaustedEmergency);
        io.emit('emergencies:list', db.getEmergencies());
      }

      return res.json({
        message: 'Offer rejected. No more available ambulances to offer to.',
        emergency: exhaustedEmergency,
        offered_to_ambulance: null
      });
    }

    // Waiting for other driver to accept/reject
    if (io) {
      io.emit('emergency:updated', updatedEmergency);
      io.emit('emergencies:list', db.getEmergencies());
    }

    res.json({
      message: 'Offer rejected. Waiting for other offered drivers to respond.',
      emergency: updatedEmergency,
      offered_to_ambulance: null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Driver app confirms the victim is on board at the scene. This does NOT
// resolve the incident or free the ambulance (still en route, e.g. to a
// hospital) — it just records the VICTIM_PICKED milestone with a timestamp,
// so the admin panel can reflect it live via Socket.IO.
exports.pickupVictim = (req, res) => {
  try {
    const { emergency_id, ambulance_id } = req.body;

    if (!emergency_id || !ambulance_id) {
      return res.status(400).json({ error: 'Missing emergency_id or ambulance_id' });
    }

    const emergency = db.getEmergencyById(emergency_id);
    if (!emergency) {
      return res.status(404).json({ error: 'Emergency not found' });
    }

    if (emergency.status !== 'Assigned' || emergency.assigned_ambulance !== ambulance_id) {
      return res.status(400).json({ error: 'This ambulance is not the active assignment for this emergency' });
    }

    const pickedUpAt = new Date().toISOString();

    const updatedEmergency = db.updateEmergency(emergency_id, {
      status: 'VICTIM_PICKED',
      picked_up_at: pickedUpAt
    });

    db.updateDispatchLogForEmergency(emergency_id, {
      status: 'PickedUp',
      pickup_time: pickedUpAt
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('dispatch:victimPickedUp', { emergency_id, ambulance_id, picked_up_at: pickedUpAt });
      io.emit('emergency:updated', updatedEmergency);
      io.emit('emergencies:list', db.getEmergencies());
    }

    res.json({
      message: 'Victim pickup recorded',
      emergency: updatedEmergency
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Driver app confirms the victim was dropped off at the hospital. This is
// the terminal step: resolves the incident and frees the ambulance — the
// same end state Simulation mode's tick-based auto-arrival already reaches,
// so it reuses the same 'Resolved' status and 'dispatch:resolved' event.
exports.dropAtHospital = (req, res) => {
  try {
    const { emergency_id, ambulance_id } = req.body;

    if (!emergency_id || !ambulance_id) {
      return res.status(400).json({ error: 'Missing emergency_id or ambulance_id' });
    }

    const emergency = db.getEmergencyById(emergency_id);
    if (!emergency) {
      return res.status(404).json({ error: 'Emergency not found' });
    }

    if (emergency.status !== 'VICTIM_PICKED' || emergency.assigned_ambulance !== ambulance_id) {
      return res.status(400).json({ error: 'Victim must be picked up before drop-off can be recorded' });
    }

    const droppedAt = new Date().toISOString();

    const updatedAmbulance = db.updateAmbulance(ambulance_id, {
      status: 'Available',
      speed: 0,
      heading: 0
    });

    const updatedEmergency = db.updateEmergency(emergency_id, {
      status: 'Resolved',
      dropped_at: droppedAt
    });

    db.updateDispatchLogForEmergency(emergency_id, {
      status: 'Delivered',
      response_time: droppedAt
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('dispatch:resolved', { emergency_id, ambulance_id });
      io.emit('ambulance:updated', updatedAmbulance);
      io.emit('emergency:updated', updatedEmergency);
      io.emit('ambulances:list', db.getAmbulances());
      io.emit('emergencies:list', db.getEmergencies());
    }

    res.json({
      message: 'Victim dropped at hospital, incident resolved',
      emergency: updatedEmergency,
      ambulance: updatedAmbulance
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getHistory = (req, res) => {
  try {
    const logs = db.getDispatchLogs();
    
    // Enhance logs with ambulance name and vehicle number, and emergency priority
    const enhancedLogs = logs.map(log => {
      const amb = db.getAmbulanceById(log.ambulance_id);
      const em = db.getEmergencyById(log.emergency_id);
      return {
        ...log,
        ambulance_name: amb ? amb.name : 'Unknown',
        vehicle_number: amb ? amb.vehicle_number : 'Unknown',
        priority: em ? em.priority : 'Unknown',
        description: em ? em.description : 'Unknown'
      };
    });

    res.json(enhancedLogs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
