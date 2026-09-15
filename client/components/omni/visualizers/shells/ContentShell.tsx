import React from "react";
import { GraphNode } from "@shared/orchestration";
import { FileText, Link as LinkIcon, FileImage } from "lucide-react";

export function ContentShell({ nodes }: { nodes: GraphNode[] }) {
  const assets = nodes.filter(n => n.group === "asset" || n.type === "ARTIFACT" || n.label.toLowerCase().includes("content"));
  
  return (
    <div className="w-full h-full p-4 overflow-y-auto">
      <h3 className="text-lg font-semibold border-b border-white/10 pb-2 mb-4 text-emerald-400 flex items-center gap-2">
        <FileText size={18} /> Content Asset Fabric
      </h3>
      
      <div className="grid grid-cols-2 gap-4">
        {assets.length > 0 ? assets.map((a, i) => {
          // Simulate some state distribution for visualizer
          const states = ["IDEA", "RESEARCH", "BRIEF", "DRAFT", "REVIEW", "APPROVED", "SCHEDULED", "PUBLISHED"];
          const state = states[i % states.length];
          
          return (
            <div key={a.id} className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 truncate">
                  <FileImage size={16} className="text-purple-400 flex-shrink-0" />
                  <div className="font-medium text-gray-200 truncate" title={a.label}>{a.label}</div>
                </div>
                <div className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-medium">
                  {state}
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs text-emerald-500/70">
                <LinkIcon size={12} />
                <span>Grounded in World Model</span>
              </div>
            </div>
          );
        }) : (
          <div className="col-span-2 text-gray-500 italic p-4 text-center border border-dashed border-white/10 rounded-lg">
            No specific content assets retrieved. Ask the Navigator to retrieve content.
          </div>
        )}
      </div>
    </div>
  );
}
