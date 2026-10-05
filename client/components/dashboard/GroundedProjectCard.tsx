import React from "react";
import { Link } from "react-router-dom";
import { GitBranch, Star, Layers, ExternalLink, ShieldCheck, Compass } from "lucide-react";
import type { WorldModelProject } from "@/lib/worldModelClient";
import { Badge } from "@/components/ui/badge";

export interface GroundedProjectCardProps {
  project: WorldModelProject;
}

export function GroundedProjectCard({ project }: GroundedProjectCardProps) {
  const topics = project.metadata?.topics || [];
  const stars = project.metadata?.stars || 0;
  const branch = project.metadata?.defaultBranch || "main";

  return (
    <div className="relative group p-5 rounded-xl border border-white/10 bg-black/60 backdrop-blur-xl hover:border-white/25 transition-all duration-300 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] flex flex-col justify-between">
      {/* Top Bar with Domain and Evidence Badge */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <Badge
            variant="outline"
            className="text-[11px] font-mono tracking-wider px-2 py-0.5 border-[#00ff41]/40 text-[#00ff41] bg-[#00ff41]/10 uppercase"
          >
            {project.domain || "ENGINEERING"}
          </Badge>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-[11px] text-zinc-300 font-mono">
              <Layers className="w-3.5 h-3.5 text-zinc-400" />
              <span>{project.artifactCount} artifacts</span>
            </span>
            <span className="flex items-center gap-1 text-[11px] text-zinc-300 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>CANONICAL</span>
            </span>
          </div>
        </div>

        {/* Project Title and Description */}
        <h3 className="text-base font-semibold text-white group-hover:text-[#00ff41] transition-colors flex items-center gap-2">
          {project.name}
        </h3>
        <p className="text-xs text-zinc-300 font-mono mt-1 mb-4 line-clamp-2 leading-relaxed">
          {project.description || "Synchronized canonical repository in the FeexSystems Living World Model."}
        </p>

        {/* Repository & Branch Meta */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-300 font-mono mb-4">
          <span className="flex items-center gap-1 text-zinc-300">
            <GitBranch className="w-3 h-3 text-zinc-400" />
            <span>{branch}</span>
          </span>
          {project.language && (
            <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-200 text-[11px]">
              {project.language}
            </span>
          )}
          {stars > 0 && (
            <span className="flex items-center gap-1 text-amber-300">
              <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
              <span>{stars}</span>
            </span>
          )}
        </div>

        {/* Topics Pills */}
        {topics.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {topics.slice(0, 4).map((topic) => (
              <span
                key={topic}
                className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-zinc-300 border border-white/10"
              >
                #{topic}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono">
        <Link
          to={`/evidence?projectId=${encodeURIComponent(project.id)}`}
          className="text-zinc-300 hover:text-white transition flex items-center gap-1"
        >
          <span>Evidence Fabric</span>
          <span className="text-[10px] text-zinc-500">→</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            to="/world"
            className="text-zinc-300 hover:text-[#00ff41] transition flex items-center gap-1"
            title="Explore in 3D Galaxy"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>3D Node</span>
          </Link>
          <a
            href={project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-300 hover:text-white transition flex items-center gap-1"
            title="Open GitHub Repository"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}
