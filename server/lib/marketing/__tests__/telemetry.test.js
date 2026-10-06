 var _class;import { describe, it, expect, vi, beforeEach } from "vitest";
import { MarketingTelemetryService } from "../telemetry.service";
import { PrismaClient } from "@prisma/client";

vi.mock("@prisma/client", () => {
  return {
    PrismaClient: (_class = class {constructor() { _class.prototype.__init.call(this); }
      __init() {this.marketingEvent = {
        create: vi.fn(),
        findMany: vi.fn(),
      }}
    }, _class),
  };
});

describe("MarketingTelemetryService", () => {
  let telemetryService;
  let prisma;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = new PrismaClient();
    telemetryService = new MarketingTelemetryService(prisma);
  });

  it("should process and insert valid events", async () => {
    const event = {
      eventType: "content.viewed",
      metadata: { source: "test" },
    };

    await telemetryService.ingestEvent(event);

    expect(prisma.marketingEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          eventType: "content.viewed",
          metadata: { source: "test" },
        }),
      })
    );
  });
});

