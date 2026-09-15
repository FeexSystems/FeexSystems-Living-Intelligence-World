import React from "react";
import { BarChart2, PieChart, Activity } from "lucide-react";

export function AnalyticsShell() {
  return (
    <div className="w-full h-full p-4 overflow-y-auto flex flex-col gap-6">
      <h3 className="text-lg font-semibold border-b border-white/10 pb-2 text-emerald-400 flex items-center gap-2">
        <BarChart2 size={18} /> Platform Analytics
      </h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-lg p-6 flex flex-col items-center justify-center min-h-[160px]">
          <PieChart size={32} className="text-gray-500 mb-2" />
          <div className="text-gray-400 text-sm">Audience Demographics</div>
          <div className="text-xs text-emerald-500/50 mt-1">Real-time breakdown</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-6 flex flex-col items-center justify-center min-h-[160px]">
          <Activity size={32} className="text-gray-500 mb-2" />
          <div className="text-gray-400 text-sm">Engagement Velocity</div>
          <div className="text-xs text-emerald-500/50 mt-1">+14% across all channels</div>
        </div>
      </div>
      
      <div className="bg-white/5 border border-white/10 rounded-lg p-4 min-h-[200px] flex items-center justify-center text-gray-500 flex-col gap-2">
        <BarChart2 size={48} className="opacity-20" />
        <p>Advanced metrics visualization area</p>
      </div>
    </div>
  );
}
