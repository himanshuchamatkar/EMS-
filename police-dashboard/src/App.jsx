import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { 
  Shield, 
  Radio, 
  MapPin, 
  Clock, 
  ShieldAlert, 
  HeartHandshake, 
  FileText, 
  ExternalLink, 
  Terminal, 
  Plus, 
  Camera, 
  Video, 
  Mic 
} from 'lucide-react';
import './App.css';

const SOCKET_URL = 'https://smart-ambulance-api-5ui6.onrender.com';

export default function App() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [emergencies, setEmergencies] = useState([]);
  const [ambulances, setAmbulances] = useState([]);
  const [selectedEmergencyId, setSelectedEmergencyId] = useState(null);
  const [logs, setLogs] = useState({}); // Logs categorized by emergency ID: { [emergencyId]: [ { time, text, type } ] }
  const [sysTime, setSysTime] = useState(new Date().toLocaleTimeString());
  const [timeFilter, setTimeFilter] = useState('unresolved');
  const [modalImageSrc, setModalImageSrc] = useState(null);

  // Ref to help retrieve correct states inside event callbacks
  const emergenciesRef = useRef([]);
  useEffect(() => {
    emergenciesRef.current = emergencies;
  }, [emergencies]);

  // Keep system clock ticking
  useEffect(() => {
    const timer = setInterval(() => {
      setSysTime(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Web Audio Synthesizer sound warning chime for new incidents
  const playCyberChime = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      
      // Note 1
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      gain1.gain.setValueAtTime(0.04, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.15);

      // Note 2 (slightly delayed)
      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880.00, ctx.currentTime); // A5
        gain2.gain.setValueAtTime(0.05, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.25);
      }, 100);
    } catch (e) {
      console.warn('Audio Context failed to start (browser autoplay block):', e);
    }
  };

  // Helper to add a log entry for a specific emergency
  const addIncidentLog = (emergencyId, text, type = 'system') => {
    const newLog = {
      time: new Date().toLocaleTimeString(),
      text,
      type
    };
    setLogs((prev) => {
      const incidentLogs = prev[emergencyId] || [];
      return {
        ...prev,
        [emergencyId]: [...incidentLogs, newLog]
      };
    });
  };

  // Setup Socket listeners
  useEffect(() => {
    const socketInstance = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });

    socketInstance.on('connect', () => {
      setConnected(true);
      console.log('Connected to Dispatch Sockets');
    });

    socketInstance.on('disconnect', () => {
      setConnected(false);
      console.log('Disconnected from Dispatch Sockets');
    });

    // Bulk lists load
    socketInstance.on('emergencies:list', (list) => {
      setEmergencies(list);
      // Pre-seed logs for any loaded emergencies if not present
      setLogs((prev) => {
        const nextLogs = { ...prev };
        list.forEach((e) => {
          if (!nextLogs[e.id]) {
            const timeFormatted = e.created_at ? new Date(e.created_at).toLocaleTimeString() : new Date().toLocaleTimeString();
            nextLogs[e.id] = [{
              time: timeFormatted,
              text: `🚨 INCIDENT INITIATED: Proximity calculations established. Status: ${e.status}`,
              type: 'system'
            }];
            if (e.assigned_ambulance) {
              nextLogs[e.id].push({
                time: timeFormatted,
                text: `🚑 DISPATCH SUCCESS: Assigned to Ambulance ID ${e.assigned_ambulance}`,
                type: 'assignment'
              });
            }
            if (e.status === 'VICTIM_PICKED') {
              nextLogs[e.id].push({
                time: e.picked_up_at ? new Date(e.picked_up_at).toLocaleTimeString() : timeFormatted,
                text: `📦 VICTIM SECURED: Patient is on-board the ambulance.`,
                type: 'pickup'
              });
            }
            if (e.status === 'Resolved') {
              nextLogs[e.id].push({
                time: e.dropped_at ? new Date(e.dropped_at).toLocaleTimeString() : timeFormatted,
                text: `✅ INCIDENT RESOLVED: Patient safely delivered to assigned hospital.`,
                type: 'resolved'
              });
            }
          }
        });
        return nextLogs;
      });
    });

    socketInstance.on('ambulances:list', (list) => {
      setAmbulances(list);
    });

    // Real-time emergency creation handler
    socketInstance.on('emergency:created', (newEmergency) => {
      setEmergencies((prev) => {
        if (prev.some(e => e.id === newEmergency.id)) return prev;
        return [newEmergency, ...prev]; // Show newest on top
      });

      setSelectedEmergencyId(prev => prev || newEmergency.id); // Auto-focus if none selected
      playCyberChime();

      // Seed initial creation log
      setLogs((prev) => ({
        ...prev,
        [newEmergency.id]: [{
          time: new Date().toLocaleTimeString(),
          text: `🚨 INCIDENT TRIGGERED: Proximity calculations established. Priority: ${newEmergency.priority.toUpperCase()}`,
          type: 'system'
        }]
      }));
    });

    // Real-time emergency update handler
    socketInstance.on('emergency:updated', (updatedEmergency) => {
      setEmergencies((prev) =>
        prev.map((emp) => (emp.id === updatedEmergency.id ? { ...emp, ...updatedEmergency } : emp))
      );
    });

    socketInstance.on('emergency:deleted', ({ id }) => {
      setEmergencies((prev) => prev.filter((emp) => emp.id !== id));
      setSelectedEmergencyId((prev) => (prev === id ? null : prev));
    });

    socketInstance.on('emergency:clearedAll', () => {
      setEmergencies([]);
      setSelectedEmergencyId(null);
      setLogs({});
    });

    // Real-time Dispatch assigned handler
    socketInstance.on('dispatch:assigned', ({ emergency, ambulance }) => {
      addIncidentLog(
        emergency.id,
        `🚑 DISPATCH ASSIGNED: Ambulance "${ambulance.name}" (${ambulance.vehicle_number}) accepted the offer and is en route.`,
        'assignment'
      );
    });

    // Real-time Pickup handler
    socketInstance.on('dispatch:victimPickedUp', ({ emergency_id, ambulance_id, picked_up_at }) => {
      const ambName = ambulances.find(a => a.id === ambulance_id)?.name || 'Ambulance';
      addIncidentLog(
        emergency_id,
        `📦 VICTIM PICKUP RECORDED: ${ambName} has secured the patient and is routing to the hospital.`,
        'pickup'
      );
    });

    // Real-time Resolved handler
    socketInstance.on('dispatch:resolved', ({ emergency_id, ambulance_id }) => {
      const ambName = ambulances.find(a => a.id === ambulance_id)?.name || 'Ambulance';
      addIncidentLog(
        emergency_id,
        `✅ HOSPITAL DELIVERY SUCCESS: Patient delivered by ${ambName}. Incident marked RESOLVED.`,
        'resolved'
      );
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [ambulances]);

  // Filter logic
  const filteredEmergencies = emergencies.filter(e => {
    if (!e.created_at) return true;
    const incidentDate = new Date(e.created_at);
    const now = new Date();
    const diffMs = now - incidentDate;
    
    switch (timeFilter) {
      case 'unresolved':
        return e.status !== 'Resolved';
      case 'today':
        return incidentDate.toDateString() === now.toDateString();
      case 'week':
        return diffMs <= 7 * 24 * 60 * 60 * 1000;
      case 'month':
        return diffMs <= 30 * 24 * 60 * 60 * 1000;
      case 'year':
        return diffMs <= 365 * 24 * 60 * 60 * 1000;
      case 'all':
      default:
        return true;
    }
  });

  // Auto select first filtered incident on filter change or startup
  useEffect(() => {
    if (filteredEmergencies.length > 0) {
      if (!selectedEmergencyId || !filteredEmergencies.some(e => e.id === selectedEmergencyId)) {
        setSelectedEmergencyId(filteredEmergencies[0].id);
      }
    } else {
      setSelectedEmergencyId(null);
    }
  }, [timeFilter, emergencies]);

  // Resolve current active incident details
  const activeIncident = emergencies.find((e) => e.id === selectedEmergencyId) || null;
  const activeIncidentLogs = activeIncident ? logs[activeIncident.id] || [] : [];
  
  // Find assigned ambulance details
  const assignedAmbulance = activeIncident
    ? ambulances.find((a) => a.id === activeIncident.assigned_ambulance)
    : null;

  return (
    <div className="app-wrapper">
      
      {/* Top Header Panel */}
      <header className="terminal-header">
        <div className="terminal-title-container">
          <div className="terminal-blink-dot" />
          <div className="terminal-title">
            <h1>Police Command Center</h1>
            <div className="terminal-subtitle">POLICE INCIDENT WORKSTATION v2.4</div>
          </div>
        </div>

        <div className="terminal-status-bar">
          <span className="system-stats">SYS_TIME: {sysTime}</span>
          <span className="system-stats">ACTIVE_ALERTS: {emergencies.filter(e => e.status !== 'Resolved').length}</span>
          <div className={`status-badge ${connected ? 'connected' : 'disconnected'}`}>
            <Radio size={14} className={connected ? 'animate-pulse' : ''} />
            <span>{connected ? 'LIVE COMMS ACTIVE' : 'OFFLINE'}</span>
          </div>
        </div>
      </header>

      {/* Main Grid Frame */}
      <div className="dashboard-grid">
        
        {/* Left Tabs Sidebar */}
        <aside className="incident-tabs-container">
          <div className="sidebar-label">Incident Terminals</div>
          <div className="filter-container">
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="terminal-select"
            >
              <option value="unresolved">Unresolved Incidents</option>
              <option value="today">Today's Incidents</option>
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="year">Last Year</option>
              <option value="all">All Incidents</option>
            </select>
          </div>
          <div className="tabs-list">
            {filteredEmergencies.length === 0 ? (
              <div className="no-incidents-msg">No matching incidents.</div>
            ) : (
              filteredEmergencies.map((e) => {
                const isActive = e.id === selectedEmergencyId;
                const dateObj = new Date(e.created_at || Date.now());
                const formattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                
                return (
                  <div
                    key={e.id}
                    className={`incident-tab ${isActive ? 'active' : ''}`}
                    onClick={() => setSelectedEmergencyId(e.id)}
                  >
                    <div className="incident-tab-header">
                      <span className="incident-tab-id">TICKET-{e.id.slice(0, 5).toUpperCase()}</span>
                      <span className={`incident-tab-priority priority-${e.priority.toLowerCase()}`}>
                        {e.priority}
                      </span>
                    </div>
                    <div className="incident-tab-desc">{e.description}</div>
                    <div className="incident-tab-footer">
                      <span className="tab-time">{formattedTime}</span>
                      <span className="tab-status" style={{ color: e.status === 'Resolved' ? 'var(--accent-green)' : 'var(--accent-orange)' }}>
                        {e.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Main Details Area */}
        <main className="console-workspace">
          {!activeIncident ? (
            <div className="console-workspace-empty">
              <ShieldAlert size={48} className="empty-icon" />
              <div>
                <h3>CONSOLE SYSTEM IDLE</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                  Select an active incident ticket terminal on the left to monitor real-time responder activity, citizen media, and tracking status.
                </p>
              </div>
            </div>
          ) : (
            <div className="console-body">
              
              {/* Proximity & Stage Progress Flow */}
              <div className="section-card">
                <div className="section-title-bar">
                  <span>Responder Progress Timeline</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
                    TICKET_UUID: {activeIncident.id}
                  </span>
                </div>
                
                <div className="stages-flow">
                  {/* Step 1: Reported */}
                  <div className="stage-step completed">
                    <div className="stage-indicator">1</div>
                    <span className="stage-label">Reported</span>
                    <span className="stage-time">
                      {activeIncident.created_at ? new Date(activeIncident.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>

                  <div className={`stage-connector ${activeIncident.assigned_ambulance ? 'active' : ''}`} />

                  {/* Step 2: Dispatched */}
                  <div className={`stage-step ${activeIncident.assigned_ambulance ? (activeIncident.status === 'Assigned' ? 'active' : 'completed') : ''}`}>
                    <div className="stage-indicator">2</div>
                    <span className="stage-label">Dispatched</span>
                    {assignedAmbulance && (
                      <span className="stage-time" style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--accent-teal)' }}>
                        {assignedAmbulance.name}
                      </span>
                    )}
                  </div>

                  <div className={`stage-connector ${activeIncident.assigned_hospital ? 'active' : ''}`} />

                  {/* Step 3: Hospital Confirmed */}
                  <div className={`stage-step ${activeIncident.assigned_hospital ? ((activeIncident.status === 'Assigned' || activeIncident.status === 'VICTIM_PICKED') && activeIncident.assigned_hospital ? 'completed' : '') : ''}`}>
                    <div className="stage-indicator">3</div>
                    <span className="stage-label">Hospital</span>
                    {activeIncident.assigned_hospital && (
                      <span className="stage-time" style={{ fontSize: '10px', fontWeight: 'bold', color: 'var(--accent-green)' }}>
                        {activeIncident.assigned_hospital.hospital_name}
                      </span>
                    )}
                  </div>

                  <div className={`stage-connector ${activeIncident.status === 'VICTIM_PICKED' || activeIncident.status === 'Resolved' ? 'active' : ''}`} />

                  {/* Step 4: Picked Up */}
                  <div className={`stage-step ${activeIncident.status === 'VICTIM_PICKED' ? 'active' : activeIncident.status === 'Resolved' ? 'completed' : ''}`}>
                    <div className="stage-indicator">4</div>
                    <span className="stage-label">Picked Up</span>
                    {activeIncident.picked_up_at && (
                      <span className="stage-time">
                        {new Date(activeIncident.picked_up_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>

                  <div className={`stage-connector ${activeIncident.status === 'Resolved' ? 'active' : ''}`} />

                  {/* Step 5: Delivered */}
                  <div className={`stage-step ${activeIncident.status === 'Resolved' ? 'completed' : ''}`}>
                    <div className="stage-indicator">5</div>
                    <span className="stage-label">Delivered</span>
                    {activeIncident.dropped_at && (
                      <span className="stage-time">
                        {new Date(activeIncident.dropped_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Incident Specifications */}
              <div className="section-card">
                <div className="section-title-bar">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <FileText size={14} />
                    <span>Incident Specifications</span>
                  </div>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', padding: '0.1rem 0.4rem', background: '#f1f5f9', border: '1px solid var(--border-color)', borderRadius: '3px' }}>
                    SOURCE: {activeIncident.report_source ? activeIncident.report_source.toUpperCase() : 'UNKNOWN'}
                  </span>
                </div>

                <div className="metadata-grid">
                  <div className="meta-item">
                    <span className="meta-label">Incident Description</span>
                    <span className="meta-value" style={{ fontWeight: '500' }}>{activeIncident.description}</span>
                  </div>

                  <div className="meta-item">
                    <span className="meta-label">GPS Coordinate Position</span>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${activeIncident.latitude},${activeIncident.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="meta-value mono link-action"
                      title="Open in Google Maps"
                    >
                      {activeIncident.latitude.toFixed(6)}, {activeIncident.longitude.toFixed(6)}
                      <ExternalLink size={12} className="inline-icon" />
                    </a>
                  </div>

                  <div className="meta-item">
                    <span className="meta-label">Ambulance Details</span>
                    <span className="meta-value">
                      {assignedAmbulance ? (
                        <span style={{ color: 'var(--accent-teal)' }}>
                          {assignedAmbulance.name} [{assignedAmbulance.vehicle_number}]
                        </span>
                      ) : (
                        <span style={{ color: 'var(--accent-orange)' }}>Searching available dispatchers...</span>
                      )}
                    </span>
                  </div>

                  <div className="meta-item">
                    <span className="meta-label">Allotted Hospital</span>
                    <span className="meta-value">
                      {activeIncident.assigned_hospital ? (
                        <span style={{ color: 'var(--accent-green)' }}>
                          {activeIncident.assigned_hospital.hospital_name}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>Awaiting hospital acceptances...</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Citizen Media Attachments */}
                {(activeIncident.photo_url || activeIncident.video_url || activeIncident.audio_url) && (
                  <div className="attachments-grid" style={{ borderTop: '1px solid var(--border-color)' }}>
                    {activeIncident.photo_url && (
                      <div className="media-card">
                        <span className="meta-label" style={{ fontSize: '9px', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <Camera size={10} /> Photo (Click to zoom)
                        </span>
                        <img 
                          src={activeIncident.photo_url} 
                          className="attachment-img" 
                          alt="Incident Capture" 
                          onClick={() => setModalImageSrc(activeIncident.photo_url)}
                          title="Click to view full image"
                        />
                        <button 
                          onClick={() => setModalImageSrc(activeIncident.photo_url)} 
                          className="media-btn"
                          style={{ width: '100%' }}
                        >
                          Zoom Image
                        </button>
                      </div>
                    )}

                    {activeIncident.video_url && (
                      <div className="media-card">
                        <span className="meta-label" style={{ fontSize: '9px', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <Video size={10} /> Video Statement
                        </span>
                        <div className="media-fallback">
                          <Video size={18} style={{ color: 'var(--text-muted)' }} />
                        </div>
                        <a href={activeIncident.video_url} target="_blank" rel="noreferrer" className="media-btn">Play Video</a>
                      </div>
                    )}

                    {activeIncident.audio_url && (
                      <div className="media-card">
                        <span className="meta-label" style={{ fontSize: '9px', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                          <Mic size={10} /> Audio Statement
                        </span>
                        <div className="media-fallback">
                          <Mic size={18} style={{ color: 'var(--text-muted)' }} />
                        </div>
                        <a href={activeIncident.audio_url} target="_blank" rel="noreferrer" className="media-btn">Play Audio</a>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Real-time Logger Console Terminal */}
              <div className="section-card">
                <div className="section-title-bar">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Terminal size={14} />
                    <span>Real-time Activity Log Terminal</span>
                  </div>
                </div>

                <div className="console-log-box">
                  {activeIncidentLogs.length === 0 ? (
                    <div className="log-entry system">&gt; Awaiting dispatch signals...</div>
                  ) : (
                    activeIncidentLogs.map((log, idx) => (
                      <div key={idx} className={`log-entry ${log.type}`}>
                        <span style={{ color: '#64748b' }}>[{log.time}]</span> &gt; {log.text}
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}
        </main>

      </div>

      {/* Full screen image view modal */}
      {modalImageSrc && (
        <div className="fullscreen-image-overlay" onClick={() => setModalImageSrc(null)}>
          <div className="fullscreen-modal-card" onClick={(e) => e.stopPropagation()}>
            <img src={modalImageSrc} className="fullscreen-img" alt="Citizen Attachment" />
            <button className="media-btn" style={{ padding: '0.4rem 1.5rem', width: '100%', marginTop: '0.5rem' }} onClick={() => setModalImageSrc(null)}>
              Close Terminal Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
