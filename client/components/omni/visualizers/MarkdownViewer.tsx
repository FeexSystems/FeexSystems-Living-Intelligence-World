import "react";
import type { MarkdownViewerProps } from "@shared/orchestration";
import { ShieldCheck, FileText } from "lucide-react";

export function MarkdownViewer(props: MarkdownViewerProps) {
  const { title, content, evidence_anchors = [] } = props;

  const html = content
    .replace(/^### (.*$)/gim, "<h3 class='text-sm font-bold text-white mt-4 mb-2 tracking-wide uppercase'>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2 class='text-base font-bold text-white mt-5 mb-2 tracking-tight'>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1 class='text-lg font-bold text-white mt-2 mb-3 tracking-tight'>$1</h1>")
    .replace(/\*\*(.*?)\*\*/gim, "<strong class='text-white font-semibold'>$1</strong>")
    .replace(/`(.*?)`/gim, "<code class='px-1.5 py-0.5 rounded-[6px] bg-white/10 text-white text-xs font-mono border border-white/10'>$1</code>")
    .replace(/^- (.*$)/gim, "<li class='ml-4 list-disc text-white/70'>$1</li>")
    .replace(/\n/g, "<br/>");

  return (
    <div className="w-full h-full overflow-y-auto p-6 md:p-12 font-mono selection:bg-white selection:text-black">
      <div className="max-w-4xl mx-auto rounded-[20px] border border-white/10 bg-[#121212] p-6 sm:p-10 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6">
          <div className="flex items-center gap-2 text-xs text-white/50 uppercase tracking-wider">
            <FileText className="size-3.5 text-white" />
            <span>// SYNTHESIZED DIRECTIVE BRIEF</span>
          </div>
          <span className="text-[10px] rounded-[10px] border border-white/10 bg-white/5 px-2.5 py-0.5 text-white/70">
            HMAC VERIFIED
          </span>
        </div>

        <h1 className="text-xl sm:text-2xl font-bold text-white mb-6 tracking-tight">{title}</h1>
        <div
          className="text-white/70 text-xs sm:text-sm leading-relaxed space-y-2 font-mono"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        {evidence_anchors.length > 0 && (
          <div className="mt-10 pt-6 border-t border-white/10">
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-white/50 mb-3">
              <ShieldCheck className="size-3 text-white" />
              <span>Evidence Fabric Anchors ({evidence_anchors.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {evidence_anchors.map((a) => (
                <span
                  key={a.id}
                  className="text-xs px-3 py-1 rounded-[10px] bg-black/60 border border-white/10 text-white/80 font-mono flex items-center gap-1.5"
                >
                  <span className="size-1 rounded-full bg-white" />
                  <span>{a.type}: {a.label}</span>
                  {a.sha ? <span className="text-white/40">· {a.sha.slice(0, 7)}</span> : null}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
