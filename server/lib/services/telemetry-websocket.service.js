 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
import { WebSocketServer, WebSocket } from 'ws';
import { parse } from 'url';



















export class TelemetryWebSocketService {
  
   __init() {this.clients = new Set()}
   __init2() {this.heartbeatTimer = null}
   __init3() {this.telemetryTicker = null}
   __init4() {this.sequenceCounter = 0}

  constructor(server) {;TelemetryWebSocketService.prototype.__init.call(this);TelemetryWebSocketService.prototype.__init2.call(this);TelemetryWebSocketService.prototype.__init3.call(this);TelemetryWebSocketService.prototype.__init4.call(this);
    this.wss = new WebSocketServer({ noServer: true });

    // Attach upgrade handler to HTTP server for path: /telemetry/v1/stream
    server.on('upgrade', (request, socket, head) => {
      const { pathname } = parse(request.url || '');
      if (pathname === '/telemetry/v1/stream') {
        this.wss.handleUpgrade(request, socket, head, (ws) => {
          this.wss.emit('connection', ws, request);
        });
      }
    });

    this.setupConnectionHandlers();
    this.startHeartbeat();
    this.startSyntheticTelemetryTicker();
  }

   setupConnectionHandlers() {
    this.wss.on('connection', (ws) => {
      this.clients.add(ws);

      // Initial welcome handshake packet
      const welcome = {
        sequence: ++this.sequenceCounter,
        timestamp: new Date().toISOString(),
        source: 'FEEX_LIVING_TELEMETRY_ENGINE',
        metrics: {
          cpuPercent: 12.4,
          memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          activeConnections: this.clients.size,
          fpsTarget: 60,
          laserGridFrequency: 440.0,
          worldModelSyncStatus: 'SYNCHRONIZED',
        },
        event: {
          type: 'HEARTBEAT',
          details: { message: 'Grounded Real-Time Telemetry Stream Online' },
        },
      };

      try {
        ws.send(JSON.stringify(welcome));
      } catch (err) {
        console.warn('⚠️ Telemetry initial welcome send failed:', err);
      }

      ws.on('message', (message) => {
        try {
          const parsed = JSON.parse(message.toString());
          if (parsed.type === 'PING') {
            ws.send(JSON.stringify({ type: 'PONG', timestamp: new Date().toISOString() }));
          } else if (parsed.type === 'PROBE_COLLISION') {
            this.broadcast({
              sequence: ++this.sequenceCounter,
              timestamp: new Date().toISOString(),
              source: 'SOVEREIGN_PROBE_COLLISION',
              metrics: {
                cpuPercent: 15.0,
                memoryUsageMb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                activeConnections: this.clients.size,
                fpsTarget: 60,
                laserGridFrequency: 880.0,
                worldModelSyncStatus: 'SYNCHRONIZED',
              },
              event: {
                type: 'PROBE_COLLISION',
                details: parsed.payload,
              },
            });
          }
        } catch (e2) {
          // Ignore invalid frames silently
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
      });

      ws.on('error', (err) => {
        console.warn('⚠️ Telemetry socket error:', err.message);
        this.clients.delete(ws);
      });
    });
  }

   startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      for (const client of this.clients) {
        if (client.readyState === WebSocket.OPEN) {
          try {
            client.ping();
          } catch (e3) {
            this.clients.delete(client);
          }
        }
      }
    }, 30000);
    // Don't keep Vitest workers / Node processes alive on this maintenance timer.
    _optionalChain([(this.heartbeatTimer ), 'access', _ => _.unref, 'optionalCall', _2 => _2()]);
  }

   startSyntheticTelemetryTicker() {
    // Non-blocking procedural cadence stream every 3 seconds
    this.telemetryTicker = setInterval(() => {
      if (this.clients.size === 0) return;
      const memMb = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
      this.broadcast({
        sequence: ++this.sequenceCounter,
        timestamp: new Date().toISOString(),
        source: 'FEEX_EDGE_TELEMETRY',
        metrics: {
          cpuPercent: Number((10 + Math.random() * 8).toFixed(1)),
          memoryUsageMb: memMb,
          activeConnections: this.clients.size,
          fpsTarget: 60,
          laserGridFrequency: Number((440 + Math.sin(Date.now() / 1000) * 20).toFixed(2)),
          worldModelSyncStatus: 'SYNCHRONIZED',
        },
      });
    }, 3000);
    // Don't keep Vitest workers / Node processes alive on this maintenance timer.
    _optionalChain([(this.telemetryTicker ), 'access', _3 => _3.unref, 'optionalCall', _4 => _4()]);
  }

   broadcast(frame) {
    const serialized = JSON.stringify(frame);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(serialized);
        } catch (e) {
          console.warn('⚠️ Failed to broadcast telemetry frame:', e);
        }
      }
    }
  }

   getClientCount() {
    return this.clients.size;
  }

   close() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.telemetryTicker) clearInterval(this.telemetryTicker);
    this.wss.close();
  }
}

export let telemetryWebSocketService = null;

export function initializeTelemetryWebSocket(httpServer) {
  if (!telemetryWebSocketService) {
    telemetryWebSocketService = new TelemetryWebSocketService(httpServer);
    console.log('📡 Telemetry WebSocket Service mounted at /telemetry/v1/stream');
  }
  return telemetryWebSocketService;
}
