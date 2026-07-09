import React from 'react';
import { Activity, ShieldCheck, ShieldAlert, WifiOff, Settings, AlertTriangle } from 'lucide-react';

const StatsPanel = ({ ambulances, emergencies }) => {
  const total = ambulances.length;
  const available = ambulances.filter(a => a.status === 'Available').length;
  const busy = ambulances.filter(a => a.status === 'Busy').length;
  const offline = ambulances.filter(a => a.status === 'Offline').length;
  const maintenance = ambulances.filter(a => a.status === 'Maintenance').length;
  
  const activeEmergencies = emergencies.filter(e => e.status !== 'Resolved').length;

  const cards = [
    {
      label: 'Total Ambulances',
      count: total,
      icon: Activity,
      color: 'text-slate-400 border-slate-700 bg-slate-800/40',
      glow: 'shadow-slate-500/10'
    },
    {
      label: 'Available',
      count: available,
      icon: ShieldCheck,
      color: 'text-brand-green border-brand-green/30 bg-brand-green/5',
      glow: 'shadow-emerald-500/10'
    },
    {
      label: 'Busy / Dispatched',
      count: busy,
      icon: ShieldAlert,
      color: 'text-brand-red border-brand-red/30 bg-brand-red/5',
      glow: 'shadow-red-500/10'
    },
    {
      label: 'Maintenance',
      count: maintenance,
      icon: Settings,
      color: 'text-brand-orange border-brand-orange/30 bg-brand-orange/5',
      glow: 'shadow-amber-500/10'
    },
    {
      label: 'Offline',
      count: offline,
      icon: WifiOff,
      color: 'text-brand-gray border-brand-gray/30 bg-brand-gray/5',
      glow: 'shadow-slate-400/10'
    },
    {
      label: 'Active Incidents',
      count: activeEmergencies,
      icon: AlertTriangle,
      color: 'text-brand-blue border-brand-blue/30 bg-brand-blue/5',
      glow: 'shadow-blue-500/10'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-4 w-full">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className={`flex flex-col p-3 rounded-lg border backdrop-blur-md shadow-lg ${card.color} ${card.glow} transition-all duration-300 hover:scale-[1.02]`}
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] uppercase font-semibold tracking-wider opacity-85 select-none">
                {card.label}
              </span>
              <Icon className="w-4 h-4 opacity-75" />
            </div>
            <span className="text-2xl font-bold tracking-tight">{card.count}</span>
          </div>
        );
      })}
    </div>
  );
};

export default StatsPanel;
