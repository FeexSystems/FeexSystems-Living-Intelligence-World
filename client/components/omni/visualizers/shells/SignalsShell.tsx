import React from "react";
import { Activity, Github, Twitter, Globe } from "lucide-react";

export function SignalsShell() {
  const dummySignals = [
    { id: 1, type: 'github', icon: Github, title: 'Commit pushed to main', time: '10m ago', desc: 'Updated World Model schema for new campaign types.' },
    { id: 2, type: 'web', icon: Globe, title: 'High traffic anomaly detected', time: '1h ago', desc: 'Traffic spike on /projects route originating from social referrers.' },
    { id: 3, type: 'social', icon: Twitter, title: 'Brand mention surge', time: '3h ago', desc: 'FeexSystems mentioned by 5 top-tier accounts.' },
  ];

  return (
    <div className="w-full h-full p-4 overflow-y-auto">
      <h3 className="text-lg font-semibold border-b border-white/10 pb-2 mb-4 text-emerald-400 flex items-center gap-2">
        <Activity size={18} /> Live Market Signals
      </h3>
      <div className="space-y-4">
        {dummySignals.map(sig => (
          <div key={sig.id} className="bg-white/5 border border-white/10 rounded-lg p-4 flex gap-4">
            <div className="mt-1">
              <sig.icon size={20} className="text-gray-400" />
            </div>
            <div>
              <div className="flex justify-between items-start w-full gap-4">
                <span className="font-medium text-gray-200">{sig.title}</span>
                <span className="text-xs text-gray-500 whitespace-nowrap">{sig.time}</span>
              </div>
              <p className="text-sm text-gray-400 mt-1">{sig.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
