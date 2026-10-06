 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { Router } from "express";
import { executeOmniCommand } from "../lib/services/omni-command.service";
import { validateOmniRequest } from "../../shared/orchestration-schema";
import { hardQueryRateLimiter } from "../lib/middleware/production-security";

const router = Router();

router.use(hardQueryRateLimiter);

router.post("/", async (req, res) => {
  try {
    const parsed = validateOmniRequest(req.body);
    if (!parsed.success || !parsed.data) {
      return res.status(400).json({
        success: false,
        error: parsed.error || "Invalid Omni-Command request",
      });
    }

    const result = await executeOmniCommand(parsed.data);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("[omni-command] failed:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Omni-Command failed",
    });
  }
});

router.post("/stream", async (req, res) => {
  const parsed = validateOmniRequest(req.body);
  if (!parsed.success || !parsed.data) {
    return res.status(400).json({
      success: false,
      error: parsed.error || "Invalid Omni-Command request",
    });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  _optionalChain([res, 'access', _ => _.flushHeaders, 'optionalCall', _2 => _2()]);

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const result = await executeOmniCommand(parsed.data, (traceStep) => send("trace", traceStep));
    send("result", result);
  } catch (error) {
    send("error", {
      message: error instanceof Error ? error.message : "Omni-Command stream failed",
    });
  } finally {
    res.end();
  }
});

export default router;
