import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import io from 'socket.io-client';
import { 
  Heart, ShieldAlert, Navigation, Settings, MapPin, 
  Phone, Mail, Lock, User, FileText, Plus, Check, Trash2, 
  AlertTriangle, LogOut, CheckCircle2, XCircle, Clock, Info, ShieldCheck, Activity
} from 'lucide-react';

import 'leaflet/dist/leaflet.css';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix leaflet marker icon display issues
let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom Glowing Icon for incidents
const getIncidentIcon = () => {
  return L.divIcon({
    className: 'marker-container marker-emergency',
    html: `
      <div class="marker-pulse" style="background: rgba(239, 68, 68, 0.4)"></div>
      <div class="marker-dot" style="background: #ef4444"></div>
      <div style="position: absolute; font-size: 11px; transform: translateY(-1px);">🚨</div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
};

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

// Play alarm sound using Web Audio API
const playAlarmSound = () => {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const playTone = (freq, type, duration, startTime) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);
      gain.gain.setValueAtTime(0.1, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = audioCtx.currentTime;
    playTone(880, 'sine', 0.15, now);
    playTone(987, 'sine', 0.15, now + 0.15);
    playTone(880, 'sine', 0.15, now + 0.3);
    playTone(987, 'sine', 0.15, now + 0.45);
  } catch (e) {
    console.warn('Audio Context play failed:', e);
  }
};

// Map click and view handler for location picking
function MapEventsHandler({ onLocationSelected }) {
  useMapEvents({
    click(e) {
      onLocationSelected(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Controller to focus map on specific coordinates
function MapController({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.setView(coords, 15, { animate: true, duration: 1 });
    }
  }, [coords, map]);
  return null;
}

export default function App() {
  const [authToken, setAuthToken] = useState(localStorage.getItem('hospital_token') || '');
  const [hospital, setHospital] = useState(JSON.parse(localStorage.getItem('hospital_data') || 'null'));
  const [activeTab, setActiveTab] = useState('status'); // 'status', 'profile', 'history'
  
  // Auth Form states
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState(28.6139);
  const [lng, setLng] = useState(77.2090);
  const [hospitalType, setHospitalType] = useState('General');
  const [regNumber, setRegNumber] = useState('');
  const [authError, setAuthError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Profile setup states
  const [icuBeds, setIcuBeds] = useState(0);
  const [ventilators, setVentilators] = useState(0);
  const [totalBeds, setTotalBeds] = useState(0);
  const [emergencyBeds, setEmergencyBeds] = useState(0);
  const [facilities, setFacilities] = useState({
    ct_available: false,
    mri_available: false,
    xray_available: false,
    blood_bank: false,
    ot_available: false,
    emergency_dept_available: true,
    emergency_24x7: true,
    trauma_facility: false,
  });
  const [specialists, setSpecialists] = useState([]);
  const [specialistInput, setSpecialistInput] = useState('');

  // Incident Alerts & History state
  const [requests, setRequests] = useState([]);
  const [incomingAlert, setIncomingAlert] = useState(null);
  
  const socketRef = useRef(null);

  // Load profile details from API once authenticated
  useEffect(() => {
    if (authToken && hospital) {
      fetchProfile();
      fetchRequests();
      setupSocket();
    }
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [authToken]);

  // Setup WebSocket connections
  const setupSocket = () => {
    if (socketRef.current) socketRef.current.disconnect();
    
    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to socket, registering hospital:', hospital.hospital_id);
      socket.emit('hospital:register', { hospital_id: hospital.hospital_id });
    });

    // Alert for incoming emergencies matching this hospital
    socket.on('emergency:hospital_request', (data) => {
      console.log('Incoming emergency hospital request:', data);
      setIncomingAlert(data);
      playAlarmSound();
      fetchRequests(); // Refresh request logs
    });

    // Handle updates when a request has been accepted elsewhere
    socket.on('emergency:updated', (updatedEmergency) => {
      setRequests(prev => prev.map(r => {
        if (r.emergency.id === updatedEmergency.id) {
          return {
            ...r,
            emergency: updatedEmergency,
            status: updatedEmergency.assigned_hospital_id === hospital.hospital_id ? 'Accepted' : 'Rejected'
          };
        }
        return r;
      }));
      
      setIncomingAlert(prev => {
        if (prev && prev.emergency.id === updatedEmergency.id) {
          if (updatedEmergency.assigned_hospital_id && updatedEmergency.assigned_hospital_id !== hospital.hospital_id) {
            return null; // Close alert if someone else accepted
          }
        }
        return prev;
      });
    });
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${BASE_URL}/hospitals/profile`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHospital(data);
        localStorage.setItem('hospital_data', JSON.stringify(data));
        
        // Seed facility states
        if (data.facilities) {
          setIcuBeds(data.facilities.icu_count || 0);
          setVentilators(data.facilities.ventilator_count || 0);
          setTotalBeds(data.facilities.total_beds || 0);
          setEmergencyBeds(data.facilities.emergency_beds || 0);
          setFacilities({
            ct_available: data.facilities.ct_available || false,
            mri_available: data.facilities.mri_available || false,
            xray_available: data.facilities.xray_available || false,
            blood_bank: data.facilities.blood_bank || false,
            ot_available: data.facilities.ot_available || false,
            emergency_dept_available: data.facilities.emergency_dept_available ?? true,
            emergency_24x7: data.facilities.emergency_24x7 ?? true,
            trauma_facility: data.facilities.trauma_facility || false,
          });
          setSpecialists(data.facilities.specialists || []);
        }
      }
    } catch (e) {
      console.error('Fetch profile error:', e);
    }
  };

  const fetchRequests = async () => {
    try {
      const res = await fetch(`${BASE_URL}/hospitals/emergencies`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        // Sort newest first
        setRequests(data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
        
        // Find if there is any unresolved/pending request to show as an active alert popup
        const activePending = data.find(r => r.status === 'Pending');
        if (activePending) {
          // Find distance if not saved
          const originLat = hospital?.latitude || 28.6139;
          const originLng = hospital?.longitude || 77.2090;
          const distance = calculateDistanceKm(
            originLat,
            originLng,
            activePending.emergency.latitude,
            activePending.emergency.longitude
          );
          setIncomingAlert({
            request_id: activePending.request_id,
            emergency: activePending.emergency,
            distance: Number(distance.toFixed(2))
          });
        }
      }
    } catch (e) {
      console.error('Fetch requests error:', e);
    }
  };

  // Standard Haversine distance calculator for frontend view helpers
  const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Handle Geocoding Search using OpenStreetMap Nominatim
  const handleMapSearch = async (e) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          const first = data[0];
          const newLat = Number(first.lat);
          const newLng = Number(first.lon);
          setLat(newLat);
          setLng(newLng);
          setAddress(first.display_name);
        } else {
          alert('Location not found. Try searching another address.');
        }
      }
    } catch (err) {
      console.error('Geocoding search failed:', err);
    } finally {
      setLoading(false);
    }
  };

  // Reverse geocoding on manual map click
  const handleMapClick = async (clickedLat, clickedLng) => {
    setLat(clickedLat);
    setLng(clickedLng);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${clickedLat}&lon=${clickedLng}`);
      if (res.ok) {
        const data = await res.json();
        if (data.display_name) {
          setAddress(data.display_name);
        }
      }
    } catch (err) {
      console.error('Reverse geocoding failed:', err);
    }
  };

  // Perform Registration
  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError(null);
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/hospitals/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hospital_name: hospitalName,
          email,
          password,
          phone,
          address,
          latitude: lat,
          longitude: lng,
          hospital_type: hospitalType,
          registration_number: regNumber
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      
      // Switch to Login after successful registration
      setIsRegisterMode(false);
      setPassword('');
      alert('Registration successful! Please login to complete your hospital profile.');
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Perform Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError(null);
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/hospitals/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');

      setAuthToken(data.token);
      setHospital(data.hospital);
      localStorage.setItem('hospital_token', data.token);
      localStorage.setItem('hospital_data', JSON.stringify(data.hospital));
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update OPEN/CLOSED status
  const handleStatusToggle = async () => {
    const nextStatus = hospital?.emergency_status === 'OPEN' ? 'CLOSED' : 'OPEN';
    try {
      const res = await fetch(`${BASE_URL}/hospitals/status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}` 
        },
        body: JSON.stringify({ emergency_status: nextStatus })
      });
      if (res.ok) {
        const data = await res.json();
        setHospital(data);
        localStorage.setItem('hospital_data', JSON.stringify(data));
      }
    } catch (err) {
      console.error('Toggle status error:', err);
    }
  };

  // Update Profile capabilities and doctors
  const handleProfileSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/hospitals/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          phone: hospital.phone,
          address: hospital.address,
          icu_count: icuBeds,
          ventilator_count: ventilators,
          total_beds: totalBeds,
          emergency_beds: emergencyBeds,
          ...facilities,
          specialists
        })
      });
      if (res.ok) {
        const data = await res.json();
        setHospital(data);
        localStorage.setItem('hospital_data', JSON.stringify(data));
        alert('Hospital profile and emergency capabilities updated successfully!');
      } else {
        const errData = await res.json();
        alert(errData.error || 'Could not update profile');
      }
    } catch (err) {
      console.error('Update profile error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle emergency response (ACCEPT/REJECT)
  const handleEmergencyResponse = async (accept) => {
    if (!incomingAlert) return;
    try {
      const endpoint = accept ? 'accept' : 'reject';
      const res = await fetch(`${BASE_URL}/hospitals/emergencies/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ incident_id: incomingAlert.emergency.id })
      });
      
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Operation failed');
        return;
      }
      
      setIncomingAlert(null);
      fetchRequests();
      
      if (accept) {
        alert('Incident Accepted! Dispatch dashboard and nearby ambulances have been routed to your hospital.');
      }
    } catch (err) {
      console.error('Emergency response error:', err);
    }
  };

  // Add specialist doctor
  const handleAddSpecialist = () => {
    if (specialistInput.trim() && !specialists.includes(specialistInput.trim())) {
      setSpecialists([...specialists, specialistInput.trim()]);
      setSpecialistInput('');
    }
  };

  // Remove specialist doctor
  const handleRemoveSpecialist = (spec) => {
    setSpecialists(specialists.filter(s => s !== spec));
  };

  // Perform Logout
  const handleLogout = () => {
    localStorage.removeItem('hospital_token');
    localStorage.removeItem('hospital_data');
    setAuthToken('');
    setHospital(null);
    setIncomingAlert(null);
  };

  // Render Authentication Pages (Login/Register)
  if (!authToken) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">🏥 Smart Hospital</div>
            <div className="auth-subtitle">
              {isRegisterMode 
                ? 'Register your hospital to sync with the smart dispatch network' 
                : 'Sign in to manage emergency beds, facilities, and live status'}
            </div>
          </div>

          {authError && (
            <div className="error-banner">
              <AlertTriangle size={18} />
              <span>{authError}</span>
            </div>
          )}

          {isRegisterMode ? (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="form-group">
                <label className="form-label">Hospital Name</label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={hospitalName} 
                    onChange={(e) => setHospitalName(e.target.value)} 
                    placeholder="City General Hospital"
                    required 
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Hospital Type</label>
                  <select 
                    className="form-select" 
                    value={hospitalType} 
                    onChange={(e) => setHospitalType(e.target.value)}
                  >
                    <option value="Government">Government</option>
                    <option value="Private">Private</option>
                    <option value="Multi-speciality">Multi-speciality</option>
                    <option value="Trauma Centre">Trauma Centre</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Reg. Number</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={regNumber} 
                    onChange={(e) => setRegNumber(e.target.value)} 
                    placeholder="H-90112"
                    required 
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input 
                    type="email" 
                    className="form-input" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    placeholder="admin@hospital.com"
                    required 
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input 
                    type="password" 
                    className="form-input" 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    placeholder="••••••••"
                    required 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Contact Number</label>
                <input 
                  type="tel" 
                  className="form-input" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  placeholder="+1 (555) 019-2834"
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Location Search (Map Placement)</label>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Type hospital address to search..."
                  />
                  <button type="button" className="btn btn-secondary" onClick={handleMapSearch}>Search</button>
                </div>
                <div className="map-selection-box dark-map">
                  <MapContainer center={[lat, lng]} zoom={13} style={{ height: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={[lat, lng]} />
                    <MapEventsHandler onLocationSelected={handleMapClick} />
                    <MapController coords={[lat, lng]} />
                  </MapContainer>
                  <div className="map-coords-badge">
                    {lat.toFixed(5)}, {lng.toFixed(5)}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Exact Street Address</label>
                <textarea 
                  className="form-input" 
                  rows="2" 
                  value={address} 
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Selected address will load here..." 
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? 'Registering...' : 'REGISTER HOSPITAL'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="form-group">
                <label className="form-label">Hospital Email</label>
                <input 
                  type="email" 
                  className="form-input" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="admin@hospital.com"
                  required 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input 
                  type="password" 
                  className="form-input" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="••••••••"
                  required 
                />
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? 'Logging in...' : 'LOGIN TO DASHBOARD'}
              </button>
            </form>
          )}

          <div className="auth-footer">
            {isRegisterMode ? 'Already registered?' : 'New hospital joining the network?'}
            <button 
              className="btn btn-link" 
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setAuthError(null);
              }}
            >
              {isRegisterMode ? 'Sign In' : 'Register Now'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Find routing coordinates if there's an active alert
  const getAcceptedIncidents = () => {
    return requests.filter(r => r.status === 'Accepted');
  };

  const currentActiveIncident = getAcceptedIncidents().length > 0 ? getAcceptedIncidents()[0].emergency : null;

  return (
    <div className="app-container">
      
      {/* Real-time Emergency Alert Popup Overlay */}
      {incomingAlert && (
        <div className="alert-overlay">
          <div className="alert-modal">
            <div className="alert-modal-header">
              <h3>
                <ShieldAlert className="alert-pulse-icon" style={{ color: '#fff' }} />
                NEW EMERGENCY PATIENT REQUEST
              </h3>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold' }}>
                PRIORITY: {incomingAlert.emergency.priority.toUpperCase()}
              </div>
            </div>
            
            <div className="alert-modal-body">
              <div className="emergency-detail-box">
                <div className="emergency-info-list">
                  <div className="emergency-info-item">
                    <span className="emergency-info-label">Description</span>
                    <span className="emergency-info-value" style={{ fontWeight: '600' }}>
                      {incomingAlert.emergency.description}
                    </span>
                  </div>
                  <div className="emergency-info-item">
                    <span className="emergency-info-label">Location (Coordinates)</span>
                    <span className="emergency-info-value">
                      {incomingAlert.emergency.latitude.toFixed(5)}, {incomingAlert.emergency.longitude.toFixed(5)}
                    </span>
                  </div>
                  <div className="emergency-info-item">
                    <span className="emergency-info-label">Distance from Hospital</span>
                    <span className="emergency-info-value" style={{ color: 'var(--color-blue)', fontWeight: 'bold' }}>
                      {incomingAlert.distance} km
                    </span>
                  </div>
                </div>

                <div className="emergency-media-preview">
                  <span className="emergency-info-label">Media Attachments</span>
                  {incomingAlert.emergency.photo_url ? (
                    <a href={incomingAlert.emergency.photo_url} target="_blank" rel="noreferrer">
                      <img src={incomingAlert.emergency.photo_url} className="emergency-photo" alt="Emergency" />
                    </a>
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px', textAlign: 'center', padding: '1.5rem 0' }}>
                      No Photo Attached
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem' }}>
                    {incomingAlert.emergency.video_url && (
                      <a href={incomingAlert.emergency.video_url} target="_blank" rel="noreferrer" className="media-badge">
                        🎥 Video Link
                      </a>
                    )}
                    {incomingAlert.emergency.audio_url && (
                      <a href={incomingAlert.emergency.audio_url} target="_blank" rel="noreferrer" className="media-badge">
                        🎙️ Audio Link
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="alert-actions">
                <button className="btn btn-accept btn" onClick={() => handleEmergencyResponse(true)}>
                  <CheckCircle2 size={18} />
                  ACCEPT PATIENT
                </button>
                <button className="btn btn-reject btn" onClick={() => handleEmergencyResponse(false)}>
                  <XCircle size={18} />
                  REJECT REQUEST
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Dashboard Screen View */}
      <div className="dashboard-wrapper">
        
        {/* Sidebar */}
        <div className="sidebar">
          <div className="sidebar-header">
            <Heart color="var(--color-red)" fill="var(--color-red)" size={24} />
            <span className="sidebar-title">Smart Hospital</span>
          </div>

          <ul className="nav-menu">
            <li>
              <button 
                className={`nav-item ${activeTab === 'status' ? 'active' : ''}`}
                onClick={() => setActiveTab('status')}
                style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left' }}
              >
                <Activity size={18} />
                Emergency Status
              </button>
            </li>
            <li>
              <button 
                className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
                onClick={() => setActiveTab('profile')}
                style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left' }}
              >
                <Settings size={18} />
                Profile & Capabilities
              </button>
            </li>
            <li>
              <button 
                className={`nav-item ${activeTab === 'history' ? 'active' : ''}`}
                onClick={() => setActiveTab('history')}
                style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left' }}
              >
                <FileText size={18} />
                Request History
              </button>
            </li>
          </ul>

          <div className="sidebar-footer">
            <button className="btn btn-secondary btn-block" onClick={handleLogout} style={{ background: 'rgba(239, 68, 68, 0.05)', color: 'var(--color-red)', borderColor: 'rgba(239, 68, 68, 0.1)' }}>
              <LogOut size={16} />
              LOGOUT
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="main-content">
          
          {/* Top Bar */}
          <div className="topbar">
            <h2 className="topbar-title">{hospital?.hospital_name}</h2>
            <div className="user-profile">
              <div className="avatar">
                {hospital?.hospital_name ? hospital.hospital_name.charAt(0) : 'H'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Hospital Admin</span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{hospital?.hospital_type}</span>
              </div>
            </div>
          </div>

          <div className="content-body">
            
            {/* View 1: Status Dashboard */}
            {activeTab === 'status' && (
              <div className="profile-grid">
                
                <div>
                  <div className="card">
                    <h3 className="card-title">
                      <Activity size={18} color="var(--color-blue)" />
                      EMERGENCY ACCEPTANCE CONTROLLER
                    </h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '2rem' }}>
                      Control whether your Emergency Department is accepting trauma and emergency cases. 
                      Toggle status below to update immediately.
                    </p>

                    <div className="status-container">
                      <div 
                        className={`status-indicator ${hospital?.emergency_status === 'OPEN' ? 'open' : 'closed'}`}
                        onClick={handleStatusToggle}
                      >
                        🏥
                      </div>
                      <div className="status-text" style={{ color: hospital?.emergency_status === 'OPEN' ? 'var(--color-green)' : 'var(--color-red)' }}>
                        {hospital?.emergency_status || 'CLOSED'}
                      </div>
                      <div className="status-time">
                        Last Status Update: {hospital?.updated_at ? new Date(hospital.updated_at).toLocaleString() : 'Never'}
                      </div>
                    </div>
                  </div>

                  {/* Active Incident Routing map */}
                  {currentActiveIncident && (
                    <div className="card">
                      <h3 className="card-title">
                        <Navigation size={18} color="var(--color-blue)" />
                        ACTIVE DISPATCH ROUTE NAVIGATION
                      </h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '1rem' }}>
                        Patient is being transported to your facility. Active route display from scene to hospital.
                      </p>
                      <div style={{ height: '300px', borderRadius: '0.5rem', overflow: 'hidden' }} className="dark-map">
                        <MapContainer center={[hospital.latitude, hospital.longitude]} zoom={13} style={{ height: '100%' }}>
                          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                          <Marker position={[hospital.latitude, hospital.longitude]} />
                          <Marker position={[currentActiveIncident.latitude, currentActiveIncident.longitude]} icon={getIncidentIcon()} />
                          <Polyline 
                            positions={[
                              [hospital.latitude, hospital.longitude],
                              [currentActiveIncident.latitude, currentActiveIncident.longitude]
                            ]}
                            pathOptions={{ color: 'var(--color-blue)', weight: 4, dashArray: '5, 10' }}
                          />
                        </MapContainer>
                      </div>
                      <div style={{ marginTop: '1rem', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '4px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>ACTIVE INCIDENT CASE</div>
                          <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{currentActiveIncident.description}</div>
                        </div>
                        <div style={{ textTransform: 'uppercase', fontSize: '10px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.3)', color: 'var(--color-red)', background: 'rgba(239, 68, 68, 0.05)' }}>
                          {currentActiveIncident.priority}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sidebar Quick Stats */}
                <div>
                  <div className="card">
                    <h3 className="card-title">
                      <Info size={18} color="var(--color-blue)" />
                      FACILITY OVERVIEW
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Emergency Dept:</span>
                        <span style={{ fontWeight: 'bold', fontSize: '13px', color: facilities.emergency_dept_available ? 'var(--color-green)' : 'var(--color-red)' }}>
                          {facilities.emergency_dept_available ? 'ACTIVE' : 'INACTIVE'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Trauma Facility:</span>
                        <span style={{ fontWeight: 'bold', fontSize: '13px', color: facilities.trauma_facility ? 'var(--color-green)' : 'var(--color-red)' }}>
                          {facilities.trauma_facility ? 'YES' : 'NO'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Emergency Beds:</span>
                        <span style={{ fontWeight: 'bold', fontSize: '13px', color: 'var(--color-blue)' }}>{emergencyBeds} Available</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>ICU Beds Available:</span>
                        <span style={{ fontWeight: 'bold', fontSize: '13px' }}>{icuBeds}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.5rem' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Ventilator Units:</span>
                        <span style={{ fontWeight: 'bold', fontSize: '13px' }}>{ventilators}</span>
                      </div>
                    </div>
                  </div>

                  <div className="card">
                    <h3 className="card-title">
                      <ShieldCheck size={18} color="var(--color-green)" />
                      ACTIVE SPECIALISTS
                    </h3>
                    {specialists.length === 0 ? (
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No specialists configured.</span>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                        {specialists.map((spec, i) => (
                          <span key={i} style={{ fontSize: '10px', fontWeight: 'bold', padding: '3px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--color-green)' }}>
                            {spec}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* View 2: Profile Settings */}
            {activeTab === 'profile' && (
              <form onSubmit={handleProfileSave} className="space-y-4">
                <div className="profile-grid">
                  
                  <div>
                    <div className="card">
                      <h3 className="card-title">
                        <Settings size={18} color="var(--color-blue)" />
                        EMERGENCY CAPABILITIES
                      </h3>
                      
                      <div className="checkbox-grid">
                        <label className="checkbox-label">
                          <input 
                            type="checkbox" 
                            className="checkbox-input"
                            checked={facilities.emergency_dept_available}
                            onChange={(e) => setFacilities({ ...facilities, emergency_dept_available: e.target.checked })}
                          />
                          Emergency Dept Available
                        </label>
                        <label className="checkbox-label">
                          <input 
                            type="checkbox" 
                            className="checkbox-input"
                            checked={facilities.emergency_24x7}
                            onChange={(e) => setFacilities({ ...facilities, emergency_24x7: e.target.checked })}
                          />
                          24x7 Emergency Services
                        </label>
                        <label className="checkbox-label">
                          <input 
                            type="checkbox" 
                            className="checkbox-input"
                            checked={facilities.trauma_facility}
                            onChange={(e) => setFacilities({ ...facilities, trauma_facility: e.target.checked })}
                          />
                          Trauma Facility Available
                        </label>
                        <label className="checkbox-label">
                          <input 
                            type="checkbox" 
                            className="checkbox-input"
                            checked={facilities.ct_available}
                            onChange={(e) => setFacilities({ ...facilities, ct_available: e.target.checked })}
                          />
                          CT Scan Available
                        </label>
                        <label className="checkbox-label">
                          <input 
                            type="checkbox" 
                            className="checkbox-input"
                            checked={facilities.mri_available}
                            onChange={(e) => setFacilities({ ...facilities, mri_available: e.target.checked })}
                          />
                          MRI Scan Available
                        </label>
                        <label className="checkbox-label">
                          <input 
                            type="checkbox" 
                            className="checkbox-input"
                            checked={facilities.xray_available}
                            onChange={(e) => setFacilities({ ...facilities, xray_available: e.target.checked })}
                          />
                          X-Ray Room Available
                        </label>
                        <label className="checkbox-label">
                          <input 
                            type="checkbox" 
                            className="checkbox-input"
                            checked={facilities.blood_bank}
                            onChange={(e) => setFacilities({ ...facilities, blood_bank: e.target.checked })}
                          />
                          Blood Bank Onsite
                        </label>
                        <label className="checkbox-label">
                          <input 
                            type="checkbox" 
                            className="checkbox-input"
                            checked={facilities.ot_available}
                            onChange={(e) => setFacilities({ ...facilities, ot_available: e.target.checked })}
                          />
                          Operation Theatre Active
                        </label>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Total Beds</label>
                          <input 
                            type="number" 
                            className="form-input" 
                            value={totalBeds} 
                            onChange={(e) => setTotalBeds(e.target.value)} 
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Emergency Beds</label>
                          <input 
                            type="number" 
                            className="form-input" 
                            value={emergencyBeds} 
                            onChange={(e) => setEmergencyBeds(e.target.value)} 
                          />
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">ICU Bed Count</label>
                          <input 
                            type="number" 
                            className="form-input" 
                            value={icuBeds} 
                            onChange={(e) => setIcuBeds(e.target.value)} 
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Active Ventilators</label>
                          <input 
                            type="number" 
                            className="form-input" 
                            value={ventilators} 
                            onChange={(e) => setVentilators(e.target.value)} 
                          />
                        </div>
                      </div>
                    </div>

                    <div className="card">
                      <h3 className="card-title">
                        <User size={18} color="var(--color-blue)" />
                        ON-CALL SPECIALISTS
                      </h3>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '1rem' }}>
                        Manage specialists currently on call at your facility to assist dispatch routing.
                      </p>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input 
                          type="text" 
                          className="form-input" 
                          value={specialistInput} 
                          onChange={(e) => setSpecialistInput(e.target.value)}
                          placeholder="e.g. Cardiologist, Neurologist, Neurosurgeon"
                        />
                        <button type="button" className="btn btn-secondary" onClick={handleAddSpecialist}>
                          <Plus size={16} />
                          ADD
                        </button>
                      </div>

                      <div className="doctor-tag-container">
                        {specialists.map((spec, idx) => (
                          <span key={idx} className="doctor-tag">
                            {spec}
                            <Trash2 
                              size={12} 
                              className="doctor-tag-remove" 
                              onClick={() => handleRemoveSpecialist(spec)} 
                            />
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Profile Info Sidebar */}
                  <div>
                    <div className="card">
                      <h3 className="card-title">
                        <Info size={18} color="var(--color-blue)" />
                        HOSPITAL PROFILE DETAILS
                      </h3>
                      
                      <div className="form-group">
                        <label className="form-label">Contact Number</label>
                        <input 
                          type="text" 
                          className="form-input" 
                          value={hospital.phone} 
                          onChange={(e) => setHospital({ ...hospital, phone: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Street Address</label>
                        <textarea 
                          className="form-input" 
                          rows="3" 
                          value={hospital.address} 
                          onChange={(e) => setHospital({ ...hospital, address: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Coordinates</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input type="text" className="form-input" value={hospital.latitude.toFixed(5)} disabled />
                          <input type="text" className="form-input" value={hospital.longitude.toFixed(5)} disabled />
                        </div>
                      </div>
                    </div>

                    <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                      {loading ? 'Saving updates...' : 'SAVE CHANGES'}
                    </button>
                  </div>

                </div>
              </form>
            )}

            {/* View 3: Request Log Logs */}
            {activeTab === 'history' && (
              <div className="card">
                <h3 className="card-title">
                  <FileText size={18} color="var(--color-blue)" />
                  PATIENT ROUTING REQUEST LOGS
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '1.5rem' }}>
                  Historic logs of incoming patient alerts dispatched to this hospital.
                </p>

                {requests.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
                    No dispatch request logs found.
                  </div>
                ) : (
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>Incident Details</th>
                        <th>Created At</th>
                        <th>Distance</th>
                        <th>Response Status</th>
                        <th>Transports</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map((r, idx) => (
                        <tr key={idx}>
                          <td>
                            <div style={{ fontWeight: 'bold' }}>{r.emergency.description}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>ID: {r.emergency.id.substring(0, 8)}...</div>
                          </td>
                          <td>{new Date(r.created_at).toLocaleString()}</td>
                          <td>
                            {calculateDistanceKm(
                              hospital.latitude,
                              hospital.longitude,
                              r.emergency.latitude,
                              r.emergency.longitude
                            ).toFixed(2)} km
                          </td>
                          <td>
                            <span className={`badge ${
                              r.status === 'Accepted' ? 'badge-accepted' : 
                              r.status === 'Rejected' ? 'badge-rejected' : 'badge-pending'
                            }`}>
                              {r.status}
                            </span>
                          </td>
                          <td>
                            {r.status === 'Accepted' ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px', color: 'var(--color-blue)' }}>
                                <span>🚒 Status: Route Assigned</span>
                                <span>Amb ID: {r.emergency.assigned_ambulance ? r.emergency.assigned_ambulance.substring(0, 8) + '...' : 'Searching...'}</span>
                              </div>
                            ) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
