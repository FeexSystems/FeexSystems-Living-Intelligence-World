import { describe, it, expect, vi } from 'vitest';
import { asyncHandler } from './async-handler';
import type { Request, Response } from 'express';

function mockRes(): Response {
  const res: any = {
    headersSent: false,
    statusCode: 200,
    json: vi.fn(),
    status: vi.fn(function (this: any, code: number) {
      this.statusCode = code;
      return this;
    }),
    end: vi.fn(),
  };
  return res as Response;
}

describe('asyncHandler', () => {
  it('resolves normally when the handler succeeds', async () => {
    const res = mockRes();
    const handler = vi.fn().mockResolvedValue(undefined);
    const wrapped = asyncHandler(handler) as any;

    await wrapped({} as Request, res, vi.fn());

    expect(handler).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 500 with the error message when the handler throws', async () => {
    const res = mockRes();
    const wrapped = asyncHandler(async () => {
      throw new Error('database down');
    }, { fallbackMessage: 'Boom failed' }) as any;

    await wrapped({} as Request, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'database down' });
  });

  it('uses the fallback message for non-Error throws', async () => {
    const res = mockRes();
    const wrapped = asyncHandler(async () => {
      throw 'just a string';
    }, { fallbackMessage: 'Boom failed' }) as any;

    await wrapped({} as Request, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Boom failed' });
  });

  it('uses a custom status code when configured', async () => {
    const res = mockRes();
    const wrapped = asyncHandler(async () => {
      throw new Error('upstream failed');
    }, { status: 502 }) as any;

    await wrapped({} as Request, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(502);
  });

  it('does not write a response when headers were already sent', async () => {
    const res = mockRes();
    (res as any).headersSent = true;
    const wrapped = asyncHandler(async () => {
      throw new Error('late failure');
    }) as any;

    await wrapped({} as Request, res, vi.fn());

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(res.end).toHaveBeenCalled();
  });
});
