import React from 'react';
import { Target, Activity } from 'lucide-react';

interface Props {
  nodes?: any[];
}

export function CampaignsShell({ nodes = [] }: Props) {
  const campaigns = nodes.filter(n => n.type === 'campaign' || n.type === 'project');

  return (
    <div className="flex flex-col h-full p-6 text-white/90">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
          <Target className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-semibold tracking-tight">Active Campaigns</h3>
      </div>
      
      <div className="flex-1 overflow-auto space-y-3 pr-2 custom-scrollbar">
        {campaigns.length > 0 ? (
          campaigns.map(node => (
            <div key={node.id} className="p-4 bg-white/5 hover:bg-white/10 transition-colors border border-white/10 rounded-xl flex items-center justify-between">
              <div>
                <h4 className="font-medium text-white">{node.label}</h4>
                <p className="text-sm text-gray-400 mt-1">{node.description || 'Campaign data loading...'}</p>
              </div>
              <Activity className="w-4 h-4 text-emerald-500/50" />
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-gray-500 text-sm">
            <Target className="w-8 h-8 mb-3 opacity-20" />
            <p>No campaign nodes currently in focus.</p>
          </div>
        )}
      </div>
    </div>
  );
}
