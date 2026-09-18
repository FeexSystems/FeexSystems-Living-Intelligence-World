import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "events";
import { Server as HttpServer } from "http";
import { TelemetryWebSocketService, TelemetryStreamFrame } from "../../../server/lib/services/telemetry-websocket.service";

describe("TelemetryWebSocketService", () => {
  let mockServer: any;
  let service: TelemetryWebSocketService;

  beforeEach(() => {
    mockServer = new EventEmitter();
    mockServer.listen = vi.fn();
    mockServer.close = vi.fn();
  });

  afterEach(() => {
    if (service) {
      service.close();
    }
    vi.clearAllMocks();
  });

  it("attaches an upgrade listener to the HTTP server", () => {
    service = new TelemetryWebSocketService(mockServer as HttpServer);
    expect(mockServer.listenerCount("upgrade")).toBeGreaterThan(0);
  });

  it("broadcasts telemetry frames to active clients", () => {
    service = new TelemetryWebSocketService(mockServer as HttpServer);
    const mockClient = {
      readyState: 1, // OPEN
      send: vi.fn(),
      on: vi.fn(),
      ping: vi.fn(),
    };

    (service as any).clients.add(mockClient);

    const testFrame: TelemetryStreamFrame = {
      sequence: 42,
      timestamp: new Date().toISOString(),
      source: "UNIT_TEST",
      metrics: {
        cpuPercent: 10,
        memoryUsageMb: 128,
        activeConnections: 1,
        fpsTarget: 60,
        laserGridFrequency: 440,
        worldModelSyncStatus: "SYNCHRONIZED",
      },
    };

    service.broadcast(testFrame);
    expect(mockClient.send).toHaveBeenCalledWith(JSON.stringify(testFrame));
    expect(service.getClientCount()).toBe(1);
  });
});
