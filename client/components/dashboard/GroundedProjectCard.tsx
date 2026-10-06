import { Link } from "react-router-dom";
import { Folder, Star, GitBranch, Github, Layers, ArrowRight } from "lucide-react";
import { WorldModelProject } from "@/lib/worldModelClient";
import { Badge } from "@/components/ui/badge";

export function GroundedProjectCard({ project }: { project: WorldModelProject }) {
  return (
    <div className="group relative rounded-xl border border-white/10 bg-black/40 hover:bg-white/5 overflow-hidden transition-all duration-300 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] hover:border-white/20 hover:shadow-[0_12px_40px_0_rgba(0,255,65,0.08)]">
      <div className="p-5">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-white/5 border border-white/10 text-white group-hover:text-[#00ff41] transition-colors">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white tracking-tight leading-tight">{project.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-mono text-zinc-400">{project.repository}</span>
              </div>
            </div>
          </div>
          {project.isPinned && (
            <Badge variant="outline" className="border-[#00ff41]/20 text-[#00ff41] bg-emerald-500/10 text-[10px] px-1.5 py-0 uppercase">Pinned</Badge>
          )}
        </div>
        
        <p className="text-[10px] text-zinc-400 line-clamp-2 mb-4 h-10">
          {project.description || "No description provided in World Model."}
        </p>

        <div className="flex items-center gap-4 text-[10px] font-mono text-zinc-500 mb-5">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-[#00ff41]" />
            {project.language || "Unknown"}
          </div>
          {project.metadata?.stars !== undefined && (
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5" />
              {project.metadata.stars}
            </div>
          )}
          {project.metadata?.defaultBranch && (
            <div className="flex items-center gap-1">
              <GitBranch className="w-3.5 h-3.5" />
              {project.metadata.defaultBranch}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 pt-4 border-t border-white/10">
          <Link to={`/world?node=${project.id}`} className="flex-1">
            <button className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-[10px] font-medium text-black bg-[#00ff41] hover:bg-[#00ff41]/90 rounded-md transition-colors">
              <Layers className="w-3.5 h-3.5" />
              Explore Node
            </button>
          </Link>
          <a href={project.url} target="_blank" rel="noreferrer" className="flex-none">
            <button className="flex items-center justify-center w-8 h-8 rounded-md bg-white/5 border border-white/10 text-zinc-300 hover:text-white hover:bg-white/10 transition-colors">
              <Github className="w-4 h-4" />
            </button>
          </a>
        </div>
      </div>
      
      {/* Edge decoration */}
      <div className="absolute top-0 right-0 w-16 h-16 pointer-events-none opacity-20">
         <svg viewBox="0 0 100 100" className="w-full h-full fill-current text-[#00ff41]">
            <polygon points="100,0 100,100 0,0" />
         </svg>
      </div>
    </div>
  );
}
