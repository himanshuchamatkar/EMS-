const db = require('../database/db');
const { findNearestAvailableAmbulances } = require('../services/dispatchEngine');

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
