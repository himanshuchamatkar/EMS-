const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("CRITICAL: Supabase URL or Service Role Key is missing in environment variables!");
}

const supabase = createClient(supabaseUrl, supabaseKey);

const db = {
  // Reset database back to default seed state
  async reset() {
    try {
      // Delete logs, emergencies and seed new ones
      await supabase.from('dispatch_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('emergencies').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('ambulances').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      const seedAmbs = [
        { id: 'a1111111-1111-1111-1111-111111111111', name: 'Rescue Alpha', vehicle_number: 'AMB-911-A', driver_name: 'John Doe', latitude: 28.6353, longitude: 77.2250, status: 'Available', speed: 0, heading: 0 },
        { id: 'a2222222-2222-2222-2222-222222222222', name: 'Rescue Bravo', vehicle_number: 'AMB-911-B', driver_name: 'Jane Smith', latitude: 28.5833, longitude: 77.2289, status: 'Busy', speed: 45, heading: 90 },
        { id: 'a3333333-3333-3333-3333-333333333333', name: 'Rescue Charlie', vehicle_number: 'AMB-911-C', driver_name: 'Robert Johnson', latitude: 28.6562, longitude: 77.2410, status: 'Offline', speed: 0, heading: 0 }
      ];
      await supabase.from('ambulances').insert(seedAmbs);
      
      const seedEmergencies = [
        { id: 'e1111111-1111-1111-1111-111111111111', latitude: 28.5980, longitude: 77.2220, description: 'Car collision near Lodhi Colony. Two people injured.', priority: 'High', assigned_ambulance: 'a2222222-2222-2222-2222-222222222222', status: 'Assigned' }
      ];
      await supabase.from('emergencies').insert(seedEmergencies);

      const seedLogs = [
        { id: 'd1111111-1111-1111-1111-111111111111', emergency_id: 'e1111111-1111-1111-1111-111111111111', ambulance_id: 'a2222222-2222-2222-2222-222222222222', status: 'Dispatched' }
      ];
      await supabase.from('dispatch_logs').insert(seedLogs);
      return { status: 'success' };
    } catch (err) {
      console.error('Error seeding DB:', err);
      throw err;
    }
  },

  // Ambulances API
  async getAmbulances() {
    const { data, error } = await supabase.from('ambulances').select('*');
    if (error) throw error;
    return data;
  },

  async getAmbulanceById(id) {
    const { data, error } = await supabase.from('ambulances').select('*').eq('id', id);
    if (error || !data || data.length === 0) return null;
    return data[0];
  },

  async addAmbulance(ambulance) {
    const { data, error } = await supabase.from('ambulances').insert([ambulance]).select();
    if (error) throw error;
    return data[0];
  },

  async updateAmbulance(id, updates) {
    const { data, error } = await supabase.from('ambulances').update(updates).eq('id', id).select();
    if (error) throw error;
    if (!data || data.length === 0) return null;
    return data[0];
  },

  async deleteAmbulance(id) {
    const { error } = await supabase.from('ambulances').delete().eq('id', id);
    return !error;
  },

  // Emergencies API
  async getEmergencies() {
    const { data, error } = await supabase.from('emergencies').select('*');
    if (error) throw error;
    return data;
  },

  async getEmergencyById(id) {
    const { data, error } = await supabase.from('emergencies').select('*').eq('id', id);
    if (error || !data || data.length === 0) return null;
    return data[0];
  },

  async addEmergency(emergency) {
    const { data, error } = await supabase.from('emergencies').insert([emergency]).select();
    if (error) throw error;
    return data[0];
  },

  async updateEmergency(id, updates) {
    const { data, error } = await supabase.from('emergencies').update(updates).eq('id', id).select();
    if (error) throw error;
    if (!data || data.length === 0) return null;
    return data[0];
  },

  async deleteEmergency(id) {
    const { error } = await supabase.from('emergencies').delete().eq('id', id);
    return !error;
  },

  // Dispatch Logs API
  async getDispatchLogs() {
    const { data, error } = await supabase.from('dispatch_logs').select('*');
    if (error) throw error;
    return data;
  },

  async addDispatchLog(log) {
    const { data, error } = await supabase.from('dispatch_logs').insert([log]).select();
    if (error) throw error;
    return data[0];
  },

  async updateDispatchLogForEmergency(emergencyId, updates) {
    // Get all logs for the emergency
    const { data: logs, error } = await supabase
      .from('dispatch_logs')
      .select('*')
      .eq('emergency_id', emergencyId);

    if (error || !logs || logs.length === 0) return null;

    // Find latest log
    const latestLog = logs.sort((a, b) => new Date(b.assigned_time) - new Date(a.assigned_time))[0];

    const { data: updatedLog, error: updateError } = await supabase
      .from('dispatch_logs')
      .update(updates)
      .eq('id', latestLog.id)
      .select();

    if (updateError) throw updateError;
    if (!updatedLog || updatedLog.length === 0) return null;
    return updatedLog[0];
  }
};

module.exports = db;
