import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { EventEmitter } from "events";

import { TelemetryWebSocketService, } from "../../../server/lib/services/telemetry-websocket.service";

describe("TelemetryWebSocketService", () => {
  let mockServer;
  let service;

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
    service = new TelemetryWebSocketService(mockServer );
    expect(mockServer.listenerCount("upgrade")).toBeGreaterThan(0);
  });

  it("broadcasts telemetry frames to active clients", () => {
    service = new TelemetryWebSocketService(mockServer );
    const mockClient = {
      readyState: 1, // OPEN
      send: vi.fn(),
      on: vi.fn(),
      ping: vi.fn(),
    };

    (service ).clients.add(mockClient);

    const testFrame = {
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
