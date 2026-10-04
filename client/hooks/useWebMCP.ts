import { useEffect } from "react";

/**
 * WebMCP Tool Registration Hook
 *
 * Exposes core FeexSystems World Model endpoints to AI agents acting via the browser.
 * This aligns with the Agentic Browsing capability.
 */
export function useWebMCP() {
  useEffect(() => {
    // @ts-ignore - navigator.webmcp is experimental and not yet in standard TS dom libs
    if (typeof navigator !== "undefined" && navigator.webmcp && navigator.webmcp.registerTool) {
      const registerWebMCPTools = async () => {
        try {
          // @ts-ignore
          await navigator.webmcp.registerTool({
            name: "get_projects",
            description: "Retrieve synchronized World Model projects.",
            parameters: {
              type: "object",
              properties: {},
            },
            execute: async () => {
              const res = await fetch("/api/world-model/projects");
              const data = await res.json();
              return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
            },
          });

          // @ts-ignore
          await navigator.webmcp.registerTool({
            name: "get_graph",
            description: "Retrieve 3D/2D node & edge topology of the World Model.",
            parameters: {
              type: "object",
              properties: {},
            },
            execute: async () => {
              const res = await fetch("/api/world-model/graph");
              const data = await res.json();
              return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
            },
          });

          // @ts-ignore
          await navigator.webmcp.registerTool({
            name: "get_evidence",
            description: "Retrieve the Evidence Fabric provenance ledger for a project.",
            parameters: {
              type: "object",
              properties: {
                projectId: { type: "string" },
              },
              required: ["projectId"],
            },
            execute: async (args: { projectId: string }) => {
              const res = await fetch(`/api/world-model/evidence/${args.projectId}`);
              const data = await res.json();
              return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
            },
          });

          // @ts-ignore
          await navigator.webmcp.registerTool({
            name: "navigator_search",
            description: "Perform grounded retrieval on the World Model.",
            parameters: {
              type: "object",
              properties: {
                query: { type: "string" },
              },
              required: ["query"],
            },
            execute: async (args: { query: string }) => {
              const res = await fetch(`/api/world-model/navigator?q=${encodeURIComponent(args.query)}`);
              const data = await res.json();
              return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
            },
          });

          // @ts-ignore
          await navigator.webmcp.registerTool({
            name: "omni_command",
            description: "Dispatch Omni-Command orchestration contracts.",
            parameters: {
              type: "object",
              properties: {
                command: { type: "string" },
              },
              required: ["command"],
            },
            execute: async (args: { command: string }) => {
              const res = await fetch("/api/world-model/omni-command", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ command: args.command }),
              });
              const data = await res.json();
              return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
            },
          });
          
          console.log("[FeexSystems] WebMCP Agentic tools successfully registered.");
        } catch (error) {
          console.error("[FeexSystems] Failed to register WebMCP tools:", error);
        }
      };

      registerWebMCPTools();
    }
  }, []);
}
