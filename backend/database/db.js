const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, 'db.json');

const defaultSeedData = {
  ambulances: [
    {
      id: 'a1111111-1111-1111-1111-111111111111',
      name: 'Rescue Alpha',
      vehicle_number: 'AMB-911-A',
      driver_name: 'John Doe',
      latitude: 28.6353,
      longitude: 77.2250,
      status: 'Available',
      speed: 0,
      heading: 0,
      created_at: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: 'a2222222-2222-2222-2222-222222222222',
      name: 'Rescue Bravo',
      vehicle_number: 'AMB-911-B',
      driver_name: 'Jane Smith',
      latitude: 28.5833,
      longitude: 77.2289,
      status: 'Busy',
      speed: 45,
      heading: 90,
      created_at: new Date(Date.now() - 3600000 * 3).toISOString()
    },
    {
      id: 'a3333333-3333-3333-3333-333333333333',
      name: 'Rescue Charlie',
      vehicle_number: 'AMB-911-C',
      driver_name: 'Robert Johnson',
      latitude: 28.6562,
      longitude: 77.2410,
      status: 'Offline',
      speed: 0,
      heading: 0,
      created_at: new Date(Date.now() - 3600000 * 4).toISOString()
    },
    {
      id: 'a4444444-4444-4444-4444-444444444444',
      name: 'Rescue Delta',
      vehicle_number: 'AMB-911-D',
      driver_name: 'Sarah Williams',
      latitude: 28.5244,
      longitude: 77.1855,
      status: 'Maintenance',
      speed: 0,
      heading: 0,
      created_at: new Date(Date.now() - 3600000 * 5).toISOString()
    },
    {
      id: 'a5555555-5555-5555-5555-555555555555',
      name: 'Rescue Echo',
      vehicle_number: 'AMB-911-E',
      driver_name: 'David Miller',
      latitude: 28.6129,
      longitude: 77.2295,
      status: 'Available',
      speed: 0,
      heading: 0,
      created_at: new Date(Date.now() - 3600000).toISOString()
    },
    {
      id: 'a6666666-6666-6666-6666-666666666666',
      name: 'Rescue Foxtrot',
      vehicle_number: 'AMB-911-F',
      driver_name: 'Emily Davis',
      latitude: 28.5910,
      longitude: 77.1950,
      status: 'Available',
      speed: 0,
      heading: 0,
      created_at: new Date().toISOString()
    }
  ],
  emergencies: [
    {
      id: 'e1111111-1111-1111-1111-111111111111',
      latitude: 28.5980,
      longitude: 77.2220,
      description: 'Car collision near Lodhi Colony. Two people injured.',
      priority: 'High',
      assigned_ambulance: 'a2222222-2222-2222-2222-222222222222',
      status: 'Assigned',
      created_at: new Date(Date.now() - 1200000).toISOString()
    },
    {
      id: 'e2222222-2222-2222-2222-222222222222',
      latitude: 28.6300,
      longitude: 77.2150,
      description: 'Patient showing symptoms of cardiac arrest near Connaught Place.',
      priority: 'Critical',
      assigned_ambulance: null,
      status: 'Pending',
      created_at: new Date(Date.now() - 600000).toISOString()
    }
  ],
  dispatch_logs: [
    {
      id: 'd1111111-1111-1111-1111-111111111111',
      emergency_id: 'e1111111-1111-1111-1111-111111111111',
      ambulance_id: 'a2222222-2222-2222-2222-222222222222',
      assigned_time: new Date(Date.now() - 1200000).toISOString(),
      response_time: null,
      status: 'Dispatched'
    }
  ]
};

// Initialize DB file if not exists or invalid JSON
function initDB() {
  const dirPath = path.dirname(dbPath);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  try {
    if (fs.existsSync(dbPath)) {
      const data = fs.readFileSync(dbPath, 'utf8');
      JSON.parse(data); // Validate JSON format
    } else {
      writeDB(defaultSeedData);
    }
  } catch (err) {
    console.warn('DB file corrupt or missing. Re-seeding database...');
    writeDB(defaultSeedData);
  }
}

function readDB() {
  try {
    const data = fs.readFileSync(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return defaultSeedData;
  }
}

function writeDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
}

initDB();

const db = {
  // Reset database to seed data
  reset() {
    writeDB(defaultSeedData);
    return defaultSeedData;
  },

  // Ambulances
  getAmbulances() {
    return readDB().ambulances;
  },

  getAmbulanceById(id) {
    return readDB().ambulances.find(amb => amb.id === id);
  },

  addAmbulance(ambulance) {
    const data = readDB();
    const newAmbulance = {
      id: uuidv4(),
      speed: 0,
      heading: 0,
      created_at: new Date().toISOString(),
      ...ambulance
    };
    data.ambulances.push(newAmbulance);
    writeDB(data);
    return newAmbulance;
  },

  updateAmbulance(id, updates) {
    const data = readDB();
    const index = data.ambulances.findIndex(amb => amb.id === id);
    if (index === -1) return null;

    data.ambulances[index] = {
      ...data.ambulances[index],
      ...updates
    };
    writeDB(data);
    return data.ambulances[index];
  },

  deleteAmbulance(id) {
    const data = readDB();
    const index = data.ambulances.findIndex(amb => amb.id === id);
    if (index === -1) return false;

    data.ambulances.splice(index, 1);
    
    // Also clean up any active assignments in emergencies and dispatch logs
    data.emergencies = data.emergencies.map(emp => {
      if (emp.assigned_ambulance === id) {
        return { ...emp, assigned_ambulance: null, status: 'Pending' };
      }
      return emp;
    });

    writeDB(data);
    return true;
  },

  // Emergencies
  getEmergencies() {
    return readDB().emergencies;
  },

  getEmergencyById(id) {
    return readDB().emergencies.find(emp => emp.id === id);
  },

  addEmergency(emergency) {
    const data = readDB();
    const newEmergency = {
      id: uuidv4(),
      assigned_ambulance: null,
      status: 'Pending',
      created_at: new Date().toISOString(),
      ...emergency
    };
    data.emergencies.push(newEmergency);
    writeDB(data);
    return newEmergency;
  },

  updateEmergency(id, updates) {
    const data = readDB();
    const index = data.emergencies.findIndex(emp => emp.id === id);
    if (index === -1) return null;

    data.emergencies[index] = {
      ...data.emergencies[index],
      ...updates
    };
    writeDB(data);
    return data.emergencies[index];
  },

  deleteEmergency(id) {
    const data = readDB();
    const index = data.emergencies.findIndex(emp => emp.id === id);
    if (index === -1) return false;

    const emp = data.emergencies[index];
    data.emergencies.splice(index, 1);

    // If an ambulance was assigned, set it to Available
    if (emp.assigned_ambulance) {
      const ambIndex = data.ambulances.findIndex(a => a.id === emp.assigned_ambulance);
      if (ambIndex !== -1) {
        data.ambulances[ambIndex].status = 'Available';
        data.ambulances[ambIndex].speed = 0;
      }
    }

    writeDB(data);
    return true;
  },

  // Dispatch Logs
  getDispatchLogs() {
    return readDB().dispatch_logs;
  },

  addDispatchLog(log) {
    const data = readDB();
    const newLog = {
      id: uuidv4(),
      assigned_time: new Date().toISOString(),
      response_time: null,
      status: 'Dispatched',
      ...log
    };
    data.dispatch_logs.push(newLog);
    writeDB(data);
    return newLog;
  },

  updateDispatchLogForEmergency(emergencyId, updates) {
    const data = readDB();
    const logs = data.dispatch_logs.filter(log => log.emergency_id === emergencyId);
    if (logs.length === 0) return null;

    // Find the latest active log for this emergency
    const latestLog = logs.sort((a, b) => new Date(b.assigned_time) - new Date(a.assigned_time))[0];
    const logIndex = data.dispatch_logs.findIndex(log => log.id === latestLog.id);
    
    if (logIndex !== -1) {
      data.dispatch_logs[logIndex] = {
        ...data.dispatch_logs[logIndex],
        ...updates
      };
      writeDB(data);
      return data.dispatch_logs[logIndex];
    }
    return null;
  }
};

module.exports = db;
