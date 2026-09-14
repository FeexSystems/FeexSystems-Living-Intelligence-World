import React from "react";
import { GraphNode } from "@shared/orchestration";
import { Target, TrendingUp, Users } from "lucide-react";

export function CampaignsShell({ nodes }: { nodes: GraphNode[] }) {
  const campaigns = nodes.filter(n => n.group === "campaign" || n.type === "CAPABILITY" || n.label.toLowerCase().includes("campaign"));
  
  return (
    <div className="w-full h-full p-4 overflow-y-auto">
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-2">
          <Target className="text-emerald-400" />
          <div className="text-2xl font-bold">{campaigns.length || 3}</div>
          <div className="text-sm text-gray-400">Active Campaigns</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-2">
          <TrendingUp className="text-blue-400" />
          <div className="text-2xl font-bold">+24%</div>
          <div className="text-sm text-gray-400">Avg QIE Score</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-2">
          <Users className="text-purple-400" />
          <div className="text-2xl font-bold">12.4k</div>
          <div className="text-sm text-gray-400">Audience Reached</div>
        </div>
      </div>
      
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold border-b border-white/10 pb-2 mb-4">Campaign Graph Nodes</h3>
          <div className="space-y-4">
            {campaigns.length > 0 ? campaigns.map(c => (
              <div key={c.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
                <div className="font-medium text-emerald-300">{c.label}</div>
                <div className="text-sm text-gray-400 mt-1">ID: {c.id}</div>
              </div>
            )) : (
              <div className="text-gray-500 italic p-4 text-center border border-dashed border-white/10 rounded-lg">
                No campaign nodes currently in focus. Ask the Navigator to retrieve campaigns.
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold border-b border-white/10 pb-2 mb-4">Active Experiments</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-indigo-900/20 border border-indigo-500/20 rounded-lg p-4">
              <div className="font-medium text-indigo-300">Subject Line A/B Test</div>
              <div className="text-xs text-indigo-400/70 mt-1">Status: RUNNING</div>
              <div className="mt-3 flex items-center justify-between text-xs">
                <span>Variant A: 12% CTR</span>
                <span className="text-emerald-400 font-bold">Variant B: 18% CTR</span>
              </div>
            </div>
            <div className="bg-indigo-900/20 border border-indigo-500/20 rounded-lg p-4">
              <div className="font-medium text-indigo-300">Hero Image Optimization</div>
              <div className="text-xs text-indigo-400/70 mt-1">Status: PLANNED</div>
              <div className="mt-3 flex flex-col gap-1 text-xs text-gray-400">
                <span>Hypothesis: Dynamic character images will increase signups.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
