import React from 'react';
import { Send, CheckCircle2 } from 'lucide-react';

interface Props {
  nodes?: any[];
}

export function SyndicationShell({ nodes = [] }: Props) {
  const platforms = [
    { name: 'Twitter', status: 'Active' },
    { name: 'LinkedIn', status: 'Active' },
    { name: 'Medium', status: 'Pending' }
  ];

  return (
    <div className="flex flex-col h-full p-6 text-white/90">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20">
          <Send className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-semibold tracking-tight">Agentic Syndication</h3>
      </div>
      
      <div className="flex-1 overflow-auto space-y-3">
        <p className="text-sm text-gray-400 mb-4">Content distribution targets:</p>
        {platforms.map(platform => (
          <div key={platform.name} className="p-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between">
            <span className="font-medium text-white">{platform.name}</span>
            <div className="flex items-center gap-2">
              <span className={`text-xs ${platform.status === 'Active' ? 'text-emerald-400' : 'text-yellow-400'}`}>
                {platform.status}
              </span>
              {platform.status === 'Active' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
