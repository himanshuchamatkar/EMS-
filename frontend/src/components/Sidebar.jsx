import React, { useState } from 'react';
import { Search, Plus, Trash2, Edit3, MapPin, CheckCircle2, ShieldAlert, Radio, Image, Video, Mic } from 'lucide-react';

// Ambulances can be managed two ways: manually here (for vehicles with no
// driver phone) or live from the driver app (see driver-app/). Both write to
// the same backend, so either can create/move/update an ambulance.
const Sidebar = ({
  ambulances,
  emergencies,
  hospitals = [],
  onSelectAmbulance,
  onSelectEmergency,
  onSelectHospital,
  selectedAmbulanceId,
  selectedEmergencyId,
  selectedHospitalId,
  onAddAmbulanceClick,
  onEditAmbulanceClick,
  onDeleteAmbulanceClick,
  onDeleteEmergencyClick,
  onDeleteAllEmergenciesClick,
  onDeleteHospitalClick,
  onStatusChange,
  onRelocateClick,
}) => {
  const [activeTab, setActiveTab] = useState('ambulances'); // 'ambulances' | 'emergencies'
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Available' | 'Busy' | 'Offline' | 'Maintenance'

  // Filter and search ambulances
  const filteredAmbulances = ambulances.filter(amb => {
    const matchesSearch =
      amb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      amb.vehicle_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (amb.driver_name && amb.driver_name.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'All' || amb.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Filter and search emergencies
  const filteredEmergencies = emergencies.filter(emp => {
    const matchesSearch =
      (emp.description && emp.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      emp.priority.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.status.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  // Filter and search hospitals
  const filteredHospitals = hospitals.filter(h => {
    const matchesSearch =
      h.hospital_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (h.hospital_type && h.hospital_type.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesSearch;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'Available': return 'bg-brand-green/20 text-brand-green border-brand-green/30';
      case 'Busy': return 'bg-brand-red/20 text-brand-red border-brand-red/30';
      case 'Maintenance': return 'bg-brand-orange/20 text-brand-orange border-brand-orange/30';
      case 'Offline': return 'bg-slate-500/20 text-slate-400 border-slate-700';
      default: return 'bg-slate-700 text-slate-300';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Critical': return 'bg-red-500/30 text-red-400 border-red-500/40';
      case 'High': return 'bg-amber-500/30 text-amber-400 border-amber-500/40';
      case 'Medium': return 'bg-yellow-500/30 text-yellow-400 border-yellow-500/40';
      case 'Low': return 'bg-blue-500/30 text-blue-400 border-blue-500/40';
      default: return 'bg-slate-700 text-slate-300';
    }
  };

  const getEmergencyStatusColor = (status) => {
    switch (status) {
      case 'Pending': return 'bg-blue-500/20 text-blue-400 border-blue-500/40 animate-pulse';
      case 'Assigned': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      case 'VICTIM_PICKED': return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
      case 'Resolved': return 'bg-slate-700/40 text-slate-500 border-slate-700';
      default: return 'bg-slate-700 text-slate-300';
    }
  };

  return (
    <div className="w-80 bg-dark-card border-r border-dark-border flex flex-col h-full overflow-hidden select-none">
      {/* Search Bar */}
      <div className="p-4 border-b border-dark-border flex flex-col gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={
              activeTab === 'ambulances' ? "Search ambulance, driver..." :
              activeTab === 'emergencies' ? "Search description, priority..." :
              "Search hospital name, address..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/60 border border-dark-border rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-blue transition-colors"
          />
        </div>

        {/* Tab Headers */}
        <div className="flex bg-slate-900/80 p-1 rounded-lg border border-dark-border/60 gap-0.5">
          <button
            onClick={() => { setActiveTab('ambulances'); setSearchQuery(''); }}
            className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${
              activeTab === 'ambulances'
                ? 'bg-dark-card text-brand-blue shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Ambs ({ambulances.length})
          </button>
          <button
            onClick={() => { setActiveTab('emergencies'); setSearchQuery(''); }}
            className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${
              activeTab === 'emergencies'
                ? 'bg-dark-card text-brand-blue shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Incidents ({emergencies.filter(e => e.status !== 'Resolved').length})
          </button>
          <button
            onClick={() => { setActiveTab('hospitals'); setSearchQuery(''); }}
            className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all ${
              activeTab === 'hospitals'
                ? 'bg-dark-card text-brand-blue shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Hospitals ({hospitals.length})
          </button>
        </div>
      </div>

      {/* Tab Context Filters (Only for Ambulances) */}
      {activeTab === 'ambulances' && (
        <div className="px-4 py-2 border-b border-dark-border/40 bg-slate-900/20 flex gap-1 overflow-x-auto whitespace-nowrap">
          {['All', 'Available', 'Busy', 'Offline', 'Maintenance'].map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-2 py-0.5 text-[10px] font-semibold rounded border transition-all ${
                statusFilter === filter
                  ? 'bg-slate-700 border-slate-600 text-slate-100'
                  : 'bg-transparent border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      )}

      {/* Dynamic List Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {activeTab === 'ambulances' ? (
          <>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold tracking-wide text-slate-400 flex items-center gap-1.5">
                AMBULANCE REGISTRY
                <Radio className="w-3 h-3 text-brand-green" title="Phone-linked ambulances update live" />
              </span>
              <button
                onClick={onAddAmbulanceClick}
                className="flex items-center gap-1 px-2 py-1 bg-brand-blue hover:bg-blue-600 text-slate-100 rounded text-[10px] font-bold shadow-md shadow-blue-900/10 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add
              </button>
            </div>

            {filteredAmbulances.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs italic">
                No ambulances found.
              </div>
            ) : (
              filteredAmbulances.map((amb) => {
                const isSelected = selectedAmbulanceId === amb.id;
                return (
                  <div
                    key={amb.id}
                    onClick={() => onSelectAmbulance(amb)}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-slate-800/80 border-brand-blue shadow-lg shadow-blue-500/5'
                        : 'bg-slate-900/40 border-dark-border hover:bg-slate-800/30'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-200">{amb.name}</span>
                        <span className="text-[10px] font-mono text-slate-400">{amb.vehicle_number}</span>
                      </div>
                      <select
                        value={amb.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => onStatusChange(amb.id, e.target.value)}
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase bg-slate-900 focus:outline-none cursor-pointer ${getStatusColor(amb.status)}`}
                      >
                        <option value="Available" className="bg-slate-900 text-brand-green">Available</option>
                        <option value="Busy" className="bg-slate-900 text-brand-red">Busy</option>
                        <option value="Offline" className="bg-slate-900 text-slate-400">Offline</option>
                        <option value="Maintenance" className="bg-slate-900 text-brand-orange">Maintenance</option>
                      </select>
                    </div>

                    <div className="flex justify-between items-center text-xs text-slate-400 mt-2 border-t border-dark-border/40 pt-2">
                      <span>Drv: <strong className="text-slate-300">{amb.driver_name}</strong></span>
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onRelocateClick(amb)}
                          title="Relocate (Set Position on Map)"
                          className="p-1 rounded hover:bg-dark-hover text-brand-orange hover:text-amber-400 transition-colors"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onEditAmbulanceClick(amb)}
                          title="Edit Details"
                          className="p-1 rounded hover:bg-dark-hover text-slate-400 hover:text-slate-200 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteAmbulanceClick(amb.id)}
                          title="Delete Ambulance"
                          className="p-1 rounded hover:bg-dark-hover text-brand-red hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </>
        ) : activeTab === 'emergencies' ? (
          <>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold tracking-wide text-slate-400">EMERGENCY LOGS</span>
              {emergencies.length > 0 && onDeleteAllEmergenciesClick && (
                <button
                  onClick={onDeleteAllEmergenciesClick}
                  className="text-[10px] font-bold text-red-400 hover:text-red-300 flex items-center gap-1 hover:bg-red-500/10 px-1.5 py-0.5 rounded transition-colors"
                  title="Clear All Incidents"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear All
                </button>
              )}
            </div>

            {filteredEmergencies.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs italic">
                No active emergencies.
              </div>
            ) : (
              filteredEmergencies.map((emp) => {
                const isSelected = selectedEmergencyId === emp.id;
                const assignedAmbName = ambulances.find(a => a.id === emp.assigned_ambulance)?.name;

                return (
                  <div
                    key={emp.id}
                    onClick={() => onSelectEmergency(emp)}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-slate-800/80 border-brand-blue shadow-lg shadow-blue-500/5'
                        : 'bg-slate-900/40 border-dark-border hover:bg-slate-800/30'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${getPriorityColor(emp.priority)}`}>
                        {emp.priority}
                      </span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${getEmergencyStatusColor(emp.status)}`}>
                        {emp.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 line-clamp-2 mb-2 font-medium">
                      {emp.description}
                    </p>

                    {/* Media indicator badges */}
                    {(emp.photo_url || emp.video_url || emp.audio_url) && (
                      <div className="flex gap-1.5 mb-2 flex-wrap">
                        {emp.photo_url && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 bg-brand-blue/15 text-brand-blue border border-brand-blue/30 rounded uppercase">
                            <Image className="w-2.5 h-2.5" /> Photo
                          </span>
                        )}
                        {emp.video_url && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 bg-purple-500/15 text-purple-300 border border-purple-500/30 rounded uppercase">
                            <Video className="w-2.5 h-2.5" /> Video
                          </span>
                        )}
                        {emp.audio_url && (
                          <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 bg-teal-500/15 text-teal-300 border border-teal-500/30 rounded uppercase">
                            <Mic className="w-2.5 h-2.5" /> Audio
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex justify-between items-center text-[10px] text-slate-400 mt-2 border-t border-dark-border/40 pt-2">
                      <div className="flex items-center gap-1 font-semibold text-slate-500">
                        {emp.status === 'VICTIM_PICKED' ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                            <span className="text-purple-300 truncate max-w-[120px]">Victim picked up · {assignedAmbName}</span>
                          </>
                        ) : emp.status === 'Assigned' ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-brand-green" />
                            <span className="text-slate-300 truncate max-w-[120px]">{assignedAmbName}</span>
                          </>
                        ) : emp.status === 'Pending' ? (
                          <>
                            <ShieldAlert className="w-3.5 h-3.5 text-brand-blue" />
                            <span className="text-brand-blue">Awaiting Dispatch</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
                            <span>Resolved</span>
                          </>
                        )}
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteEmergencyClick(emp.id); }}
                        title="Delete Log"
                        className="p-1 rounded hover:bg-dark-hover text-slate-400 hover:text-brand-red transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </>
        ) : (
          <>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold tracking-wide text-slate-400">REGISTERED HOSPITALS</span>
            </div>

            {filteredHospitals.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs italic">
                No hospitals registered.
              </div>
            ) : (
              filteredHospitals.map((h) => {
                const isSelected = selectedHospitalId === h.hospital_id;
                return (
                  <div
                    key={h.hospital_id}
                    onClick={() => onSelectHospital(h)}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-slate-800/80 border-brand-blue shadow-lg shadow-blue-500/5'
                        : 'bg-slate-900/40 border-dark-border hover:bg-slate-800/30'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1.5 gap-2">
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-slate-200 truncate">{h.hospital_name}</span>
                        <span className="text-[10px] text-slate-400 truncate">{h.address}</span>
                      </div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${
                        h.emergency_status === 'OPEN'
                          ? 'bg-brand-green/20 text-brand-green border-brand-green/30'
                          : 'bg-brand-red/20 text-brand-red border-brand-red/30'
                      }`}>
                        {h.emergency_status}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs text-slate-400 mt-2 border-t border-dark-border/40 pt-2">
                      <span>Beds: <strong className="text-slate-300">{h.facilities?.emergency_beds || 0} Available</strong></span>
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onSelectHospital(h)}
                          title="Locate on Map"
                          className="p-1 rounded hover:bg-dark-hover text-brand-blue hover:text-blue-400 transition-colors"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                        </button>
                        {onDeleteHospitalClick && (
                          <button
                            onClick={() => onDeleteHospitalClick(h.hospital_id)}
                            title="Delete Hospital"
                            className="p-1 rounded hover:bg-dark-hover text-brand-red hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
