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
  deleteEmergency(id) {
    return request(`/emergencies/${id}`, {
      method: 'DELETE'
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
  }
};
