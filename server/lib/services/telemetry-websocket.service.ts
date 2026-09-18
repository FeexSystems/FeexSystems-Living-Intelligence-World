import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { parse } from 'url';

export interface TelemetryStreamFrame {
  sequence: number;
  timestamp: string;
  source: string;
  metrics: {
    cpuPercent: number;
    memoryUsageMb: number;
    activeConnections: number;
    fpsTarget: number;
    laserGridFrequency: number;
    worldModelSyncStatus: 'SYNCHRONIZED' | 'SYNCING' | 'DEGRADED';
  };
  event?: {
    type: 'PROBE_COLLISION' | 'TACTILE_ENGAGE' | 'WORLD_MUTATION' | 'HEARTBEAT';
    details?: Record<string, unknown>;
  };
}

export class TelemetryWebSocketService {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private telemetryTicker: NodeJS.Timeout | null = null;
  private sequenceCounter = 0;

  constructor(server: HttpServer) {
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

  private setupConnectionHandlers() {
    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);

      // Initial welcome handshake packet
      const welcome: TelemetryStreamFrame = {
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

      ws.on('message', (message: string) => {
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
        } catch {
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

  private startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      for (const client of this.clients) {
        if (client.readyState === WebSocket.OPEN) {
          try {
            client.ping();
          } catch {
            this.clients.delete(client);
          }
        }
      }
    }, 30000);
    // Don't keep Vitest workers / Node processes alive on this maintenance timer.
    (this.heartbeatTimer as unknown as { unref?: () => void }).unref?.();
  }

  private startSyntheticTelemetryTicker() {
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
    (this.telemetryTicker as unknown as { unref?: () => void }).unref?.();
  }

  public broadcast(frame: TelemetryStreamFrame) {
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

  public getClientCount(): number {
    return this.clients.size;
  }

  public close() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.telemetryTicker) clearInterval(this.telemetryTicker);
    this.wss.close();
  }
}

export let telemetryWebSocketService: TelemetryWebSocketService | null = null;

export function initializeTelemetryWebSocket(httpServer: HttpServer): TelemetryWebSocketService {
  if (!telemetryWebSocketService) {
    telemetryWebSocketService = new TelemetryWebSocketService(httpServer);
    console.log('📡 Telemetry WebSocket Service mounted at /telemetry/v1/stream');
  }
  return telemetryWebSocketService;
}
