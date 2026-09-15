import { describe, it, expect, vi, beforeEach } from "vitest";
import { MarketingTelemetryService } from "../telemetry.service";
import { PrismaClient } from "@prisma/client";

vi.mock("@prisma/client", () => {
  return {
    PrismaClient: class {
      marketingEvent = {
        create: vi.fn(),
        findMany: vi.fn(),
      };
    },
  };
});

describe("MarketingTelemetryService", () => {
  let telemetryService: MarketingTelemetryService;
  let prisma: any;

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

