import React from 'react';
import { Activity, Bell } from 'lucide-react';

export function SignalsShell() {
  const mockSignals = [
    { id: 1, type: 'Mention', source: 'Twitter', time: '10 mins ago', detail: 'High engagement detected on latest product tweet.' },
    { id: 2, type: 'Trending', source: 'GitHub', time: '1 hr ago', detail: 'Repository stars surged by 15% today.' },
    { id: 3, type: 'Traffic', source: 'Analytics', time: '3 hrs ago', detail: 'Unusual spike in visitors from EU region.' },
  ];

  return (
    <div className="flex flex-col h-full p-6 text-white/90">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400 border border-blue-500/20">
          <Activity className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-semibold tracking-tight">Market Signals</h3>
      </div>
      
      <div className="flex-1 overflow-auto space-y-3 pr-2 custom-scrollbar">
        {mockSignals.map(signal => (
          <div key={signal.id} className="p-4 bg-white/5 hover:bg-white/10 transition-colors border border-white/10 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium px-2 py-1 bg-blue-500/20 text-blue-400 rounded-md">
                {signal.type}
              </span>
              <span className="text-xs text-gray-500">{signal.time}</span>
            </div>
            <p className="text-sm text-gray-300">{signal.detail}</p>
            <p className="text-xs text-gray-500 mt-2">Source: {signal.source}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
