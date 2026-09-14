import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { globalErrorHandler, captureException, captureMessage } from '@/lib/error-handler';

// Mock console methods
const originalConsole = {
  error: console.error,
  log: console.log,
  group: console.group,
  groupEnd: console.groupEnd,
};

beforeEach(() => {
  console.error = vi.fn();
  console.log = vi.fn();
  console.group = vi.fn();
  console.groupEnd = vi.fn();
  
  // Clear error queue
  globalErrorHandler.clearErrorQueue();
  
  // Mock localStorage
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    },
    writable: true,
  });
});

afterEach(() => {
  Object.assign(console, originalConsole);
  vi.clearAllMocks();
});

describe('GlobalErrorHandler', () => {
  describe('Initialization', () => {
    it('should initialize event listeners', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      
      globalErrorHandler.initialize();
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('error', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('error', expect.any(Function), true);
    });

    it('should not initialize twice', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      
      globalErrorHandler.initialize();
      globalErrorHandler.initialize(); // Second call should be ignored
      
      // Should only be called once for each event type
      expect(addEventListenerSpy).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Reporting', () => {
    it('should report errors with correct structure', () => {
      const error = new Error('Test error');
      
      globalErrorHandler.reportError({
        message: error.message,
        stack: error.stack,
        type: 'javascript',
      });
      
      const errorQueue = globalErrorHandler.getErrorQueue();
      expect(errorQueue).toHaveLength(1);
      
      const reportedError = errorQueue[0];
      expect(reportedError).toMatchObject({
        message: 'Test error',
        type: 'javascript',
        errorId: expect.stringMatching(/^error-\d+-[a-z0-9]+$/),
        timestamp: expect.any(String),
        userAgent: expect.any(String),
        url: expect.any(String),
      });
    });

    it('should generate unique error IDs', () => {
      globalErrorHandler.reportError({ message: 'Error 1' });
      globalErrorHandler.reportError({ message: 'Error 2' });
      
      const errorQueue = globalErrorHandler.getErrorQueue();
      expect(errorQueue[0].errorId).not.toBe(errorQueue[1].errorId);
    });

    it('should include user ID when available', () => {
      // Mock localStorage with auth data
      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify({
        user: { id: 'user-123' },
      }));
      
      globalErrorHandler.reportError({ message: 'Test error' });
      
      const errorQueue = globalErrorHandler.getErrorQueue();
      expect(errorQueue[0].userId).toBe('user-123');
    });

    it('should handle missing user ID gracefully', () => {
      vi.mocked(localStorage.getItem).mockReturnValue(null);
      
      globalErrorHandler.reportError({ message: 'Test error' });
      
      const errorQueue = globalErrorHandler.getErrorQueue();
      expect(errorQueue[0].userId).toBeUndefined();
    });
  });

  describe('Unhandled Promise Rejections', () => {
    it('should handle unhandled promise rejections', () => {
      const error = new Error('Promise rejection');
      const event = new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.reject(error),
        reason: error,
      });
      
      window.dispatchEvent(event);
      
      const errorQueue = globalErrorHandler.getErrorQueue();
      expect(errorQueue).toHaveLength(1);
      expect(errorQueue[0]).toMatchObject({
        message: 'Promise rejection',
        type: 'promise',
      });
    });

    it('should handle non-Error promise rejections', () => {
      const event = new PromiseRejectionEvent('unhandledrejection', {
        promise: Promise.reject('String rejection'),
        reason: 'String rejection',
      });
      
      window.dispatchEvent(event);
      
      const errorQueue = globalErrorHandler.getErrorQueue();
      expect(errorQueue).toHaveLength(1);
      expect(errorQueue[0]).toMatchObject({
        message: 'String rejection',
        type: 'promise',
      });
    });
  });

  describe('JavaScript Errors', () => {
    it('should handle JavaScript errors', () => {
      const error = new Error('JavaScript error');
      const event = new ErrorEvent('error', {
        message: 'JavaScript error',
        filename: 'test.js',
        lineno: 10,
        colno: 5,
        error: error,
      });
      
      window.dispatchEvent(event);
      
      const errorQueue = globalErrorHandler.getErrorQueue();
      expect(errorQueue).toHaveLength(1);
      expect(errorQueue[0]).toMatchObject({
        message: 'JavaScript error',
        type: 'javascript',
        additionalContext: {
          filename: 'test.js',
          lineno: 10,
          colno: 5,
        },
      });
    });
  });

  describe('Resource Loading Errors', () => {
    it('should handle resource loading errors', () => {
      const img = document.createElement('img');
      img.src = 'https://example.com/image.jpg';
      
      const event = new Event('error');
      Object.defineProperty(event, 'target', { value: img });
      
      window.dispatchEvent(event);
      
      const errorQueue = globalErrorHandler.getErrorQueue();
      expect(errorQueue).toHaveLength(1);
      expect(errorQueue[0]).toMatchObject({
        message: 'Failed to load resource: https://example.com/image.jpg',
        type: 'network',
        additionalContext: {
          tagName: 'IMG',
          src: 'https://example.com/image.jpg',
        },
      });
    });

    it('should ignore non-resource errors', () => {
      const event = new Event('error');
      Object.defineProperty(event, 'target', { value: window });
      
      window.dispatchEvent(event);
      
      const errorQueue = globalErrorHandler.getErrorQueue();
      expect(errorQueue).toHaveLength(0);
    });
  });

  describe('Manual Error Capture', () => {
    it('should capture exceptions manually', () => {
      const error = new Error('Manual error');
      const context = { component: 'TestComponent' };
      
      globalErrorHandler.captureException(error, context);
      
      const errorQueue = globalErrorHandler.getErrorQueue();
      expect(errorQueue).toHaveLength(1);
      expect(errorQueue[0]).toMatchObject({
        message: 'Manual error',
        type: 'javascript',
        additionalContext: context,
      });
    });

    it('should capture messages manually', () => {
      const message = 'Custom message';
      const context = { level: 'warning' };
      
      globalErrorHandler.captureMessage(message, 'validation', context);
      
      const errorQueue = globalErrorHandler.getErrorQueue();
      expect(errorQueue).toHaveLength(1);
      expect(errorQueue[0]).toMatchObject({
        message: 'Custom message',
        type: 'validation',
        additionalContext: context,
      });
    });
  });

  describe('Convenience Functions', () => {
    it('should provide captureException convenience function', () => {
      const error = new Error('Convenience error');
      
      captureException(error, { source: 'test' });
      
      const errorQueue = globalErrorHandler.getErrorQueue();
      expect(errorQueue).toHaveLength(1);
      expect(errorQueue[0].message).toBe('Convenience error');
    });

    it('should provide captureMessage convenience function', () => {
      captureMessage('Convenience message', 'network');
      
      const errorQueue = globalErrorHandler.getErrorQueue();
      expect(errorQueue).toHaveLength(1);
      expect(errorQueue[0]).toMatchObject({
        message: 'Convenience message',
        type: 'network',
      });
    });
  });

  describe('Error Queue Management', () => {
    it('should maintain error queue', () => {
      globalErrorHandler.reportError({ message: 'Error 1' });
      globalErrorHandler.reportError({ message: 'Error 2' });
      
      const errorQueue = globalErrorHandler.getErrorQueue();
      expect(errorQueue).toHaveLength(2);
      expect(errorQueue[0].message).toBe('Error 1');
      expect(errorQueue[1].message).toBe('Error 2');
    });

    it('should clear error queue', () => {
      globalErrorHandler.reportError({ message: 'Error 1' });
      globalErrorHandler.reportError({ message: 'Error 2' });
      
      expect(globalErrorHandler.getErrorQueue()).toHaveLength(2);
      
      globalErrorHandler.clearErrorQueue();
      
      expect(globalErrorHandler.getErrorQueue()).toHaveLength(0);
    });
  });

  describe('Local Storage Fallback', () => {
    it('should store errors locally when API fails', async () => {
      // Mock fetch to fail
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      
      globalErrorHandler.reportError({ message: 'Test error' });
      
      // Wait for async operation
      await new Promise(resolve => setTimeout(resolve, 0));
      
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'pending-error-reports',
        expect.stringContaining('"message":"Test error"')
      );
    });

    it('should limit stored errors to 10', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      
      // Mock existing errors in localStorage
      const existingErrors = Array.from({ length: 10 }, (_, i) => ({
        message: `Existing error ${i}`,
        errorId: `error-${i}`,
      }));
      
      vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(existingErrors));
      
      globalErrorHandler.reportError({ message: 'New error' });
      
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const setItemCall = vi.mocked(localStorage.setItem).mock.calls.find(
        call => call[0] === 'pending-error-reports'
      );
      
      expect(setItemCall).toBeDefined();
      const storedErrors = JSON.parse(setItemCall[1]);
      expect(storedErrors).toHaveLength(10);
      expect(storedErrors[9].message).toBe('New error');
    });
  });

  describe('Development vs Production', () => {
    it('should log detailed errors in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      globalErrorHandler.reportError({ message: 'Dev error' });
      
      expect(console.group).toHaveBeenCalledWith('🚨 Global Error Report');
      expect(console.error).toHaveBeenCalledWith('Error ID:', expect.any(String));
      expect(console.groupEnd).toHaveBeenCalled();
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should not log detailed errors in production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      globalErrorHandler.reportError({ message: 'Prod error' });
      
      expect(console.group).not.toHaveBeenCalled();
      
      process.env.NODE_ENV = originalEnv;
    });
  });
});