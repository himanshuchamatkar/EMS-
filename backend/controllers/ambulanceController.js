const db = require('../database/db');

exports.getAmbulances = (req, res) => {
  try {
    const list = db.getAmbulances();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAmbulanceById = (req, res) => {
  try {
    const ambulance = db.getAmbulanceById(req.params.id);
    if (!ambulance) {
      return res.status(404).json({ error: 'Ambulance not found' });
    }
    res.json(ambulance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createAmbulance = (req, res) => {
  try {
    const { name, vehicle_number, driver_name, latitude, longitude, status } = req.body;
    
    if (!name || !vehicle_number || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Missing required fields: name, vehicle_number, latitude, longitude' });
    }

    const newAmb = db.addAmbulance({
      name,
      vehicle_number,
      driver_name: driver_name || 'Unassigned',
      latitude: Number(latitude),
      longitude: Number(longitude),
      status: status || 'Available'
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('ambulance:created', newAmb);
      io.emit('ambulances:list', db.getAmbulances());
    }

    res.status(201).json(newAmb);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateAmbulance = (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const currentAmbulance = db.getAmbulanceById(id);
    if (!currentAmbulance) {
      return res.status(404).json({ error: 'Ambulance not found' });
    }

    // Check if status changed
    const statusChanged = updates.status && updates.status !== currentAmbulance.status;

    const updatedAmb = db.updateAmbulance(id, updates);

    const io = req.app.get('io');
    if (io) {
      io.emit('ambulance:updated', updatedAmb);
      if (statusChanged) {
        io.emit('ambulance:statusChanged', { id, status: updatedAmb.status });
      }
      io.emit('ambulances:list', db.getAmbulances());
    }

    res.json(updatedAmb);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteAmbulance = (req, res) => {
  try {
    const { id } = req.params;
    const success = db.deleteAmbulance(id);
    if (!success) {
      return res.status(404).json({ error: 'Ambulance not found' });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('ambulances:list', db.getAmbulances());
      io.emit('emergencies:list', db.getEmergencies()); // In case an assignment was cancelled
    }

    res.json({ message: 'Ambulance deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
