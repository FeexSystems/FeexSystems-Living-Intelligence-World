import React from "react";
import { GraphNode } from "@shared/orchestration";
import { Send, Twitter, Linkedin, Mail, Clock, CheckCircle } from "lucide-react";

export function SyndicationShell({ nodes }: { nodes: GraphNode[] }) {
  // Mock data for syndication tasks
  const scheduledTasks = [
    { id: "1", title: "Announcing Advanced Marketing", platform: "twitter", time: "In 2 hours", status: "scheduled" },
    { id: "2", title: "FeexSystems Q3 Update", platform: "linkedin", time: "Tomorrow 9am", status: "draft" },
    { id: "3", title: "Content Engine Release", platform: "email", time: "Next week", status: "approved" },
  ];
  
  return (
    <div className="w-full h-full p-4 overflow-y-auto">
      <h3 className="text-lg font-semibold border-b border-white/10 pb-2 mb-4 text-blue-400 flex items-center gap-2">
        <Send size={18} /> Syndication & Agentic Distribution
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {scheduledTasks.map(task => (
          <div key={task.id} className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {task.platform === 'twitter' && <Twitter size={16} className="text-sky-400" />}
                  {task.platform === 'linkedin' && <Linkedin size={16} className="text-blue-500" />}
                  {task.platform === 'email' && <Mail size={16} className="text-emerald-400" />}
                  <span className="text-xs uppercase tracking-wider font-semibold text-gray-400">{task.platform}</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-500">
                  <Clock size={12} /> {task.time}
                </div>
              </div>
              <div className="font-medium text-gray-200 line-clamp-2">{task.title}</div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-white/10 flex justify-between items-center">
              <span className={`text-xs px-2 py-1 rounded-full ${
                task.status === 'scheduled' ? 'bg-blue-500/20 text-blue-400' :
                task.status === 'draft' ? 'bg-amber-500/20 text-amber-400' :
                'bg-emerald-500/20 text-emerald-400'
              }`}>
                {task.status.toUpperCase()}
              </span>
              <button className="text-xs text-white/70 hover:text-white flex items-center gap-1 bg-white/10 hover:bg-white/20 px-2 py-1 rounded transition-colors">
                <CheckCircle size={12} /> Approve
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-black/30 rounded-lg border border-white/5 p-4 flex flex-col gap-2">
        <h4 className="text-sm font-medium text-gray-300">Agentic Syndication Engine</h4>
        <p className="text-xs text-gray-500">
          The syndication engine automatically drafts platform-specific content variants from your core assets and schedules them for distribution. 
          Use the command prompt to request syndication: <code className="bg-black/50 px-1 py-0.5 rounded text-blue-300">"Syndicate the latest release notes to Twitter"</code>.
        </p>
      </div>
    </div>
  );
}
