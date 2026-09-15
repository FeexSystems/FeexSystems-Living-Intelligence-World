import { describe, it, expect, } from 'vitest';
import { handlers, errorHandlers } from './handlers';


describe('MSW Handlers', () => {
  describe('handlers array', () => {
    it('should export handlers array with required endpoints', () => {
      expect(Array.isArray(handlers)).toBe(true);
      expect(handlers.length).toBeGreaterThan(0);
    });

    it('should have auth/login handler', () => {
      const loginHandler = handlers.find(h => 
        h.toString().includes('/api/auth/login')
      );
      expect(loginHandler).toBeDefined();
    });

    it('should have auth/refresh handler', () => {
      const refreshHandler = handlers.find(h =>
        h.toString().includes('/api/auth/refresh')
      );
      expect(refreshHandler).toBeDefined();
    });

    it('should have world-model/projects handler', () => {
      const projectsHandler = handlers.find(h =>
        h.toString().includes('/api/world-model/projects')
      );
      expect(projectsHandler).toBeDefined();
    });

    it('should have world-model/graph handler', () => {
      const graphHandler = handlers.find(h =>
        h.toString().includes('/api/world-model/graph')
      );
      expect(graphHandler).toBeDefined();
    });
  });

  describe('errorHandlers object', () => {
    it('should export errorHandlers object with all error scenarios', () => {
      expect(errorHandlers).toBeDefined();
      expect(errorHandlers.auth401).toBeDefined();
      expect(errorHandlers.auth403).toBeDefined();
      expect(errorHandlers.server500).toBeDefined();
      expect(errorHandlers.timeout).toBeDefined();
    });

    it('auth401 should be an http handler', () => {
      expect(errorHandlers.auth401).toBeDefined();
      // Check it's an http handler (has resolver methods)
      expect(typeof errorHandlers.auth401).toBe('object');
    });

    it('auth403 should be an http handler', () => {
      expect(errorHandlers.auth403).toBeDefined();
      expect(typeof errorHandlers.auth403).toBe('object');
    });

    it('server500 should be an http handler', () => {
      expect(errorHandlers.server500).toBeDefined();
      expect(typeof errorHandlers.server500).toBe('object');
    });

    it('timeout should be an http handler', () => {
      expect(errorHandlers.timeout).toBeDefined();
      expect(typeof errorHandlers.timeout).toBe('object');
    });
  });
});
