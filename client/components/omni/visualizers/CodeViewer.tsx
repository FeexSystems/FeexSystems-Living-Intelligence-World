import { useMemo } from "react";
import type { CodeViewerProps } from "@shared/orchestration";

export function CodeViewer(props: CodeViewerProps) {
  const {
    path = "untitled",
    language = "plaintext",
    content = "",
    sha,
    startLine = 1,
  } = props;

  const lines = useMemo(() => String(content).split("\n"), [content]);

  return (
    <div className="w-full h-full flex flex-col bg-zinc-950 text-zinc-200">
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 text-xs font-mono text-zinc-500">
        <span className="truncate text-zinc-300">{path}</span>
        <span className="flex items-center gap-3 shrink-0">
          <span className="uppercase tracking-wider">{language}</span>
          {sha && <span className="text-indigo-400">sha:{String(sha).slice(0, 8)}</span>}
        </span>
      </div>
      <div className="flex-1 overflow-auto p-0">
        <pre className="text-[12px] leading-5 font-mono">
          <code>
            {lines.map((line, i) => (
              <div key={i} className="flex hover:bg-zinc-900/80">
                <span className="w-12 shrink-0 text-right pr-3 text-zinc-600 select-none border-r border-zinc-900">
                  {startLine + i}
                </span>
                <span className="pl-3 pr-4 whitespace-pre-wrap break-all text-zinc-300">{line || " "}</span>
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}
