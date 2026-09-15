
import { ZodError } from 'zod';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ErrorType, errorHandler, notFoundHandler } from '../error.middleware';

// Mock request and response objects
function createMockRequest(overrides = {}) {
  return {
    method: 'GET',
    url: '/test',
    ip: '127.0.0.1',
    ...overrides
  };
}

function createMockResponse() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis()
  };
  return res;
}

describe('Error Middleware', () => {
  describe('errorHandler', () => {
    it('should handle ZodError with validation details', () => {
      const error = new ZodError([
        { code: 'invalid_type', path: ['email'], message: 'Invalid email' }
      ]);
      const req = createMockRequest() ;
      const res = createMockResponse() ;
      const next = vi.fn();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          type: ErrorType.VALIDATION_ERROR,
          code: 'VALIDATION_FAILED',
          details: error.errors
        })
      });
    });

    it('should handle PrismaClientKnownRequestError for unique constraint violation', () => {
      const error = new PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.0.0',
        meta: { target: ['email'] }
      });
      const req = createMockRequest() ;
      const res = createMockResponse() ;
      const next = vi.fn();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          type: ErrorType.VALIDATION_ERROR,
          code: 'UNIQUE_CONSTRAINT_VIOLATION',
          details: { fields: ['email'] }
        })
      });
    });

    it('should handle PrismaClientKnownRequestError for not found records', () => {
      const error = new PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '5.0.0',
        meta: {}
      });
      const req = createMockRequest() ;
      const res = createMockResponse() ;
      const next = vi.fn();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          type: ErrorType.NOT_FOUND_ERROR,
          code: 'RECORD_NOT_FOUND'
        })
      });
    });

    it('should handle auth errors', () => {
      const error = Object.assign(new Error('Invalid token'), {
        name: 'AuthError',
        code: 'INVALID_TOKEN'
      });
      const req = createMockRequest() ;
      const res = createMockResponse() ;
      const next = vi.fn();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          type: ErrorType.AUTHENTICATION_ERROR,
          code: 'INVALID_TOKEN'
        })
      });
    });

    it('should handle unknown errors as internal server errors', () => {
      const error = new Error('Something went wrong');
      const req = createMockRequest() ;
      const res = createMockResponse() ;
      const next = vi.fn();

      errorHandler(error, req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          type: ErrorType.INTERNAL_SERVER_ERROR,
          code: 'INTERNAL_ERROR'
        })
      });
    });
  });

  describe('notFoundHandler', () => {
    it('should handle 404 errors', () => {
      const req = createMockRequest() ;
      const res = createMockResponse() ;

      notFoundHandler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: expect.objectContaining({
          type: ErrorType.NOT_FOUND_ERROR,
          code: 'RESOURCE_NOT_FOUND'
        })
      });
    });
  });
});
