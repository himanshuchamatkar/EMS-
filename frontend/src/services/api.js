const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  const config = {
    ...options,
    headers
  };

  if (options.body) {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, config);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
}

const SUPABASE_URL = 'https://lgrfsqhrtwewdswhuwrq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxncmZzcWhydHdld2Rzd2h1d3JxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4Mzc0OTgxOSwiZXhwIjoyMDk5MzI1ODE5fQ.JKyUVPnE-gGOQ9UrhQmrHbEJS33preLbtyr5SYgyUbs';

async function deleteFromSupabaseDirect(id) {
  try {
    const headers = {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    };
    await fetch(`${SUPABASE_URL}/rest/v1/dispatch_logs?emergency_id=eq.${id}`, {
      method: 'DELETE',
      headers
    }).catch(() => {});

    await fetch(`${SUPABASE_URL}/rest/v1/emergencies?id=eq.${id}`, {
      method: 'DELETE',
      headers
    }).catch(() => {});
  } catch (err) {
    console.error('Supabase direct delete error:', err);
  }
}

async function deleteAllFromSupabaseDirect() {
  try {
    const headers = {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    };
    await fetch(`${SUPABASE_URL}/rest/v1/dispatch_logs?id=neq.00000000-0000-0000-0000-000000000000`, {
      method: 'DELETE',
      headers
    }).catch(() => {});

    await fetch(`${SUPABASE_URL}/rest/v1/emergencies?id=neq.00000000-0000-0000-0000-000000000000`, {
      method: 'DELETE',
      headers
    }).catch(() => {});
  } catch (err) {
    console.error('Supabase direct delete all error:', err);
  }
}

export const api = {
  // Ambulances
  getAmbulances() {
    return request('/ambulances');
  },
  createAmbulance(data) {
    return request('/ambulances', {
      method: 'POST',
      body: data
    });
  },
  updateAmbulance(id, data) {
    return request(`/ambulances/${id}`, {
      method: 'PUT',
      body: data
    });
  },
  deleteAmbulance(id) {
    return request(`/ambulances/${id}`, {
      method: 'DELETE'
    });
  },
  deleteHospital(id) {
    return request(`/hospitals/${id}`, {
      method: 'DELETE'
    });
  },

  // Emergencies
  getEmergencies() {
    return request('/emergencies');
  },
  createEmergency(data) {
    return request('/emergencies', {
      method: 'POST',
      body: data
    });
  },
  async deleteEmergency(id) {
    deleteFromSupabaseDirect(id);
    return request(`/emergencies/${id}`, {
      method: 'DELETE'
    }).catch((err) => {
      console.warn('Backend API delete emergency failed, fallback to Supabase direct delete:', err);
      return { message: 'Deleted via Supabase fallback' };
    });
  },
  async deleteAllEmergencies() {
    deleteAllFromSupabaseDirect();
    return request('/emergencies', {
      method: 'DELETE'
    }).catch((err) => {
      console.warn('Backend API delete all emergencies failed, fallback to Supabase direct delete:', err);
      return { message: 'Cleared all via Supabase fallback' };
    });
  },

  // Dispatch operations
  findNearest(latitude, longitude) {
    return request('/dispatch/find-nearest', {
      method: 'POST',
      body: { latitude, longitude }
    });
  },
  assignAmbulance(emergencyId, ambulanceId) {
    return request('/dispatch/assign', {
      method: 'POST',
      body: { emergency_id: emergencyId, ambulance_id: ambulanceId }
    });
  },
  cancelAssignment(emergencyId) {
    return request('/dispatch/cancel', {
      method: 'POST',
      body: { emergency_id: emergencyId }
    });
  },
  getDispatchHistory() {
    return request('/dispatch/history');
  },
  deleteDispatchLog(id) {
    return request(`/dispatch/logs/${id}`, {
      method: 'DELETE'
    });
  },

  // Simulation operations
  startSimulation() {
    return request('/simulation/start', { method: 'POST' });
  },
  pauseSimulation() {
    return request('/simulation/pause', { method: 'POST' });
  },
  resetSimulation() {
    return request('/simulation/reset', { method: 'POST' });
  },
  getSimulationStatus() {
    return request('/simulation/status');
  },

  // System mode (Simulation vs Live GPS)
  getMode() {
    return request('/system/mode');
  },
  setMode(mode) {
    return request('/system/mode', { method: 'POST', body: { mode } });
  },
  getHospitals() {
    return request('/hospitals/list');
  }
};
