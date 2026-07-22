import React, { useState, useEffect } from 'react';
import { ShieldAlert, MapPin, Navigation, Clock, Ban, UserCheck, History, X, Compass, Image, Video, Mic, Trash2 } from 'lucide-react';
import { api } from '../services/api';

const DispatchPanel = ({
  selectedEmergency,
  ambulances,
  onReassign,
  onCancel,
  onDeleteEmergency,
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

  const handleDeleteLog = async (logId) => {
    if (!window.confirm('Delete this dispatch history log record?')) return;
    try {
      await api.deleteDispatchLog(logId);
      setLogs(prev => prev.filter(l => l.id !== logId));
    } catch (err) {
      alert(`Failed to delete history log: ${err.message}`);
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
                    <th className="p-3 text-right">Actions</th>
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
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          title="Delete History Log"
                          className="p-1 rounded hover:bg-dark-hover text-slate-400 hover:text-brand-red transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                  selectedEmergency.priority === 'Critical' ? 'bg-red-500/20 text-red-400 border-red-500/40' :
                  selectedEmergency.priority === 'High' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
                  selectedEmergency.priority === 'Medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' :
                  'bg-blue-500/20 text-blue-400 border-blue-500/40'
                }`}>
                  {selectedEmergency.priority} Priority
                </span>

                <span className="text-xs text-slate-400 font-mono">
                  ID: {selectedEmergency.id.slice(0, 8)}
                </span>
                
                {selectedEmergency.report_source === 'citizen' && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-purple-500/20 text-purple-300 border-purple-500/40 uppercase">
                    📱 Citizen Report
                  </span>
                )}
              </div>

              <h4 className="text-sm font-semibold text-slate-100 mt-1">
                {selectedEmergency.description}
              </h4>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400 flex-wrap">
            <div className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-brand-red" />
              <span>{selectedEmergency.latitude.toFixed(4)}, {selectedEmergency.longitude.toFixed(4)}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Reported: {new Date(selectedEmergency.created_at || Date.now()).toLocaleTimeString()}</span>
            </div>

            {assignedAmbulance ? (
              <div className="flex items-center gap-1 text-emerald-400 font-medium">
                <Navigation className="w-3.5 h-3.5" />
                <span>Assigned: {assignedAmbulance.name} ({assignedAmbulance.vehicle_number})</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-amber-400 font-medium">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Unassigned (Searching...)</span>
              </div>
            )}
          </div>

          {/* Media Attachments Section */}
          {(selectedEmergency.photo_url || selectedEmergency.video_url || selectedEmergency.audio_url) && (
            <div className="flex items-center gap-3 pt-1 border-t border-dark-border/40 text-xs">
              <span className="text-[11px] font-medium text-slate-400">Media:</span>
              {selectedEmergency.photo_url && (
                <a
                  href={selectedEmergency.photo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-brand-blue hover:underline font-medium"
                >
                  <Image className="w-3 h-3" /> View Photo
                </a>
              )}
              {selectedEmergency.video_url && (
                <a
                  href={selectedEmergency.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-purple-400 hover:underline font-medium"
                >
                  <Video className="w-3 h-3" /> Play Video
                </a>
              )}
              {selectedEmergency.audio_url && (
                <a
                  href={selectedEmergency.audio_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-teal-400 hover:underline font-medium"
                >
                  <Mic className="w-3 h-3" /> Listen Audio
                </a>
              )}
            </div>
          )}

          {/* Incident Lifecycle Progress Timeline */}
          <div className="mt-3 pt-3 border-t border-dark-border/30 flex items-center justify-between gap-4 overflow-x-auto text-[11px] md:text-xs select-none">
            {/* Step 1: Reported */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/60 flex items-center justify-center text-emerald-400 font-bold">
                ✓
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-slate-200">Incident Reported</span>
                <span className="text-[10px] text-slate-500">
                  {selectedEmergency.created_at ? new Date(selectedEmergency.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Reported'}
                </span>
              </div>
            </div>

            <div className="h-px bg-dark-border flex-1 min-w-[15px]" />

            {/* Step 2: Ambulance Assigned */}
            <div className="flex items-center gap-2 shrink-0">
              {assignedAmbulance ? (
                <>
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/60 flex items-center justify-center text-emerald-400 font-bold">
                    ✓
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-200">Ambulance Dispatched</span>
                    <span className="text-[10px] text-brand-blue font-semibold" title={assignedAmbulance.vehicle_number}>
                      {assignedAmbulance.name}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-5 h-5 rounded-full bg-slate-900 border border-dark-border flex items-center justify-center text-slate-500 font-bold">
                    2
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-500">Ambulance Dispatch</span>
                    <span className="text-[10px] text-amber-500 animate-pulse font-medium">Searching...</span>
                  </div>
                </>
              )}
            </div>

            <div className="h-px bg-dark-border flex-1 min-w-[15px]" />

            {/* Step 3: Hospital Allotted */}
            <div className="flex items-center gap-2 shrink-0">
              {selectedEmergency.assigned_hospital ? (
                <>
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/60 flex items-center justify-center text-emerald-400 font-bold">
                    ✓
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-200">Hospital Confirmed</span>
                    <span className="text-[10px] text-brand-green font-semibold" title={selectedEmergency.assigned_hospital.address}>
                      {selectedEmergency.assigned_hospital.hospital_name}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-5 h-5 rounded-full bg-slate-900 border border-dark-border flex items-center justify-center text-slate-500 font-bold">
                    3
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-500">Hospital Allotment</span>
                    <span className="text-[10px] text-slate-600 font-medium">Waiting...</span>
                  </div>
                </>
              )}
            </div>

            <div className="h-px bg-dark-border flex-1 min-w-[15px]" />

            {/* Step 4: Patient Picked Up */}
            <div className="flex items-center gap-2 shrink-0">
              {selectedEmergency.picked_up_at || selectedEmergency.status === 'VICTIM_PICKED' || selectedEmergency.status === 'Resolved' ? (
                <>
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/60 flex items-center justify-center text-emerald-400 font-bold">
                    ✓
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-200">Patient Picked Up</span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {selectedEmergency.picked_up_at ? new Date(selectedEmergency.picked_up_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Picked up'}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-5 h-5 rounded-full bg-slate-900 border border-dark-border flex items-center justify-center text-slate-500 font-bold">
                    4
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-500">Patient Pick Up</span>
                    <span className="text-[10px] text-slate-600 font-medium">En Route...</span>
                  </div>
                </>
              )}
            </div>

            <div className="h-px bg-dark-border flex-1 min-w-[15px]" />

            {/* Step 5: Dropped Off (Resolved) */}
            <div className="flex items-center gap-2 shrink-0">
              {selectedEmergency.dropped_at || selectedEmergency.status === 'Resolved' ? (
                <>
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/60 flex items-center justify-center text-emerald-400 font-bold">
                    ✓
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-200">Delivered</span>
                    <span className="text-[10px] text-emerald-400 font-bold">
                      {selectedEmergency.dropped_at ? new Date(selectedEmergency.dropped_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Resolved'}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-5 h-5 rounded-full bg-slate-900 border border-dark-border flex items-center justify-center text-slate-500 font-bold">
                    5
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-500">Hospital Delivery</span>
                    <span className="text-[10px] text-slate-600 font-medium">Transporting...</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
          
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
                  className="flex items-center gap-1.5 px-3 py-2 bg-amber-600/20 border border-amber-500/30 hover:bg-amber-600 text-amber-400 hover:text-slate-100 text-xs font-bold rounded-lg transition-colors"
                >
                  <Ban className="w-4 h-4" /> Cancel Assignment
                </button>
              )}
            </>
          )}

          {onDeleteEmergency && (
            <button
              onClick={() => onDeleteEmergency(selectedEmergency.id)}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-600/20 border border-red-500/30 hover:bg-red-600 text-brand-red hover:text-slate-100 text-xs font-bold rounded-lg transition-colors"
              title="Delete Incident"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
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
