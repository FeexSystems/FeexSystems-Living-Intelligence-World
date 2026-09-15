import React from 'react';
import { Globe, Link as LinkIcon } from 'lucide-react';

interface Props {
  nodes?: any[];
}

export function ContentShell({ nodes = [] }: Props) {
  const contentNodes = nodes.filter(n => n.type === 'evidence' || n.type === 'artifact');

  return (
    <div className="flex flex-col h-full p-6 text-white/90">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400 border border-purple-500/20">
          <Globe className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-semibold tracking-tight">Content Asset Fabric</h3>
      </div>
      
      <div className="flex-1 overflow-auto space-y-3 pr-2 custom-scrollbar">
        {contentNodes.length > 0 ? (
          contentNodes.map(node => (
            <div key={node.id} className="p-4 bg-white/5 hover:bg-white/10 transition-colors border border-white/10 rounded-xl flex items-center justify-between">
              <div>
                <h4 className="font-medium text-white">{node.label}</h4>
                <p className="text-sm text-gray-400 mt-1">{node.description || 'Content metadata loading...'}</p>
              </div>
              <LinkIcon className="w-4 h-4 text-purple-500/50" />
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-40 text-gray-500 text-sm">
            <Globe className="w-8 h-8 mb-3 opacity-20" />
            <p>No content assets currently in focus.</p>
          </div>
        )}
      </div>
    </div>
  );
}
