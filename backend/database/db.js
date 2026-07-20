const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("CRITICAL: Supabase URL or Service Role Key is missing in environment variables!");
}

const supabase = createClient(supabaseUrl, supabaseKey);

// In-memory cache to support synchronous operations
let dbCache = {
  ambulances: [],
  emergencies: [],
  dispatch_logs: []
};

let initialized = false;

// Async function to load cache from Supabase on startup
async function loadCache() {
  try {
    console.log('Initializing database cache from Supabase...');
    const { data: ambulances, error: err1 } = await supabase.from('ambulances').select('*');
    const { data: emergencies, error: err2 } = await supabase.from('emergencies').select('*');
    const { data: logs, error: err3 } = await supabase.from('dispatch_logs').select('*');

    if (err1) console.error('Error loading ambulances from Supabase:', err1);
    if (err2) console.error('Error loading emergencies from Supabase:', err2);
    if (err3) console.error('Error loading dispatch logs from Supabase:', err3);

    dbCache.ambulances = ambulances || [];
    dbCache.emergencies = emergencies || [];
    dbCache.dispatch_logs = logs || [];
    initialized = true;
    
    console.log(`Database cache loaded successfully. Ambulances: ${dbCache.ambulances.length}, Emergencies: ${dbCache.emergencies.length}, Logs: ${dbCache.dispatch_logs.length}`);
  } catch (err) {
    console.error('Failed to load database cache from Supabase:', err);
  }
}

// Fire loadCache on startup
loadCache();

const db = {
  // Reset database back to default seed state
  reset() {
    console.log('Resetting database and seeding cache...');
    
    // Synchronously update local cache to seed data
    dbCache.ambulances = [
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
      }
    ];

    dbCache.emergencies = [
      {
        id: 'e1111111-1111-1111-1111-111111111111',
        latitude: 28.5980,
        longitude: 77.2220,
        description: 'Car collision near Lodhi Colony. Two people injured.',
        priority: 'High',
        assigned_ambulance: 'a2222222-2222-2222-2222-222222222222',
        status: 'Assigned',
        created_at: new Date(Date.now() - 1200000).toISOString()
      }
    ];

    dbCache.dispatch_logs = [
      {
        id: 'd1111111-1111-1111-1111-111111111111',
        emergency_id: 'e1111111-1111-1111-1111-111111111111',
        ambulance_id: 'a2222222-2222-2222-2222-222222222222',
        assigned_time: new Date(Date.now() - 1200000).toISOString(),
        response_time: null,
        status: 'Dispatched'
      }
    ];

    // Asynchronously update Supabase in the background
    (async () => {
      try {
        await supabase.from('dispatch_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('emergencies').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        await supabase.from('ambulances').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        
        await supabase.from('ambulances').insert(dbCache.ambulances);
        await supabase.from('emergencies').insert(dbCache.emergencies);
        await supabase.from('dispatch_logs').insert(dbCache.dispatch_logs);
        console.log('Supabase database sync reset successful.');
      } catch (err) {
        console.error('Failed to reset Supabase database:', err);
      }
    })();

    return dbCache;
  },

  // Ambulances API
  getAmbulances() {
    return dbCache.ambulances;
  },

  getAmbulanceById(id) {
    return dbCache.ambulances.find(amb => amb.id === id) || null;
  },

  addAmbulance(ambulance) {
    const newAmbulance = {
      id: ambulance.id || uuidv4(),
      speed: 0,
      heading: 0,
      created_at: new Date().toISOString(),
      ...ambulance
    };
    
    // Update local cache
    dbCache.ambulances.push(newAmbulance);
    
    // Async write to Supabase in the background
    supabase.from('ambulances').insert([newAmbulance]).then(({ error }) => {
      if (error) console.error('Error adding ambulance to Supabase:', error);
    });

    return newAmbulance;
  },

  updateAmbulance(id, updates) {
    const index = dbCache.ambulances.findIndex(amb => amb.id === id);
    if (index === -1) return null;

    dbCache.ambulances[index] = {
      ...dbCache.ambulances[index],
      ...updates
    };
    const updated = dbCache.ambulances[index];

    // `accuracy`/`timestamp` are live GPS-quality metadata used for in-memory
    // filtering and dashboard display, not part of the persisted schema —
    // exclude them so an unknown column doesn't fail the whole write.
    const { accuracy, timestamp, ...persistedUpdates } = updates;

    // Async write to Supabase in the background
    supabase.from('ambulances').update(persistedUpdates).eq('id', id).then(({ error }) => {
      if (error) console.error(`Error updating ambulance ${id} on Supabase:`, error);
    });

    return updated;
  },

  deleteAmbulance(id) {
    const index = dbCache.ambulances.findIndex(amb => amb.id === id);
    if (index === -1) return false;

    dbCache.ambulances.splice(index, 1);
    
    // Clean up assignments in cache
    dbCache.emergencies = dbCache.emergencies.map(emp => {
      if (emp.assigned_ambulance === id) {
        return { ...emp, assigned_ambulance: null, status: 'Pending' };
      }
      return emp;
    });

    // Async delete on Supabase in the background
    supabase.from('ambulances').delete().eq('id', id).then(({ error }) => {
      if (error) console.error(`Error deleting ambulance ${id} from Supabase:`, error);
    });

    return true;
  },

  // Emergencies API
  getEmergencies() {
    return dbCache.emergencies;
  },

  getEmergencyById(id) {
    return dbCache.emergencies.find(emp => emp.id === id) || null;
  },

  addEmergency(emergency) {
    const newEmergency = {
      id: emergency.id || uuidv4(),
      assigned_ambulance: null,
      status: 'Pending',
      created_at: new Date().toISOString(),
      ...emergency
    };
    
    // Update local cache
    dbCache.emergencies.push(newEmergency);

    // Strip non-persisted in-memory fields before writing to Supabase
    const { offered_to, rejected_by, ...persistedEmergency } = newEmergency;
    // Async write to Supabase in the background
    supabase.from('emergencies').insert([persistedEmergency]).then(({ error }) => {
      if (error) console.error('Error adding emergency to Supabase:', error);
    });

    return newEmergency;
  },

  updateEmergency(id, updates) {
    const index = dbCache.emergencies.findIndex(emp => emp.id === id);
    if (index === -1) return null;

    dbCache.emergencies[index] = {
      ...dbCache.emergencies[index],
      ...updates
    };
    const updated = dbCache.emergencies[index];

    // Strip non-persisted in-memory fields before writing to Supabase
    const { offered_to, rejected_by, ...persistedUpdates } = updates;
    
    // If updates has keys to persist, perform update
    if (Object.keys(persistedUpdates).length > 0) {
      supabase.from('emergencies').update(persistedUpdates).eq('id', id).then(({ error }) => {
        if (error) console.error(`Error updating emergency ${id} on Supabase:`, error);
      });
    }

    return updated;
  },

  /**
   * "First Responder Wins" atomic lock: transitions an emergency from
   * Offered -> Assigned for exactly one ambulance. The read-check-write here
   * is a single synchronous block (no `await` anywhere in it), and Node's
   * event loop can't preempt a synchronous function mid-execution — so even
   * if two /dispatch/accept requests for the same emergency arrive back to
   * back, the second one always observes the first one's write and loses.
   * Returns { error: null, emergency } on success, or
   * { error: 'not_found' | 'already_assigned' | 'not_offered', emergency }.
   */
  lockEmergencyForAmbulance(emergencyId, ambulanceId) {
    const index = dbCache.emergencies.findIndex(emp => emp.id === emergencyId);
    if (index === -1) return { error: 'not_found', emergency: null };

    const emergency = dbCache.emergencies[index];

    if (emergency.assigned_ambulance) {
      return { error: 'already_assigned', emergency };
    }
    if (emergency.status !== 'Offered' || !(emergency.offered_to || []).includes(ambulanceId)) {
      return { error: 'not_offered', emergency };
    }

    dbCache.emergencies[index] = {
      ...emergency,
      status: 'Assigned',
      assigned_ambulance: ambulanceId
    };
    const updated = dbCache.emergencies[index];

    // Async write to Supabase in the background
    supabase.from('emergencies').update({
      status: 'Assigned',
      assigned_ambulance: ambulanceId
    }).eq('id', emergencyId).then(({ error }) => {
      if (error) console.error(`Error locking emergency ${emergencyId} on Supabase:`, error);
    });

    return { error: null, emergency: updated };
  },

  deleteEmergency(id) {
    const index = dbCache.emergencies.findIndex(emp => emp.id === id);
    if (index === -1) return false;

    const emp = dbCache.emergencies[index];
    dbCache.emergencies.splice(index, 1);

    // Remove associated dispatch logs from cache as well
    dbCache.dispatch_logs = dbCache.dispatch_logs.filter(log => log.emergency_id !== id);

    // Reset assigned ambulance status in cache
    if (emp.assigned_ambulance) {
      const ambIndex = dbCache.ambulances.findIndex(a => a.id === emp.assigned_ambulance);
      if (ambIndex !== -1) {
        dbCache.ambulances[ambIndex].status = 'Available';
        dbCache.ambulances[ambIndex].speed = 0;
      }
    }

    // Async delete on Supabase in proper order (dispatch_logs first to satisfy FK constraint, then emergencies)
    (async () => {
      try {
        const { error: logError } = await supabase.from('dispatch_logs').delete().eq('emergency_id', id);
        if (logError) console.error(`Error deleting dispatch logs for emergency ${id} from Supabase:`, logError);

        const { error: empError } = await supabase.from('emergencies').delete().eq('id', id);
        if (empError) console.error(`Error deleting emergency ${id} from Supabase:`, empError);
      } catch (err) {
        console.error(`Error deleting emergency ${id} from Supabase:`, err);
      }
    })();

    return true;
  },

  // Dispatch Logs API
  getDispatchLogs() {
    return dbCache.dispatch_logs;
  },

  deleteDispatchLog(id) {
    const index = dbCache.dispatch_logs.findIndex(log => log.id === id);
    if (index === -1) return false;

    dbCache.dispatch_logs.splice(index, 1);

    supabase.from('dispatch_logs').delete().eq('id', id).then(({ error }) => {
      if (error) console.error(`Error deleting dispatch log ${id} from Supabase:`, error);
    });

    return true;
  },

  addDispatchLog(log) {
    const newLog = {
      id: log.id || uuidv4(),
      assigned_time: new Date().toISOString(),
      response_time: null,
      status: 'Dispatched',
      ...log
    };
    
    // Update local cache
    dbCache.dispatch_logs.push(newLog);

    // Async write to Supabase in the background
    supabase.from('dispatch_logs').insert([newLog]).then(({ error }) => {
      if (error) console.error('Error adding dispatch log to Supabase:', error);
    });

    return newLog;
  },

  updateDispatchLogForEmergency(emergencyId, updates) {
    const logs = dbCache.dispatch_logs.filter(log => log.emergency_id === emergencyId);
    if (logs.length === 0) return null;

    // Find latest log
    const latestLog = logs.sort((a, b) => new Date(b.assigned_time) - new Date(a.assigned_time))[0];
    const logIndex = dbCache.dispatch_logs.findIndex(log => log.id === latestLog.id);
    
    if (logIndex !== -1) {
      dbCache.dispatch_logs[logIndex] = {
        ...dbCache.dispatch_logs[logIndex],
        ...updates
      };
      const updated = dbCache.dispatch_logs[logIndex];

      // Async write to Supabase in the background
      supabase.from('dispatch_logs').update(updates).eq('id', latestLog.id).then(({ error }) => {
        if (error) console.error(`Error updating dispatch log ${latestLog.id} on Supabase:`, error);
      });

      return updated;
    }
    return null;
  }
};

module.exports = db;
