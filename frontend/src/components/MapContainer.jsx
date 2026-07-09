import React, { useEffect, useRef } from 'react';
import { MapContainer as LeafletMap, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';

// Leaflet click handler component
const MapEvents = ({ onClick, onDoubleClick, onRightClick }) => {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
    dblclick(e) {
      onDoubleClick(e.latlng.lat, e.latlng.lng);
    },
    contextmenu(e) {
      onRightClick(e.latlng.lat, e.latlng.lng);
    }
  });
  return null;
};

// Map controller to handle programmatically flying/zooming to locations
const MapController = ({ selectedItem }) => {
  const map = useMap();

  useEffect(() => {
    if (selectedItem) {
      map.setView([selectedItem.latitude, selectedItem.longitude], 15, {
        animate: true,
        duration: 1.5
      });
    }
  }, [selectedItem, map]);

  return null;
};

const MapContainer = ({
  ambulances,
  emergencies,
  mapClickMode, // 'add_ambulance' | 'create_emergency' | 'relocate_ambulance' | null
  onMapClick,
  selectedItem, // { latitude, longitude } to focus on
  onMarkerClick,
  onAmbulanceDrag,
  onDoubleClickMap,
  onRightClickMap
}) => {
  const indiaCenter = [28.6139, 77.2090];

  // Helper to construct custom HTML glowing markers for ambulances
  const getAmbulanceIcon = (status, heading) => {
    return L.divIcon({
      className: `marker-container marker-${status.toLowerCase()}`,
      html: `
        <div class="marker-pulse"></div>
        <div class="marker-dot"></div>
        ${status === 'Busy' ? `
          <div style="
            position: absolute;
            width: 0;
            height: 0;
            border-left: 5px solid transparent;
            border-right: 5px solid transparent;
            border-bottom: 8px solid #ef4444;
            transform: rotate(${heading || 0}deg) translateY(-12px);
            filter: drop-shadow(0 2px 3px rgba(0,0,0,0.6));
          "></div>
        ` : ''}
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -14]
    });
  };

  // Helper to construct custom HTML glowing markers for emergencies
  const getEmergencyIcon = (priority) => {
    return L.divIcon({
      className: 'marker-container marker-emergency',
      html: `
        <div class="marker-pulse"></div>
        <div class="marker-dot"></div>
        <div style="
          position: absolute;
          font-size: 11px;
          text-shadow: 0 1px 3px rgba(0,0,0,0.8);
          transform: translateY(-1px);
        ">${priority === 'Critical' ? '🚨' : '⚡'}</div>
      `,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16]
    });
  };

  // Build route lines for active assignments
  const routeLines = emergencies
    .filter(emp => emp.status === 'Assigned' && emp.assigned_ambulance)
    .map(emp => {
      const amb = ambulances.find(a => a.id === emp.assigned_ambulance);
      if (!amb) return null;
      return {
        id: `${emp.id}-${amb.id}`,
        positions: [
          [amb.latitude, amb.longitude],
          [emp.latitude, emp.longitude]
        ]
      };
    })
    .filter(Boolean);

  return (
    <div className="w-full h-full relative border border-dark-border/60 rounded-xl overflow-hidden shadow-inner dark-map">
      
      {/* Help Instructions Overlay when adding items */}
      {mapClickMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-brand-blue border border-blue-400 text-slate-100 text-xs px-4 py-2 rounded-full shadow-lg font-bold flex items-center gap-2 select-none animate-bounce">
          <span>📍</span>
          <span>
            {mapClickMode === 'add_ambulance' && 'Click anywhere on the map to place the new ambulance'}
            {mapClickMode === 'create_emergency' && 'Click on the map to place the emergency incident'}
            {mapClickMode === 'relocate_ambulance' && 'Click on the map to relocate the ambulance'}
          </span>
        </div>
      )}

      <LeafletMap
        center={indiaCenter}
        zoom={13}
        className="w-full h-full"
        zoomControl={true}
        doubleClickZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapEvents 
          onClick={onMapClick} 
          onDoubleClick={onDoubleClickMap}
          onRightClick={onRightClickMap}
        />
        
        <MapController selectedItem={selectedItem} />

        {/* Draw Route Lines */}
        {routeLines.map(route => (
          <Polyline
            key={route.id}
            positions={route.positions}
            pathOptions={{
              color: '#3b82f6',
              weight: 3.5,
              opacity: 0.8,
              dashArray: '8, 8',
              className: 'leaflet-ant-path' // Hooks into custom CSS animation in index.css
            }}
          />
        ))}

        {/* Render Ambulances */}
        {ambulances.map(amb => (
          <Marker
            key={amb.id}
            position={[amb.latitude, amb.longitude]}
            icon={getAmbulanceIcon(amb.status, amb.heading)}
            draggable={amb.status !== 'Busy'}
            eventHandlers={{
              click: () => onMarkerClick(amb, 'ambulance'),
              dragend: (e) => {
                const position = e.target.getLatLng();
                onAmbulanceDrag(amb.id, position.lat, position.lng);
              }
            }}
          >
            <Popup>
              <div className="text-xs space-y-1 font-sans">
                <div className="flex justify-between items-center gap-2 border-b border-slate-700 pb-1 mb-1">
                  <span className="font-bold text-slate-200">{amb.name}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                    amb.status === 'Available' ? 'border-brand-green/30 text-brand-green bg-brand-green/5' :
                    amb.status === 'Busy' ? 'border-brand-red/30 text-brand-red bg-brand-red/5' :
                    amb.status === 'Maintenance' ? 'border-brand-orange/30 text-brand-orange bg-brand-orange/5' :
                    'border-slate-700 text-slate-400 bg-slate-800'
                  }`}>
                    {amb.status}
                  </span>
                </div>
                <div>Vehicle: <span className="font-semibold text-slate-300">{amb.vehicle_number}</span></div>
                <div>Driver: <span className="font-semibold text-slate-300">{amb.driver_name}</span></div>
                {amb.speed > 0 && (
                  <div>Speed: <span className="font-semibold text-slate-300">{amb.speed} km/h</span></div>
                )}
                <div className="text-[10px] text-slate-500 font-mono mt-1 pt-1 border-t border-slate-800">
                  {amb.latitude.toFixed(5)}, {amb.longitude.toFixed(5)}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Render Emergencies */}
        {emergencies.map(emp => (
          <Marker
            key={emp.id}
            position={[emp.latitude, emp.longitude]}
            icon={getEmergencyIcon(emp.priority)}
            eventHandlers={{
              click: () => onMarkerClick(emp, 'emergency')
            }}
          >
            <Popup>
              <div className="text-xs space-y-1 font-sans max-w-xs">
                <div className="flex justify-between items-center gap-2 border-b border-slate-700 pb-1 mb-1">
                  <span className="font-bold text-slate-200">Emergency Incident</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                    emp.priority === 'Critical' ? 'border-red-500/30 text-red-400 bg-red-500/5' :
                    emp.priority === 'High' ? 'border-amber-500/30 text-amber-400 bg-amber-500/5' :
                    emp.priority === 'Medium' ? 'border-yellow-500/30 text-yellow-400 bg-yellow-500/5' :
                    'border-blue-500/30 text-blue-400 bg-blue-500/5'
                  }`}>
                    {emp.priority}
                  </span>
                </div>
                <p className="text-slate-300 font-medium">{emp.description}</p>
                <div className="mt-1 pt-1 border-t border-slate-800 text-[10px]">
                  Status: <span className="font-bold text-brand-blue">{emp.status}</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {emp.latitude.toFixed(5)}, {emp.longitude.toFixed(5)}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

      </LeafletMap>
    </div>
  );
};

export default MapContainer;
