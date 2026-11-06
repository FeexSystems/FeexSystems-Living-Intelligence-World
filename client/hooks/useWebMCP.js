 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { useEffect } from "react";

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
            execute: async (args) => {
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
            execute: async (args) => {
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
            execute: async (args) => {
              const res = await fetch("/api/world-model/omni-command", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ command: args.command }),
              });
              const data = await res.json();
              return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
            },
          });
          // @ts-ignore
          await navigator.webmcp.registerTool({
            name: "trigger_evidence_sync",
            description: "Trigger a GitHub profile synchronization for a pinned project to refresh Evidence Fabric provenance.",
            parameters: {
              type: "object",
              properties: {
                repo: { type: "string", description: "The GitHub repository to sync (e.g. org/repo)" }
              },
              required: ["repo"]
            },
            execute: async (args) => {
              const res = await fetch("/api/world-model/sync/github-pinned", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ repo: args.repo }),
              });
              const data = await res.json();
              return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
            }
          });

          // @ts-ignore
          await navigator.webmcp.registerTool({
            name: "analyze_telemetry_stream",
            description: "Analyze the current telemetry stream from the World Model for the Sovereign HUD.",
            parameters: {
              type: "object",
              properties: {
                duration_seconds: { type: "number", description: "Duration in seconds to sample the stream (default: 5)" }
              }
            },
            execute: async (args) => {
              const duration = args.duration_seconds || 5;
              // Because it's an SSE stream, we sample it via fetch + AbortController
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), duration * 1000);
              
              try {
                const res = await fetch("/api/world-model/telemetry/stream", { 
                  signal: controller.signal 
                });
                // Note: We might not get a clean JSON response if it's SSE, but we can capture the text
                const text = await res.text();
                return { content: [{ type: "text", text: text }] };
              } catch (e) {
                if (e.name === "AbortError") {
                  return { content: [{ type: "text", text: `Sampled telemetry for ${duration}s.` }] };
                }
                throw e;
              } finally {
                clearTimeout(timeout);
              }
            }
          });

          // ── Dynamic MCP tool discovery ──
          try {
            const toolsRes = await fetch("/api/mcp/tools");
            if (toolsRes.ok) {
              const toolsData = await toolsRes.json();
              const tools = _optionalChain([toolsData, 'optionalAccess', _ => _.data, 'optionalAccess', _2 => _2.tools]) || [];

              for (const tool of tools) {
                const toolName = _optionalChain([tool, 'access', _3 => _3.name, 'optionalAccess', _4 => _4.replace, 'call', _5 => _5(/\s+/g, "_"), 'access', _6 => _6.toLowerCase, 'call', _7 => _7()]);
                if (!toolName) continue;

                // @ts-ignore
                await navigator.webmcp.registerTool({
                  name: `mcp_${toolName}`,
                  description: tool.description || `MCP tool: ${tool.name}`,
                  parameters: {
                    type: "object",
                    properties: {
                      toolName: { type: "string", default: tool.name },
                      arguments: { type: "object", description: "Tool arguments" },
                      pluginName: { type: "string", description: "Plugin name (if plugin tool)" },
                      connectorName: { type: "string", description: "Connector name (if connector tool)" },
                    },
                    required: ["toolName"],
                  },
                  execute: async (args) => {
                    const res = await fetch("/api/mcp/tools/execute", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        toolName: args.toolName || tool.name,
                        arguments: args.arguments || {},
                        pluginName: args.pluginName,
                        connectorName: args.connectorName,
                      }),
                    });
                    const data = await res.json();
                    return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
                  },
                });
              }
            }
          } catch (discoveryErr) {
            console.warn("[FeexSystems] MCP tool discovery failed:", discoveryErr);
          }

          console.log("[FeexSystems] WebMCP Agentic tools successfully registered with dynamic MCP tool discovery.");
        } catch (error) {
          console.error("[FeexSystems] Failed to register WebMCP tools:", error);
        }
      };

      registerWebMCPTools();
    }
  }, []);
}
