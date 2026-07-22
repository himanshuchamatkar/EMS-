const db = require('../database/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'smart_ambulance_hospital_secret';

exports.registerHospital = async (req, res) => {
  try {
    const {
      hospital_name,
      email,
      password,
      phone,
      address,
      latitude,
      longitude,
      hospital_type,
      registration_number
    } = req.body;

    if (!hospital_name || !email || !password || !phone || !address || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Missing required hospital registration fields' });
    }

    const existing = db.getHospitalByEmail(email);
    if (existing) {
      return res.status(400).json({ error: 'Hospital email is already registered' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const newHospital = db.addHospital({
      hospital_name,
      email,
      password_hash,
      phone,
      address,
      latitude: Number(latitude),
      longitude: Number(longitude),
      hospital_type: hospital_type || 'Private',
      registration_number: registration_number || ''
    });

    const { password_hash: _, ...userWithoutPassword } = newHospital;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.loginHospital = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Missing email or password' });
    }

    const hospital = db.getHospitalByEmail(email);
    if (!hospital) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const valid = await bcrypt.compare(password, hospital.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ hospitalId: hospital.hospital_id }, JWT_SECRET, { expiresIn: '7d' });

    const { password_hash: _, ...hospitalData } = hospital;
    const facilities = db.getHospitalFacilities(hospital.hospital_id);

    res.json({
      token,
      hospital: {
        ...hospitalData,
        facilities
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getProfile = (req, res) => {
  try {
    const hospitalId = req.hospitalId;
    const hospital = db.getHospitalById(hospitalId);
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital profile not found' });
    }

    const facilities = db.getHospitalFacilities(hospitalId);
    const { password_hash: _, ...hospitalData } = hospital;

    res.json({
      ...hospitalData,
      facilities
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateProfile = (req, res) => {
  try {
    const hospitalId = req.hospitalId;
    const {
      hospital_name,
      phone,
      address,
      latitude,
      longitude,
      hospital_type,
      registration_number,
      // Facilities fields
      icu_count,
      ventilator_count,
      ct_available,
      mri_available,
      xray_available,
      blood_bank,
      ot_available,
      emergency_dept_available,
      emergency_24x7,
      trauma_facility,
      total_beds,
      emergency_beds,
      specialists
    } = req.body;

    const hospitalUpdates = {};
    if (hospital_name !== undefined) hospitalUpdates.hospital_name = hospital_name;
    if (phone !== undefined) hospitalUpdates.phone = phone;
    if (address !== undefined) hospitalUpdates.address = address;
    if (latitude !== undefined) hospitalUpdates.latitude = Number(latitude);
    if (longitude !== undefined) hospitalUpdates.longitude = Number(longitude);
    if (hospital_type !== undefined) hospitalUpdates.hospital_type = hospital_type;
    if (registration_number !== undefined) hospitalUpdates.registration_number = registration_number;

    if (Object.keys(hospitalUpdates).length > 0) {
      db.updateHospital(hospitalId, hospitalUpdates);
    }

    const facilityUpdates = {};
    if (icu_count !== undefined) facilityUpdates.icu_count = Number(icu_count);
    if (ventilator_count !== undefined) facilityUpdates.ventilator_count = Number(ventilator_count);
    if (ct_available !== undefined) facilityUpdates.ct_available = Boolean(ct_available);
    if (mri_available !== undefined) facilityUpdates.mri_available = Boolean(mri_available);
    if (xray_available !== undefined) facilityUpdates.xray_available = Boolean(xray_available);
    if (blood_bank !== undefined) facilityUpdates.blood_bank = Boolean(blood_bank);
    if (ot_available !== undefined) facilityUpdates.ot_available = Boolean(ot_available);
    if (emergency_dept_available !== undefined) facilityUpdates.emergency_dept_available = Boolean(emergency_dept_available);
    if (emergency_24x7 !== undefined) facilityUpdates.emergency_24x7 = Boolean(emergency_24x7);
    if (trauma_facility !== undefined) facilityUpdates.trauma_facility = Boolean(trauma_facility);
    if (total_beds !== undefined) facilityUpdates.total_beds = Number(total_beds);
    if (emergency_beds !== undefined) facilityUpdates.emergency_beds = Number(emergency_beds);
    if (specialists !== undefined) facilityUpdates.specialists = Array.isArray(specialists) ? specialists : [];

    const updatedFacilities = db.updateHospitalFacilities(hospitalId, facilityUpdates);
    const updatedHospital = db.getHospitalById(hospitalId);

    const { password_hash: _, ...hospitalData } = updatedHospital;

    const io = req.app.get('io');
    if (io) {
      io.emit('hospital:updated', {
        ...hospitalData,
        facilities: updatedFacilities
      });
    }

    res.json({
      ...hospitalData,
      facilities: updatedFacilities
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateStatus = (req, res) => {
  try {
    const hospitalId = req.hospitalId;
    const { emergency_status } = req.body;

    if (emergency_status !== 'OPEN' && emergency_status !== 'CLOSED') {
      return res.status(400).json({ error: 'emergency_status must be either OPEN or CLOSED' });
    }

    const updated = db.updateHospital(hospitalId, { emergency_status });
    const facilities = db.getHospitalFacilities(hospitalId);
    const { password_hash: _, ...hospitalData } = updated;

    const io = req.app.get('io');
    if (io) {
      io.emit('hospital:updated', {
        ...hospitalData,
        facilities
      });
    }

    res.json({
      ...hospitalData,
      facilities
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getEmergencies = (req, res) => {
  try {
    const hospitalId = req.hospitalId;
    const requests = db.getRequestsForHospital(hospitalId);
    
    const list = requests.map(r => {
      const emergency = db.getEmergencyById(r.incident_id);
      if (!emergency) return null;
      return {
        request_id: r.id,
        status: r.status,
        accepted_at: r.accepted_at,
        rejected_at: r.rejected_at,
        created_at: r.created_at,
        emergency
      };
    }).filter(Boolean);

    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.acceptEmergency = (req, res) => {
  try {
    const hospitalId = req.hospitalId;
    const { incident_id } = req.body;

    if (!incident_id) {
      return res.status(400).json({ error: 'Missing incident_id' });
    }

    const emergency = db.getEmergencyById(incident_id);
    if (!emergency) {
      return res.status(404).json({ error: 'Emergency incident not found' });
    }

    if (emergency.assigned_hospital_id) {
      return res.status(409).json({ error: 'Emergency incident already accepted by another hospital' });
    }

    // Assign hospital to emergency
    const updatedEmergency = db.updateEmergency(incident_id, {
      assigned_hospital_id: hospitalId
    });

    // Accept this request
    const hospitalReq = db.getEmergencyHospitalRequest(incident_id, hospitalId);
    if (hospitalReq) {
      db.updateHospitalRequest(hospitalReq.id, {
        status: 'Accepted',
        accepted_at: new Date().toISOString()
      });
    }

    // Reject all other pending requests for this incident
    const allReqs = db.getHospitalRequestsForIncident(incident_id);
    allReqs.forEach(r => {
      if (r.hospital_id !== hospitalId && r.status === 'Pending') {
        db.updateHospitalRequest(r.id, {
          status: 'Rejected',
          rejected_at: new Date().toISOString()
        });
      }
    });

    const hospital = db.getHospitalById(hospitalId);
    const facilities = db.getHospitalFacilities(hospitalId);
    const { password_hash: _, ...hospitalData } = hospital;

    const io = req.app.get('io');
    if (io) {
      io.emit('emergency:updated', updatedEmergency);
      io.emit('dispatch:hospital_assigned', {
        emergency: updatedEmergency,
        hospital: {
          ...hospitalData,
          facilities
        }
      });

      // Emit directly to the assigned ambulance if it is logged in/online
      if (updatedEmergency.assigned_ambulance) {
        io.to(`ambulance:${updatedEmergency.assigned_ambulance}`).emit('emergency:hospital_assigned', {
          emergency: updatedEmergency,
          hospital: {
            ...hospitalData,
            facilities
          }
        });
      }
    }

    res.json({
      message: 'Emergency incident request accepted successfully',
      emergency: updatedEmergency
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.rejectEmergency = (req, res) => {
  try {
    const hospitalId = req.hospitalId;
    const { incident_id } = req.body;

    if (!incident_id) {
      return res.status(400).json({ error: 'Missing incident_id' });
    }

    const hospitalReq = db.getEmergencyHospitalRequest(incident_id, hospitalId);
    if (!hospitalReq) {
      return res.status(404).json({ error: 'Emergency request for this hospital not found' });
    }

    const updatedRequest = db.updateHospitalRequest(hospitalReq.id, {
      status: 'Rejected',
      rejected_at: new Date().toISOString()
    });

    res.json({
      message: 'Emergency incident request rejected successfully',
      request: updatedRequest
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getHospitalsList = (req, res) => {
  try {
    const list = db.getHospitals().map(h => {
      const { password_hash: _, ...hData } = h;
      const facilities = db.getHospitalFacilities(h.hospital_id);
      return {
        ...hData,
        facilities
      };
    });
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
