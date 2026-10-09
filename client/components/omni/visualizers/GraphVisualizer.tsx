import { useMemo, useCallback } from "react";
import type { GraphVisualizerProps, GraphNode } from "@shared/orchestration";
import { useOmniStore } from "@/stores/omniStore";
import { Cpu, Database, Terminal, Cloud, Layers, Zap } from "lucide-react";

let ReactFlow: any = null;
let Background: any = null;
let Controls: any = null;
let MarkerType: any = null;
let Handle: any = null;
let Position: any = null;
let useNodesState: any = null;
let useEdgesState: any = null;

try {
  const rf = require("reactflow");
  ReactFlow = rf.default || rf;
  Background = rf.Background;
  Controls = rf.Controls;
  MarkerType = rf.MarkerType;
  Handle = rf.Handle;
  Position = rf.Position;
  useNodesState = rf.useNodesState;
  useEdgesState = rf.useEdgesState;
} catch {
  /* grid fallback */
}

const typeIcon = (type: string) => {
  switch (type) {
    case "TECHNOLOGY":
      return <Cpu size={14} className="text-emerald-400" />;
    case "DATA":
    case "ARTIFACT":
      return <Database size={14} className="text-blue-400" />;
    case "CAPABILITY":
      return <Terminal size={14} className="text-indigo-400" />;
    case "INFRASTRUCTURE":
      return <Cloud size={14} className="text-amber-400" />;
    default:
      return <Layers size={14} className="text-zinc-400" />;
  }
};

function NodeCard({
  node,
  focused,
  onFocus,
}: {
  node: GraphNode;
  focused?: boolean;
  onFocus?: (id: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onFocus?.(node.id)}
      className={`text-left px-3 py-2.5 rounded-xl bg-zinc-900 border w-44 transition-all ${
        focused
          ? "border-indigo-500 shadow-lg shadow-indigo-500/20"
          : "border-zinc-700 hover:border-zinc-500"
      }`}
    >
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 rounded-lg bg-zinc-800 border border-zinc-700">{typeIcon(node.type)}</div>
        <div className="min-w-0">
          <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider truncate">
            {node.group || node.type}
          </div>
          <div className="text-sm font-medium text-zinc-100 truncate">{node.label}</div>
        </div>
      </div>
    </button>
  );
}

function TechNode({ data }: { data: any }) {
  return (
    <div
      className={`px-3 py-2 shadow-xl rounded-xl bg-zinc-900 border w-44 hover:border-indigo-500 transition-all ${
        data.focused ? "border-indigo-500" : "border-zinc-700"
      }`}
      onClick={() => data.onFocus?.(data.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") data.onFocus?.(data.id);
      }}
    >
      {Handle && Position && (
        <>
          <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-zinc-400 !border-none" />
          <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-zinc-400 !border-none" />
        </>
      )}
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-zinc-800 border border-zinc-700">{typeIcon(data.type)}</div>
        <div className="min-w-0">
          <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider truncate">
            {data.group || data.type}
          </div>
          <div className="text-sm font-bold text-zinc-100 truncate">{data.label}</div>
        </div>
      </div>
    </div>
  );
}

function ReactFlowGraph({
  nodes,
  edges,
  focusNodeId,
  onFocus,
}: GraphVisualizerProps & { onFocus: (id: string) => void }) {
  const initialNodes = useMemo(
    () =>
      nodes.map((n, idx) => ({
        id: n.id,
        type: "techNode",
        position: n.position || { x: 80 + (idx % 5) * 220, y: 60 + Math.floor(idx / 5) * 160 },
        data: {
          id: n.id,
          label: n.label,
          type: n.type,
          group: n.group,
          focused: n.id === focusNodeId,
          onFocus,
        },
        style:
          n.id === focusNodeId
            ? { boxShadow: "0 0 0 2px rgba(99,102,241,0.6)" }
            : undefined,
      })),
    [nodes, focusNodeId, onFocus]
  );

  const initialEdges = useMemo(
    () =>
      edges.map((e, i) => ({
        id: e.id || `e-${i}`,
        source: e.source,
        target: e.target,
        label: e.label || e.relation,
        animated: e.animated !== false,
        style: { stroke: "#6366f1", strokeWidth: 1.5 },
        markerEnd: MarkerType
          ? { type: MarkerType.ArrowClosed, color: "#6366f1" }
          : undefined,
      })),
    [edges]
  );

  const [rfNodes, , onNodesChange] = useNodesState(initialNodes);
  const [rfEdges, , onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = useCallback(
    (_: any, node: any) => {
      if (node?.id) onFocus(node.id);
    },
    [onFocus]
  );

  return (
    <div className="w-full h-full min-h-[420px]">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={{ techNode: TechNode }}
        fitView
        className="bg-zinc-950"
      >
        {Background && <Background color="#27272a" gap={24} size={1} />}
        {Controls && <Controls className="!bg-zinc-900 !border-zinc-800 !fill-zinc-400" />}
      </ReactFlow>
    </div>
  );
}

export function GraphVisualizer(props: GraphVisualizerProps) {
  const { nodes = [], edges = [], focusNodeId } = props;
  const setContext = useOmniStore((s) => s.setContext);

  const onFocus = useCallback(
    (id: string) => {
      setContext({ focusedNodeIds: [id] });
    },
    [setContext]
  );

  if (!nodes.length) {
    return (
      <div className="w-full h-full flex items-center justify-center text-zinc-500">
        <Zap size={24} className="mr-2" /> No graph nodes returned from the World Model.
      </div>
    );
  }

  if (ReactFlow && useNodesState) {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="px-4 py-2 text-xs font-mono text-zinc-500 border-b border-zinc-900">
          GraphVisualizer (React Flow) · {nodes.length} nodes · {edges.length} edges
          {focusNodeId ? ` · focus ${focusNodeId}` : ""}
          <span className="text-zinc-600"> · click node to focus</span>
        </div>
        <div className="flex-1 min-h-0">
          <ReactFlowGraph {...props} onFocus={onFocus} />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full overflow-auto p-6 md:p-10">
      <div className="mb-4 flex items-center justify-between text-xs font-mono text-zinc-500">
        <span>
          GraphVisualizer (grid) · {nodes.length} nodes · {edges.length} edges · click to focus
        </span>
        {focusNodeId && <span className="text-indigo-400">focus: {focusNodeId}</span>}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {nodes.map((n) => (
          <NodeCard key={n.id} node={n} focused={n.id === focusNodeId} onFocus={onFocus} />
        ))}
      </div>
      {edges.length > 0 && (
        <div className="mt-10 pt-6 border-t border-zinc-800">
          <h3 className="text-xs font-mono uppercase tracking-widest text-zinc-500 mb-3">
            Relationships
          </h3>
          <div className="flex flex-wrap gap-2">
            {edges.slice(0, 40).map((e, i) => (
              <span
                key={e.id || i}
                className="text-[11px] px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 font-mono"
              >
                {e.source} —{e.label || e.relation || "→"}→ {e.target}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
