const db = require('../database/db');
const { autoAssignAmbulance, offerNearestAmbulance } = require('../services/dispatchEngine');
const modeService = require('../services/modeService');

exports.getEmergencies = (req, res) => {
  try {
    const list = db.getEmergencies();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getEmergencyById = (req, res) => {
  try {
    const emergency = db.getEmergencyById(req.params.id);
    if (!emergency) {
      return res.status(404).json({ error: 'Emergency not found' });
    }
    res.json(emergency);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createEmergency = (req, res) => {
  try {
    const { latitude, longitude, priority, description } = req.body;

    if (latitude === undefined || longitude === undefined || !priority) {
      return res.status(400).json({ error: 'Missing required fields: latitude, longitude, priority' });
    }

    // Create the emergency (initially Pending)
    const newEmergency = db.addEmergency({
      latitude: Number(latitude),
      longitude: Number(longitude),
      priority,
      description: description || 'Emergency incident reported'
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('emergency:created', newEmergency);
      io.emit('emergencies:list', db.getEmergencies());
    }

    if (modeService.getMode() === 'live') {
      // Live mode: offer to the nearest 2 drivers' phones and wait for them to
      // accept/reject instead of auto-assigning instantly.
      const { emergency: offeredEmergency, ambulances: offeredAmbulances, distances } = offerNearestAmbulance(newEmergency.id);

      if (offeredAmbulances && offeredAmbulances.length > 0) {
        if (io) {
          offeredAmbulances.forEach((ambulance, idx) => {
            io.to(`ambulance:${ambulance.id}`).emit('dispatch:offer', { 
              emergency: offeredEmergency, 
              distance: distances[idx] 
            });
          });
          io.emit('emergency:updated', offeredEmergency);
          io.emit('emergencies:list', db.getEmergencies());
        }
        return res.status(201).json({
          message: `Emergency created and offered to nearest ${offeredAmbulances.length} driver(s)`,
          emergency: offeredEmergency,
          offered_to_ambulances: offeredAmbulances
        });
      }

      if (io) {
        io.emit('dispatch:offer:exhausted', { emergency_id: newEmergency.id });
        io.emit('emergency:updated', offeredEmergency);
        io.emit('emergencies:list', db.getEmergencies());
      }
      return res.status(201).json({
        message: 'Emergency created. No available ambulances to offer to.',
        emergency: offeredEmergency,
        offered_to_ambulances: []
      });
    }

    // Simulation mode: existing instant auto-assign behavior, unchanged.
    const assignedAmbulance = autoAssignAmbulance(newEmergency.id);

    if (assignedAmbulance) {
      const updatedEmergency = db.getEmergencyById(newEmergency.id);
      
      if (io) {
        // Broadcast the assignment details
        io.emit('dispatch:assigned', {
          emergency: updatedEmergency,
          ambulance: assignedAmbulance
        });
        io.emit('ambulance:updated', assignedAmbulance);
        io.emit('emergency:updated', updatedEmergency);
        io.emit('ambulances:list', db.getAmbulances());
        io.emit('emergencies:list', db.getEmergencies());
      }
      
      return res.status(201).json({
        message: 'Emergency created and ambulance assigned automatically',
        emergency: updatedEmergency,
        assigned_ambulance: assignedAmbulance
      });
    }

    res.status(201).json({
      message: 'Emergency created. No available ambulances at this time.',
      emergency: newEmergency,
      assigned_ambulance: null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteEmergency = (req, res) => {
  try {
    const { id } = req.params;
    const success = db.deleteEmergency(id);
    if (!success) {
      return res.status(404).json({ error: 'Emergency not found' });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('emergencies:list', db.getEmergencies());
      io.emit('ambulances:list', db.getAmbulances());
    }

    res.json({ message: 'Emergency incident log deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
