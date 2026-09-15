import React from 'react';
import { BarChart, TrendingUp } from 'lucide-react';

export function AnalyticsShell() {
  const metrics = [
    { label: 'Total Reach', value: '1.2M', trend: '+12%' },
    { label: 'Engagement Rate', value: '4.8%', trend: '+0.5%' },
    { label: 'Conversion', value: '2.1%', trend: '-0.1%' },
  ];

  return (
    <div className="flex flex-col h-full p-6 text-white/90">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-orange-500/10 rounded-lg text-orange-400 border border-orange-500/20">
          <BarChart className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-semibold tracking-tight">Performance Analytics</h3>
      </div>
      
      <div className="grid grid-cols-1 gap-4">
        {metrics.map(metric => (
          <div key={metric.label} className="p-4 bg-white/5 border border-white/10 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400 mb-1">{metric.label}</p>
              <p className="text-2xl font-bold text-white">{metric.value}</p>
            </div>
            <div className={`flex items-center gap-1 text-sm ${metric.trend.startsWith('+') ? 'text-emerald-400' : 'text-red-400'}`}>
              <TrendingUp className="w-4 h-4" />
              {metric.trend}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
