import React, { useState, useEffect } from 'react';
import { useSocket } from './context/SocketContext';
import { api } from './services/api';
import StatsPanel from './components/StatsPanel';
import Sidebar from './components/Sidebar';
import MapContainer from './components/MapContainer';
import DispatchPanel from './components/DispatchPanel';
import Modal from './components/Modal';
import { Play, Pause, RotateCcw, AlertOctagon, HeartHandshake, CheckCircle2, ShieldX, BellRing, History } from 'lucide-react';

const App = () => {
  const {
    ambulances,
    emergencies,
    setEmergencies,
    isSimulating,
    connected,
    mode,
    hospitals
  } = useSocket();

  // Selected items for map zooming / dispatch details
  const [selectedItem, setSelectedItem] = useState(null); // Ambulance or Emergency object
  const [selectedEmergency, setSelectedEmergency] = useState(null); // Currently focused emergency for dispatch panel

  // Map interaction modes — ambulances can be added/relocated manually here
  // (for vehicles without a driver phone) alongside the driver app's own updates.
  const [mapClickMode, setMapClickMode] = useState(null); // 'add_ambulance' | 'create_emergency' | 'relocate_ambulance' | null
  const [pendingLocation, setPendingLocation] = useState(null); // { latitude, longitude }
  const [relocatingAmbulance, setRelocatingAmbulance] = useState(null);

  // Modals state
  const [isAddAmbulanceOpen, setIsAddAmbulanceOpen] = useState(false);
  const [isCreateEmergencyOpen, setIsCreateEmergencyOpen] = useState(false);
  const [isEditAmbulanceOpen, setIsEditAmbulanceOpen] = useState(false);
  const [ambulanceToEdit, setAmbulanceToEdit] = useState(null);

  // Form states
  const [newAmbulance, setNewAmbulance] = useState({ name: '', vehicle_number: '', driver_name: '', status: 'Available' });
  const [newEmergency, setNewEmergency] = useState({ priority: 'High', description: '' });

  // Toast notifications
  const [toasts, setToasts] = useState([]);

  // Auto trigger logs modal
  const [forceFetchLogs, setForceFetchLogs] = useState(0);

  // Load selected emergency detail updates in real-time if it changes in context
  useEffect(() => {
    if (selectedEmergency) {
      const updated = emergencies.find(e => e.id === selectedEmergency.id);
      setSelectedEmergency(updated || null);
    }
  }, [emergencies, selectedEmergency]);

  // Handle adding toast notifications
  const addToast = (message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  // Socket side effect event tracking for visual notifications
  const { socket } = useSocket();
  useEffect(() => {
    if (!socket) return;

    const handleEmergencyCreated = (emergency) => {
      addToast(`🚨 New emergency incident reported (${emergency.priority} priority)!`, 'danger');
    };

    const handleDispatchAssigned = (data) => {
      addToast(`🚑 Ambulance "${data.ambulance.name}" dispatched to Incident!`, 'warning');
    };

    const handleDispatchResolved = (data) => {
      const ambName = ambulances.find(a => a.id === data.ambulance_id)?.name || 'Ambulance';
      addToast(`✅ ${ambName}'s incident has been resolved.`, 'success');
      // If the resolved emergency was selected, close dispatch panel or update status
      if (selectedEmergency && selectedEmergency.id === data.emergency_id) {
        setSelectedEmergency(null);
      }
    };

    const handleDispatchCancelled = (data) => {
      addToast(`⚠️ Dispatch assignment cancelled.`, 'info');
    };

    const handleVictimPickedUp = (data) => {
      const ambName = ambulances.find(a => a.id === data.ambulance_id)?.name || 'Ambulance';
      addToast(`🚑 ${ambName} has picked up the victim.`, 'success');
    };

    socket.on('emergency:created', handleEmergencyCreated);
    socket.on('dispatch:assigned', handleDispatchAssigned);
    socket.on('dispatch:resolved', handleDispatchResolved);
    socket.on('dispatch:cancelled', handleDispatchCancelled);
    socket.on('dispatch:victimPickedUp', handleVictimPickedUp);

    return () => {
      socket.off('emergency:created', handleEmergencyCreated);
      socket.off('dispatch:assigned', handleDispatchAssigned);
      socket.off('dispatch:resolved', handleDispatchResolved);
      socket.off('dispatch:cancelled', handleDispatchCancelled);
      socket.off('dispatch:victimPickedUp', handleVictimPickedUp);
    };
  }, [socket, ambulances, selectedEmergency]);

  // Sidebar item select handling
  const handleSelectAmbulance = (amb) => {
    setSelectedItem(amb);
  };

  const handleSelectEmergency = (emp) => {
    setSelectedItem(emp);
    setSelectedEmergency(emp);
  };

  const handleSelectHospital = (hosp) => {
    setSelectedItem(hosp);
  };

  // Map clicks handler based on mapClickMode
  const handleMapClick = async (lat, lng) => {
    if (!mapClickMode) return;

    if (mapClickMode === 'relocate_ambulance' && relocatingAmbulance) {
      try {
        const updated = await api.updateAmbulance(relocatingAmbulance.id, {
          latitude: Number(lat.toFixed(6)),
          longitude: Number(lng.toFixed(6))
        });
        addToast(`Ambulance "${updated.name}" relocated successfully.`, 'success');
      } catch (err) {
        addToast(`Relocation failed: ${err.message}`, 'danger');
      } finally {
        setRelocatingAmbulance(null);
        setMapClickMode(null);
      }
      return;
    }

    setPendingLocation({ latitude: lat, longitude: lng });

    if (mapClickMode === 'add_ambulance') {
      setIsAddAmbulanceOpen(true);
    } else if (mapClickMode === 'create_emergency') {
      setIsCreateEmergencyOpen(true);
    }

    setMapClickMode(null); // Reset click mode after receiving coordinate
  };

  const handleStatusChange = async (id, status) => {
    try {
      await api.updateAmbulance(id, { status });
      const ambName = ambulances.find(a => a.id === id)?.name || 'Ambulance';
      addToast(`Ambulance "${ambName}" status updated to ${status}.`, 'success');
    } catch (err) {
      addToast(`Failed to update status: ${err.message}`, 'danger');
    }
  };

  const handleRelocateClick = (amb) => {
    setRelocatingAmbulance(amb);
    setMapClickMode('relocate_ambulance');
    addToast(`Relocate Mode: Click on the map to set "${amb.name}"'s position.`, 'info');
  };

  const handleAmbulanceDrag = async (id, lat, lng) => {
    try {
      const updated = await api.updateAmbulance(id, {
        latitude: Number(lat.toFixed(6)),
        longitude: Number(lng.toFixed(6))
      });
      addToast(`Ambulance "${updated.name}" location updated via drag.`, 'success');
    } catch (err) {
      addToast(`Failed to update location: ${err.message}`, 'danger');
    }
  };

  const handleDoubleClickMap = (lat, lng) => {
    setPendingLocation({ latitude: lat, longitude: lng });
    setIsAddAmbulanceOpen(true);
  };

  const handleRightClickMap = (lat, lng) => {
    setPendingLocation({ latitude: lat, longitude: lng });
    setIsCreateEmergencyOpen(true);
  };

  // Trigger click modes
  const triggerAddAmbulanceMode = () => {
    setMapClickMode('add_ambulance');
  };

  const triggerCreateEmergencyMode = () => {
    setMapClickMode('create_emergency');
  };

  // Ambulance form submission
  const handleAddAmbulanceSubmit = async (e) => {
    e.preventDefault();
    if (!newAmbulance.name || !newAmbulance.vehicle_number || !pendingLocation) return;

    try {
      await api.createAmbulance({
        ...newAmbulance,
        latitude: pendingLocation.latitude,
        longitude: pendingLocation.longitude
      });
      addToast(`Created ambulance ${newAmbulance.name} successfully.`, 'success');
      setIsAddAmbulanceOpen(false);
      setNewAmbulance({ name: '', vehicle_number: '', driver_name: '', status: 'Available' });
      setPendingLocation(null);
    } catch (err) {
      addToast(`Error adding ambulance: ${err.message}`, 'danger');
    }
  };

  // Edit ambulance handlers
  const handleEditAmbulanceClick = (amb) => {
    setAmbulanceToEdit(amb);
    setIsEditAmbulanceOpen(true);
  };

  const handleEditAmbulanceSubmit = async (e) => {
    e.preventDefault();
    if (!ambulanceToEdit) return;

    try {
      await api.updateAmbulance(ambulanceToEdit.id, ambulanceToEdit);
      addToast(`Ambulance "${ambulanceToEdit.name}" details updated.`, 'success');
      setIsEditAmbulanceOpen(false);
      setAmbulanceToEdit(null);
    } catch (err) {
      addToast(`Error updating ambulance: ${err.message}`, 'danger');
    }
  };

  // Delete handlers
  const handleDeleteAmbulance = async (id) => {
    if (!window.confirm('Are you sure you want to delete this ambulance?')) return;
    try {
      await api.deleteAmbulance(id);
      addToast('Ambulance successfully removed.', 'info');
      if (selectedItem && selectedItem.id === id) {
        setSelectedItem(null);
      }
    } catch (err) {
      addToast(`Error deleting: ${err.message}`, 'danger');
    }
  };

  const handleDeleteEmergency = async (id) => {
    if (!window.confirm('Delete this emergency log?')) return;
    try {
      await api.cancelAssignment(id).catch(() => {}); // Attempt cancellation if assigned
      await api.deleteEmergency(id).catch((err) => {
        console.warn('Backend delete emergency failed or offline, performing client fallback:', err);
      });
      addToast('Incident log deleted.', 'info');
    } catch (err) {
      addToast('Incident removed from dashboard.', 'info');
    } finally {
      setEmergencies(prev => prev.filter(e => e.id !== id));
      if (selectedEmergency && selectedEmergency.id === id) {
        setSelectedEmergency(null);
      }
      if (selectedItem && selectedItem.id === id) {
        setSelectedItem(null);
      }
    }
  };

  const handleDeleteAllEmergencies = async () => {
    if (!window.confirm('Are you sure you want to delete ALL emergency incidents from the dashboard?')) return;
    try {
      await api.deleteAllEmergencies().catch((err) => {
        console.warn('Backend clear all emergencies failed or offline, performing client fallback:', err);
      });
    } catch (err) {
      console.error('Delete all failed:', err);
    } finally {
      setEmergencies([]);
      setSelectedEmergency(null);
      if (selectedItem && selectedItem.latitude) {
        setSelectedItem(null);
      }
      addToast('All incident logs cleared.', 'info');
    }
  };

  // Emergency form submission
  const handleCreateEmergencySubmit = async (e) => {
    e.preventDefault();
    if (!pendingLocation) return;

    try {
      const res = await api.createEmergency({
        ...newEmergency,
        latitude: pendingLocation.latitude,
        longitude: pendingLocation.longitude
      });
      
      setIsCreateEmergencyOpen(false);
      setNewEmergency({ priority: 'High', description: '' });
      setPendingLocation(null);

      if (res.assigned_ambulance) {
        addToast(`Emergency created. Assigned nearest ambulance: ${res.assigned_ambulance.name}`, 'success');
        // Auto select this emergency to show dispatch paths
        setSelectedEmergency(res.emergency);
        setSelectedItem(res.emergency);
      } else {
        addToast('Emergency created. No available ambulances found nearby.', 'warning');
      }
    } catch (err) {
      addToast(`Error creating emergency: ${err.message}`, 'danger');
    }
  };

  // Dispatch manual override overrides
  const handleReassignAmbulance = async (emergencyId, ambulanceId) => {
    try {
      await api.assignAmbulance(emergencyId, ambulanceId);
      addToast('Manual ambulance re-assignment successful.', 'success');
    } catch (err) {
      addToast(`Reassignment failed: ${err.message}`, 'danger');
    }
  };

  const handleCancelAssignment = async (emergencyId) => {
    try {
      await api.cancelAssignment(emergencyId);
      addToast('Ambulance dispatch cancelled.', 'info');
    } catch (err) {
      addToast(`Cancellation failed: ${err.message}`, 'danger');
    }
  };

  // Simulation controls
  const handleStartSimulation = async () => {
    try {
      await api.startSimulation();
      addToast('Movement simulation active.', 'success');
    } catch (err) {
      console.error(err);
    }
  };

  const handlePauseSimulation = async () => {
    try {
      await api.pauseSimulation();
      addToast('Simulation paused.', 'info');
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetSimulation = async () => {
    if (!window.confirm('Reset database & simulation to seed data?')) return;
    try {
      await api.resetSimulation();
      addToast('System database reset to defaults.', 'info');
      setSelectedItem(null);
      setSelectedEmergency(null);
    } catch (err) {
      console.error(err);
    }
  };

  // System mode toggle: Simulation (server moves ambulances) vs Live (real driver-app GPS)
  const handleToggleMode = async () => {
    const nextMode = mode === 'simulation' ? 'live' : 'simulation';
    if (nextMode === 'live' && !window.confirm('Switch to Live GPS mode? The movement simulation will pause, and new emergencies will be offered to driver apps instead of auto-assigned.')) {
      return;
    }
    try {
      await api.setMode(nextMode);
      addToast(`Switched to ${nextMode === 'live' ? 'Live GPS' : 'Simulation'} mode.`, 'info');
    } catch (err) {
      addToast(`Failed to switch mode: ${err.message}`, 'danger');
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-dark-bg text-slate-100 overflow-hidden font-sans">
      
      {/* Top Header Navigation */}
      <header className="h-14 border-b border-dark-border bg-dark-card/90 backdrop-blur-md px-6 flex justify-between items-center z-10 select-none">
        
        {/* Title */}
        <div className="flex items-center gap-3">
          <span className="text-xl">🚨</span>
          <div className="flex flex-col">
            <h1 className="text-sm md:text-base font-extrabold uppercase tracking-widest text-slate-100">
              Smart Dispatch Dashboard
            </h1>
            <span className="text-[10px] text-slate-500 font-bold tracking-wider -mt-0.5">
              EMS CONTROL ROOM PROTOTYPE
            </span>
          </div>
        </div>

        {/* Action Controls Header */}
        <div className="flex items-center gap-4">
          
          {/* Socket Connection status */}
          <div className="flex items-center gap-1.5 bg-slate-900/60 px-3 py-1 rounded-full border border-dark-border/80 text-[10px] font-semibold text-slate-400">
            <span className={`w-2 h-2 rounded-full ${connected ? 'bg-brand-green animate-pulse' : 'bg-brand-red'}`} />
            <span>{connected ? 'LIVE CONNECTION' : 'OFFLINE'}</span>
          </div>

          {/* Simulation vs Live GPS mode toggle */}
          <button
            onClick={handleToggleMode}
            title="Toggle between simulated movement and real driver-app GPS"
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wide transition-all ${
              mode === 'live'
                ? 'bg-brand-red/15 border-brand-red/40 text-brand-red'
                : 'bg-slate-900/60 border-dark-border/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${mode === 'live' ? 'bg-brand-red animate-pulse' : 'bg-slate-500'}`} />
            <span>{mode === 'live' ? 'Live GPS Mode' : 'Simulation Mode'}</span>
          </button>

          {/* Simulation Controllers */}
          <div className="flex items-center bg-slate-900 border border-dark-border rounded-lg p-0.5 overflow-hidden">
            {isSimulating ? (
              <button
                onClick={handlePauseSimulation}
                title="Pause Simulation"
                className="flex items-center gap-1 px-3 py-1.5 hover:bg-dark-hover text-slate-300 hover:text-brand-orange text-xs font-bold transition-all"
              >
                <Pause className="w-3.5 h-3.5" /> Pause
              </button>
            ) : (
              <button
                onClick={handleStartSimulation}
                title="Start Simulation"
                className="flex items-center gap-1 px-3 py-1.5 hover:bg-dark-hover text-slate-300 hover:text-brand-green text-xs font-bold transition-all"
              >
                <Play className="w-3.5 h-3.5" /> Start
              </button>
            )}
            
            <button
              onClick={handleResetSimulation}
              title="Reset System"
              className="flex items-center gap-1 px-3 py-1.5 hover:bg-dark-hover border-l border-dark-border text-slate-400 hover:text-slate-100 text-xs font-semibold transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
          </div>

          {/* Manual Incident Creation Mode */}
          <button
            onClick={triggerCreateEmergencyMode}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-extrabold rounded-lg shadow-lg shadow-blue-500/10 border transition-all ${
              mapClickMode === 'create_emergency'
                ? 'bg-brand-blue border-blue-400 text-slate-100 animate-pulse'
                : 'bg-brand-blue hover:bg-blue-600 border-brand-blue/30 text-slate-100'
            }`}
          >
            🚨 Create Emergency
          </button>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <main className="flex-1 flex flex-col p-4 overflow-hidden relative">
        
        {/* Stats counter stripe */}
        <StatsPanel ambulances={ambulances} emergencies={emergencies} />

        {/* Core Layout Frame */}
        <div className="flex-1 flex gap-4 overflow-hidden relative rounded-xl border border-dark-border/40 p-1 bg-slate-900/30">
          
          {/* Sidebar Left */}
          <Sidebar
            ambulances={ambulances}
            emergencies={emergencies}
            hospitals={hospitals}
            onSelectAmbulance={handleSelectAmbulance}
            onSelectEmergency={handleSelectEmergency}
            onSelectHospital={handleSelectHospital}
            selectedAmbulanceId={selectedItem?.vehicle_number ? selectedItem.id : null}
            selectedEmergencyId={selectedEmergency?.id}
            selectedHospitalId={selectedItem?.hospital_id ? selectedItem.hospital_id : null}
            onAddAmbulanceClick={triggerAddAmbulanceMode}
            onEditAmbulanceClick={handleEditAmbulanceClick}
            onDeleteAmbulanceClick={handleDeleteAmbulance}
            onDeleteEmergencyClick={handleDeleteEmergency}
            onDeleteAllEmergenciesClick={handleDeleteAllEmergencies}
            onStatusChange={handleStatusChange}
            onRelocateClick={handleRelocateClick}
          />

          {/* Leaflet Map Right */}
          <div className="flex-1 h-full relative">
            <MapContainer
              ambulances={ambulances}
              emergencies={emergencies}
              hospitals={hospitals}
              mapClickMode={mapClickMode}
              onMapClick={handleMapClick}
              selectedItem={selectedItem}
              onMarkerClick={(item, type) => {
                setSelectedItem(item);
                if (type === 'emergency') {
                  setSelectedEmergency(item);
                }
              }}
              onAmbulanceDrag={handleAmbulanceDrag}
              onDoubleClickMap={handleDoubleClickMap}
              onRightClickMap={handleRightClickMap}
            />
          </div>

          {/* Bottom Dispatch overlay panel */}
          <DispatchPanel
            selectedEmergency={selectedEmergency}
            ambulances={ambulances}
            onReassign={handleReassignAmbulance}
            onCancel={handleCancelAssignment}
            onDeleteEmergency={handleDeleteEmergency}
            onClose={() => setSelectedEmergency(null)}
            historyTrigger={forceFetchLogs}
          />
        </div>
      </main>

      {/* Toasts area */}
      <div className="fixed top-20 right-6 z-[9999] flex flex-col gap-2 max-w-sm">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className={`p-3 rounded-lg border shadow-xl flex items-center gap-2 text-xs font-semibold animate-in slide-in-from-right duration-250 select-none ${
              toast.type === 'success' ? 'bg-emerald-950/90 border-brand-green/30 text-brand-green' :
              toast.type === 'danger' ? 'bg-red-950/90 border-brand-red/30 text-brand-red' :
              toast.type === 'warning' ? 'bg-amber-950/90 border-brand-orange/30 text-brand-orange' :
              'bg-slate-950/90 border-dark-border text-slate-200'
            }`}
          >
            <span>
              {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> :
               toast.type === 'danger' ? <AlertOctagon className="w-4 h-4 shrink-0" /> :
               toast.type === 'warning' ? <BellRing className="w-4 h-4 shrink-0 animate-bounce" /> :
               <HeartHandshake className="w-4 h-4 shrink-0" />}
            </span>
            <p className="flex-1">{toast.message}</p>
          </div>
        ))}
      </div>

      {/* MODAL: ADD AMBULANCE */}
      <Modal
        isOpen={isAddAmbulanceOpen}
        onClose={() => { setIsAddAmbulanceOpen(false); setPendingLocation(null); }}
        title="Register New Ambulance"
      >
        <form onSubmit={handleAddAmbulanceSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Ambulance Call Sign</label>
            <input
              type="text"
              required
              placeholder="e.g. Rescue Indigo"
              value={newAmbulance.name}
              onChange={(e) => setNewAmbulance(prev => ({ ...prev, name: e.target.value }))}
              className="w-full bg-slate-900 border border-dark-border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-blue"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Vehicle License Plate</label>
            <input
              type="text"
              required
              placeholder="e.g. AMB-911-I"
              value={newAmbulance.vehicle_number}
              onChange={(e) => setNewAmbulance(prev => ({ ...prev, vehicle_number: e.target.value }))}
              className="w-full bg-slate-900 border border-dark-border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-blue"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Driver Full Name</label>
            <input
              type="text"
              placeholder="e.g. Samuel Jackson"
              value={newAmbulance.driver_name}
              onChange={(e) => setNewAmbulance(prev => ({ ...prev, driver_name: e.target.value }))}
              className="w-full bg-slate-900 border border-dark-border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-blue"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Initial Status</label>
            <select
              value={newAmbulance.status}
              onChange={(e) => setNewAmbulance(prev => ({ ...prev, status: e.target.value }))}
              className="w-full bg-slate-900 border border-dark-border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-blue"
            >
              <option value="Available">Available (Green)</option>
              <option value="Offline">Offline (Gray)</option>
              <option value="Maintenance">Maintenance (Orange)</option>
            </select>
          </div>
          {pendingLocation && (
            <div className="bg-slate-900/60 p-2.5 rounded-lg border border-dark-border/40 text-[10px] text-slate-500 font-mono">
              GPS Location: {pendingLocation.latitude.toFixed(6)}, {pendingLocation.longitude.toFixed(6)}
            </div>
          )}
          <button
            type="submit"
            className="w-full py-2 bg-brand-blue hover:bg-blue-600 text-slate-100 font-bold rounded-lg transition-colors text-sm shadow-md"
          >
            Save Ambulance Call Sign
          </button>
        </form>
      </Modal>

      {/* MODAL: EDIT AMBULANCE */}
      <Modal
        isOpen={isEditAmbulanceOpen}
        onClose={() => { setIsEditAmbulanceOpen(false); setAmbulanceToEdit(null); }}
        title="Modify Ambulance Settings"
      >
        {ambulanceToEdit && (
          <form onSubmit={handleEditAmbulanceSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Ambulance Call Sign</label>
              <input
                type="text"
                required
                value={ambulanceToEdit.name}
                onChange={(e) => setAmbulanceToEdit(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-slate-900 border border-dark-border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-blue"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Vehicle License Plate</label>
              <input
                type="text"
                required
                value={ambulanceToEdit.vehicle_number}
                onChange={(e) => setAmbulanceToEdit(prev => ({ ...prev, vehicle_number: e.target.value }))}
                className="w-full bg-slate-900 border border-dark-border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-blue"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Driver Full Name</label>
              <input
                type="text"
                value={ambulanceToEdit.driver_name || ''}
                onChange={(e) => setAmbulanceToEdit(prev => ({ ...prev, driver_name: e.target.value }))}
                className="w-full bg-slate-900 border border-dark-border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-blue"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">Current Status</label>
              <select
                value={ambulanceToEdit.status}
                onChange={(e) => setAmbulanceToEdit(prev => ({ ...prev, status: e.target.value }))}
                className="w-full bg-slate-900 border border-dark-border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-blue"
              >
                <option value="Available">Available (Green)</option>
                <option value="Busy">Busy (Red)</option>
                <option value="Offline">Offline (Gray)</option>
                <option value="Maintenance">Maintenance (Orange)</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full py-2 bg-brand-blue hover:bg-blue-600 text-slate-100 font-bold rounded-lg transition-colors text-sm shadow-md"
            >
              Update Settings
            </button>
          </form>
        )}
      </Modal>

      {/* MODAL: CREATE EMERGENCY */}
      <Modal
        isOpen={isCreateEmergencyOpen}
        onClose={() => { setIsCreateEmergencyOpen(false); setPendingLocation(null); }}
        title="Report New Emergency Incident"
      >
        <form onSubmit={handleCreateEmergencySubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Severity / Priority level</label>
            <select
              value={newEmergency.priority}
              onChange={(e) => setNewEmergency(prev => ({ ...prev, priority: e.target.value }))}
              className="w-full bg-slate-900 border border-dark-border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-blue"
            >
              <option value="Critical">Critical (Cardiac arrest, heavy bleeding, stroke)</option>
              <option value="High">High (Major fracture, asthma attack, collision)</option>
              <option value="Medium">Medium (High fever, mild burns, dislocation)</option>
              <option value="Low">Low (Sprains, scrapes, cuts)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1">Situation Description</label>
            <textarea
              required
              rows={3}
              placeholder="Provide a detailed description of the incident context..."
              value={newEmergency.description}
              onChange={(e) => setNewEmergency(prev => ({ ...prev, description: e.target.value }))}
              className="w-full bg-slate-900 border border-dark-border rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-blue resize-none"
            />
          </div>
          {pendingLocation && (
            <div className="bg-slate-900/60 p-2.5 rounded-lg border border-dark-border/40 text-[10px] text-slate-500 font-mono">
              GPS Location: {pendingLocation.latitude.toFixed(6)}, {pendingLocation.longitude.toFixed(6)}
            </div>
          )}
          <button
            type="submit"
            className="w-full py-2 bg-brand-blue hover:bg-blue-600 text-slate-100 font-bold rounded-lg transition-colors text-sm shadow-md"
          >
            Broadcast Emergency Alert
          </button>
        </form>
      </Modal>

    </div>
  );
};

export default App;
