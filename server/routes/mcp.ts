import express from "express";
import { z } from "zod";
import { authMiddleware } from "../lib/middleware/auth.middleware";
import { hardQueryRateLimiter } from "../lib/middleware/production-security";
import { mcpToolRegistry } from "../lib/services/mcp-tool-registry.service";
import { a2aMesh } from "../lib/services/a2a-mesh.service";
import type { PluginDefinition, ConnectorDefinition, PluginConnectorRequest } from "../../shared/mcp-tools";

const router = express.Router();

router.use(authMiddleware);

/** ─── MCP Plugin Management ─────────────────────────────────────────── */

/** GET /mcp/plugins - List all registered plugins */
router.get("/plugins", async (_req, res) => {
  try {
    const plugins = mcpToolRegistry.getAllPlugins();
    res.json({ success: true, data: { plugins, count: plugins.length } });
  } catch (error) {
    console.error("[MCP Routes] List plugins failed:", error);
    res.status(500).json({ success: false, error: "Failed to list plugins" });
  }
});

/** GET /mcp/plugins/:name - Get a specific plugin */
router.get("/plugins/:name", async (req, res) => {
  try {
    const plugin = mcpToolRegistry.getPlugin(req.params.name);
    if (!plugin) {
      return res.status(404).json({ success: false, error: `Plugin ${req.params.name} not found` });
    }
    res.json({ success: true, data: plugin });
  } catch (error) {
    console.error("[MCP Routes] Get plugin failed:", error);
    res.status(500).json({ success: false, error: "Failed to get plugin" });
  }
});

/** POST /mcp/plugins - Register a new plugin */
router.post("/plugins", hardQueryRateLimiter, async (req, res) => {
  try {
    const body = z.object({
      name: z.string().min(1),
      version: z.string().min(1),
      author: z.string().min(1),
      description: z.string().optional(),
      entryPoint: z.string().min(1),
      capabilities: z.array(z.string()),
      configSchema: z.record(z.string(), z.any()).optional(),
      dependencies: z.array(z.string()).optional(),
      hooks: z.any().optional(),
    }).parse(req.body);

    const result = await mcpToolRegistry.registerPlugin(body as PluginDefinition);

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.status(201).json({ success: true, data: { name: body.name } });
  } catch (error) {
    console.error("[MCP Routes] Register plugin failed:", error);
    res.status(500).json({ success: false, error: "Failed to register plugin" });
  }
});

/** DELETE /mcp/plugins/:name - Unregister a plugin */
router.delete("/plugins/:name", async (req, res) => {
  try {
    const result = await mcpToolRegistry.unregisterPlugin(req.params.name);

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json({ success: true, data: { name: req.params.name } });
  } catch (error) {
    console.error("[MCP Routes] Unregister plugin failed:", error);
    res.status(500).json({ success: false, error: "Failed to unregister plugin" });
  }
});

/** ─── MCP Connector Management ──────────────────────────────────────── */

/** GET /mcp/connectors - List all registered connectors */
router.get("/connectors", async (_req, res) => {
  try {
    const connectors = mcpToolRegistry.getAllConnectors();
    res.json({ success: true, data: { connectors, count: connectors.length } });
  } catch (error) {
    console.error("[MCP Routes] List connectors failed:", error);
    res.status(500).json({ success: false, error: "Failed to list connectors" });
  }
});

/** GET /mcp/connectors/:name - Get a specific connector */
router.get("/connectors/:name", async (req, res) => {
  try {
    const connector = mcpToolRegistry.getConnector(req.params.name);
    if (!connector) {
      return res.status(404).json({ success: false, error: `Connector ${req.params.name} not found` });
    }
    res.json({ success: true, data: connector });
  } catch (error) {
    console.error("[MCP Routes] Get connector failed:", error);
    res.status(500).json({ success: false, error: "Failed to get connector" });
  }
});

/** POST /mcp/connectors - Register a new connector */
router.post("/connectors", hardQueryRateLimiter, async (req, res) => {
  try {
    const body = z.object({
      name: z.string().min(1),
      type: z.enum(["database", "api", "file", "message-queue", "custom"]),
      description: z.string().min(1),
      endpoint: z.string().min(1),
      capabilities: z.array(z.string()),
      authConfig: z.any().optional(),
      timeout: z.number().optional(),
      retryConfig: z.any().optional(),
      hooks: z.any().optional(),
    }).parse(req.body);

    const result = await mcpToolRegistry.registerConnector(body as ConnectorDefinition);

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.status(201).json({ success: true, data: { name: body.name } });
  } catch (error) {
    console.error("[MCP Routes] Register connector failed:", error);
    res.status(500).json({ success: false, error: "Failed to register connector" });
  }
});

/** DELETE /mcp/connectors/:name - Unregister a connector */
router.delete("/connectors/:name", async (req, res) => {
  try {
    const result = await mcpToolRegistry.unregisterConnector(req.params.name);

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json({ success: true, data: { name: req.params.name } });
  } catch (error) {
    console.error("[MCP Routes] Unregister connector failed:", error);
    res.status(500).json({ success: false, error: "Failed to unregister connector" });
  }
});

/** ─── MCP Tool Execution ─────────────────────────────────────────────── */

/** GET /mcp/tools - List all available tools (built-in + plugin + connector) */
router.get("/tools", async (_req, res) => {
  try {
    const tools = mcpToolRegistry.listTools();
    res.json({ success: true, data: { tools, count: tools.length } });
  } catch (error) {
    console.error("[MCP Routes] List tools failed:", error);
    res.status(500).json({ success: false, error: "Failed to list tools" });
  }
});

/** GET /mcp/tools/:name - Get a specific tool definition */
router.get("/tools/:name", async (req, res) => {
  try {
    const tool = mcpToolRegistry.getTool(req.params.name);
    if (!tool) {
      return res.status(404).json({ success: false, error: `Tool ${req.params.name} not found` });
    }
    res.json({ success: true, data: tool });
  } catch (error) {
    console.error("[MCP Routes] Get tool failed:", error);
    res.status(500).json({ success: false, error: "Failed to get tool" });
  }
});

/** POST /mcp/tools/execute - Execute a tool via plugin/connector/built-in */
router.post("/tools/execute", hardQueryRateLimiter, async (req, res) => {
  try {
    const body = z.object({
      pluginName: z.string().optional(),
      connectorName: z.string().optional(),
      toolName: z.string().min(1),
      arguments: z.record(z.string(), z.any()),
      userId: z.string().optional(),
      tenantId: z.string().optional(),
    }).parse(req.body);

    const result = await mcpToolRegistry.invokeTool(body as PluginConnectorRequest);

    if (!result.success) {
      return res.status(400).json({ success: false, error: result.error });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("[MCP Routes] Execute tool failed:", error);
    res.status(500).json({ success: false, error: "Failed to execute tool" });
  }
});

/** ─── A2A Agent Discovery via MCP ───────────────────────────────────── */

/** GET /mcp/agents - Discover all agents including plugin/connector-provided ones */
router.get("/agents", async (_req, res) => {
  try {
    const discovery = a2aMesh.discoverAgents();
    res.json({ success: true, data: discovery });
  } catch (error) {
    console.error("[MCP Routes] Discover agents failed:", error);
    res.status(500).json({ success: false, error: "Failed to discover agents" });
  }
});

export default router;