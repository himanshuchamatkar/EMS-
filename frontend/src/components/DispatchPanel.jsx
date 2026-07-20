import React, { useState, useEffect } from 'react';
import { ShieldAlert, MapPin, Navigation, Clock, Ban, UserCheck, History, X, Compass, Image, Video, Mic } from 'lucide-react';
import { api } from '../services/api';

const DispatchPanel = ({
  selectedEmergency,
  ambulances,
  onReassign,
  onCancel,
  onClose,
  historyTrigger
}) => {
  const [availableAmbulances, setAvailableAmbulances] = useState([]);
  const [selectedAmbId, setSelectedAmbId] = useState('');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Filter available ambulances whenever list of ambulances updates
  useEffect(() => {
    setAvailableAmbulances(ambulances.filter(a => a.status === 'Available'));
  }, [ambulances]);

  // Fetch history logs
  const fetchLogs = async () => {
    try {
      setLoadingLogs(true);
      const data = await api.getDispatchHistory();
      // Sort logs by time descending
      setLogs(data.sort((a, b) => new Date(b.assigned_time) - new Date(a.assigned_time)));
    } catch (err) {
      console.error('Failed to load dispatch history logs:', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (historyOpen || historyTrigger) {
      fetchLogs();
    }
  }, [historyOpen, historyTrigger]);

  if (!selectedEmergency) {
    // If no emergency is selected, but user clicked history
    if (historyOpen) {
      return renderHistoryModal();
    }
    return null;
  }

  // Find currently assigned ambulance if any
  const assignedAmbulance = ambulances.find(a => a.id === selectedEmergency.assigned_ambulance);

  // Distance calculation
  // We can calculate straight line distance or get it if it was precomputed. 
  // Let's compute it live on the client side using Haversine if needed, or estimate it.
  const calculateLiveDistance = () => {
    if (!assignedAmbulance) return null;
    
    // Client-side simple Haversine formula
    const lat1 = selectedEmergency.latitude;
    const lon1 = selectedEmergency.longitude;
    const lat2 = assignedAmbulance.latitude;
    const lon2 = assignedAmbulance.longitude;

    const R = 6371; // km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = R * c;
    return dist;
  };

  const distance = calculateLiveDistance();
  
  // Calculate ETA (Estimate: 1.5 minutes per km if speed is low, or dist / speed * 60)
  const calculateETA = () => {
    if (!distance) return 'N/A';
    if (distance < 0.1) return 'Arrived';
    
    const speed = assignedAmbulance.speed || 40;
    const timeHours = distance / speed;
    const timeMinutes = Math.round(timeHours * 60);
    
    if (timeMinutes <= 1) return 'Less than a minute';
    return `${timeMinutes} mins`;
  };

  const handleManualReassign = (e) => {
    e.preventDefault();
    if (!selectedAmbId) return;
    onReassign(selectedEmergency.id, selectedAmbId);
    setSelectedAmbId('');
  };

  function renderHistoryModal() {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setHistoryOpen(false)} />
        <div className="relative w-full max-w-4xl bg-dark-card border border-dark-border rounded-xl shadow-2xl p-6 overflow-hidden flex flex-col max-h-[85vh]">
          <div className="flex items-center justify-between border-b border-dark-border pb-3 mb-4">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <History className="w-5 h-5 text-brand-blue" /> Dispatch Logs History
            </h3>
            <button 
              onClick={() => setHistoryOpen(false)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-100 hover:bg-dark-hover transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="overflow-auto flex-1">
            {loadingLogs ? (
              <div className="text-center py-12 text-slate-400">Loading historical logs...</div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12 text-slate-500 italic">No dispatch records found in database.</div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-dark-border/80 bg-slate-900/50 text-slate-400 font-bold uppercase select-none">
                    <th className="p-3">Log ID</th>
                    <th className="p-3">Ambulance</th>
                    <th className="p-3">Priority</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Assigned Time</th>
                    <th className="p-3">Response Time</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border/40">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/20 text-slate-300">
                      <td className="p-3 font-mono text-[10px] text-slate-500">{log.id.slice(0, 8)}...</td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-200">{log.ambulance_name}</div>
                        <div className="text-[10px] text-slate-500">{log.vehicle_number}</div>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.priority === 'Critical' ? 'bg-red-500/20 text-red-400' :
                          log.priority === 'High' ? 'bg-amber-500/20 text-amber-400' :
                          log.priority === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {log.priority}
                        </span>
                      </td>
                      <td className="p-3 truncate max-w-xs" title={log.description}>{log.description}</td>
                      <td className="p-3 text-slate-400">{new Date(log.assigned_time).toLocaleString()}</td>
                      <td className="p-3 text-slate-400">
                        {log.response_time ? (
                          <span className="text-emerald-400">
                            {Math.round((new Date(log.response_time) - new Date(log.assigned_time)) / 1000)}s
                          </span>
                        ) : '-'}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.status === 'Delivered' ? 'bg-emerald-500/20 text-emerald-400' :
                          log.status === 'Cancelled' ? 'bg-red-500/20 text-red-400' :
                          log.status === 'Reassigned' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-blue-500/20 text-blue-400'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="absolute bottom-4 left-4 right-4 md:left-[21rem] md:right-4 bg-dark-card/95 border border-dark-border/80 backdrop-blur-md rounded-xl p-4 shadow-2xl flex flex-col md:flex-row gap-4 justify-between items-start md:items-center z-[500] animate-in slide-in-from-bottom duration-300">
        
        {/* Detail Panel */}
        <div className="flex-1 space-y-2">
          <div className="flex items-start gap-3">
            {selectedEmergency.photo_url && (
              <a href={selectedEmergency.photo_url} target="_blank" rel="noopener noreferrer" className="shrink-0 mt-1">
                <img
                  src={selectedEmergency.photo_url}
                  alt="Incident Attachment"
                  className="w-12 h-12 object-cover rounded-lg border border-dark-border hover:border-brand-blue transition-all"
                />
              </a>
            )}
            <div className="flex-grow">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-brand-blue/15 text-brand-blue rounded-lg">
                  <ShieldAlert className="w-5 h-5" />
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-extrabold text-slate-200 uppercase tracking-wide">Incident Active Dispatch</h4>
                    <span className="text-[10px] text-slate-500 font-mono">ID: {selectedEmergency.id.slice(0, 8)}...</span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-1 italic">"{selectedEmergency.description}"</p>
                </div>
              </div>

              {/* Media attachments */}
              {(selectedEmergency.video_url || selectedEmergency.audio_url) && (
                <div className="flex items-center gap-2 mt-2 ml-10">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Citizen Media:</span>
                  {selectedEmergency.video_url && (
                    <a
                      href={selectedEmergency.video_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] bg-purple-500/20 hover:bg-purple-500/35 text-purple-300 px-2 py-0.5 rounded border border-purple-500/30 transition-all font-semibold"
                    >
                      <Video className="w-3.5 h-3.5" /> Video
                    </a>
                  )}
                  {selectedEmergency.audio_url && (
                    <a
                      href={selectedEmergency.audio_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[10px] bg-teal-500/20 hover:bg-teal-500/35 text-teal-300 px-2 py-0.5 rounded border border-teal-500/30 transition-all font-semibold"
                    >
                      <Mic className="w-3.5 h-3.5" /> Audio
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-1">
            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <Navigation className="w-3.5 h-3.5 text-brand-green" />
              <span>Assigned: <strong className="text-slate-100 font-semibold">{assignedAmbulance ? assignedAmbulance.name : 'None'}</strong></span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <Compass className="w-3.5 h-3.5 text-brand-orange animate-spin" style={{ animationDuration: '6s' }} />
              <span>Distance: <strong className="text-slate-100 font-semibold">{distance ? `${distance.toFixed(2)} km` : 'N/A'}</strong></span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <Clock className="w-3.5 h-3.5 text-brand-blue" />
              <span>ETA: <strong className="text-slate-100 font-semibold">{calculateETA()}</strong></span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-brand-red" />
              <span>Status: <strong className={`font-semibold ${selectedEmergency.status === 'Assigned' ? 'text-brand-green' : 'text-brand-blue'}`}>{selectedEmergency.status}</strong></span>
            </div>
          </div>
        </div>

        {/* Action Controls & Manual Override */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto border-t md:border-t-0 border-dark-border/40 pt-3 md:pt-0">
          
          {/* History Logger */}
          <button
            onClick={() => setHistoryOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 border border-dark-border hover:bg-dark-hover text-slate-300 hover:text-slate-100 text-xs font-bold rounded-lg transition-colors select-none"
          >
            <History className="w-4 h-4" /> Logs
          </button>

          {selectedEmergency.status !== 'Resolved' && (
            <>
              {/* Manual Override Form */}
              <form onSubmit={handleManualReassign} className="flex items-center gap-2">
                <select
                  value={selectedAmbId}
                  onChange={(e) => setSelectedAmbId(e.target.value)}
                  className="bg-slate-900 border border-dark-border rounded-lg text-xs py-2 px-3 focus:outline-none focus:border-brand-blue text-slate-300"
                >
                  <option value="">Manual Reassign...</option>
                  {availableAmbulances.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({a.vehicle_number})</option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={!selectedAmbId}
                  className="flex items-center gap-1 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-800 disabled:text-slate-600 text-slate-100 text-xs font-bold rounded-lg transition-colors"
                >
                  <UserCheck className="w-4 h-4" /> Reassign
                </button>
              </form>

              {/* Cancel Assignment */}
              {assignedAmbulance && (
                <button
                  onClick={() => onCancel(selectedEmergency.id)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-red-600/20 border border-red-500/30 hover:bg-red-600 text-brand-red hover:text-slate-100 text-xs font-bold rounded-lg transition-colors"
                >
                  <Ban className="w-4 h-4" /> Cancel
                </button>
              )}
            </>
          )}

          <button
            onClick={onClose}
            className="p-2 hover:bg-dark-hover rounded-lg text-slate-500 hover:text-slate-300 transition-colors ml-auto md:ml-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {historyOpen && renderHistoryModal()}
    </>
  );
};

export default DispatchPanel;
