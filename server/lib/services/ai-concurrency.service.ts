/**
 * AI Concurrency Control Service
 *
 * Implements circuit breakers and semaphores for AI provider calls
 * to prevent cascading failures under burst traffic.
 *
 * Patterns:
 * - Circuit Breaker: Opens after N consecutive failures, half-opens after timeout
 * - Semaphore: Limits concurrent in-flight requests per provider
 * - Bulkhead: Isolates provider failures from each other
 */

export type CircuitState = 'closed' | 'open' | 'half-open';

interface CircuitBreakerConfig {
  failureThreshold: number;      // failures before opening
  resetTimeoutMs: number;        // time before half-open
  halfOpenMaxAttempts: number;   // attempts in half-open before closing
}

interface ProviderState {
  state: CircuitState;
  failures: number;
  lastFailure: number;
  halfOpenAttempts: number;
  lastStateChange: number;
}

interface Semaphore {
  maxConcurrent: number;
  current: number;
  queue: Array<{ resolve: () => void; reject: (e: Error) => void }>;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 30_000,
  halfOpenMaxAttempts: 3,
};

export class AIConcurrencyService {
  private circuits: Map<string, ProviderState> = new Map();
  private semaphores: Map<string, Semaphore> = new Map();
  private config: CircuitBreakerConfig;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get or create circuit breaker state for a provider.
   */
  private getCircuit(provider: string): ProviderState {
    if (!this.circuits.has(provider)) {
      this.circuits.set(provider, {
        state: 'closed',
        failures: 0,
        lastFailure: 0,
        halfOpenAttempts: 0,
        lastStateChange: Date.now(),
      });
    }
    return this.circuits.get(provider)!;
  }

  /**
   * Get or create semaphore for a provider.
   */
  private getSemaphore(provider: string, maxConcurrent = 10): Semaphore {
    if (!this.semaphores.has(provider)) {
      this.semaphores.set(provider, {
        maxConcurrent,
        current: 0,
        queue: [],
      });
    }
    return this.semaphores.get(provider)!;
  }

  /**
   * Check if a provider circuit is open (blocking calls).
   */
  isOpen(provider: string): boolean {
    const circuit = this.getCircuit(provider);
    if (circuit.state === 'open') {
      const elapsed = Date.now() - circuit.lastStateChange;
      if (elapsed >= this.config.resetTimeoutMs) {
        circuit.state = 'half-open';
        circuit.halfOpenAttempts = 0;
        circuit.lastStateChange = Date.now();
        return false;
      }
      return true;
    }
    return false;
  }

  /**
   * Acquire a slot for a provider (semaphore).
   * Returns a release function.
   */
  async acquire(provider: string, maxConcurrent = 10): Promise<() => void> {
    const sem = this.getSemaphore(provider, maxConcurrent);

    if (sem.current < sem.maxConcurrent) {
      sem.current++;
      return () => this.release(provider);
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        const idx = sem.queue.findIndex(q => q.resolve === resolve);
        if (idx !== -1) sem.queue.splice(idx, 1);
        reject(new Error(`Concurrency limit exceeded for provider: ${provider}`));
      }, 30_000);

      sem.queue.push({
        resolve: () => {
          clearTimeout(timeout);
          sem.current++;
          resolve(() => this.release(provider));
        },
        reject: (e: Error) => {
          clearTimeout(timeout);
          reject(e);
        },
      });
    });
  }

  /**
   * Release a slot for a provider.
   */
  private release(provider: string): void {
    const sem = this.semaphores.get(provider);
    if (!sem) return;
    sem.current = Math.max(0, sem.current - 1);
    const next = sem.queue.shift();
    if (next) {
      next.resolve();
    }
  }

  /**
   * Record a successful call for a provider.
   */
  recordSuccess(provider: string): void {
    const circuit = this.getCircuit(provider);
    if (circuit.state === 'half-open') {
      circuit.halfOpenAttempts++;
      if (circuit.halfOpenAttempts >= this.config.halfOpenMaxAttempts) {
        circuit.state = 'closed';
        circuit.failures = 0;
        circuit.halfOpenAttempts = 0;
        circuit.lastStateChange = Date.now();
      }
    } else {
      circuit.failures = 0;
    }
  }

  /**
   * Record a failed call for a provider.
   */
  recordFailure(provider: string): void {
    const circuit = this.getCircuit(provider);
    circuit.failures++;
    circuit.lastFailure = Date.now();

    if (circuit.state === 'half-open') {
      circuit.state = 'open';
      circuit.lastStateChange = Date.now();
    } else if (circuit.failures >= this.config.failureThreshold) {
      circuit.state = 'open';
      circuit.lastStateChange = Date.now();
    }
  }

  /**
   * Execute a function with concurrency control and circuit breaker.
   */
  async execute<T>(
    provider: string,
    fn: () => Promise<T>,
    maxConcurrent = 10
  ): Promise<T> {
    if (this.isOpen(provider)) {
      throw new Error(`Circuit breaker open for provider: ${provider}`);
    }

    const release = await this.acquire(provider, maxConcurrent);
    try {
      const result = await fn();
      this.recordSuccess(provider);
      return result;
    } catch (error) {
      this.recordFailure(provider);
      throw error;
    } finally {
      release();
    }
  }

  /**
   * Get status of all circuits.
   */
  getStatus(): Record<string, { state: CircuitState; failures: number; inFlight: number; queued: number }> {
    const status: Record<string, any> = {};
    for (const [provider, circuit] of this.circuits) {
      const sem = this.semaphores.get(provider);
      status[provider] = {
        state: circuit.state,
        failures: circuit.failures,
        inFlight: sem?.current ?? 0,
        queued: sem?.queue.length ?? 0,
      };
    }
    return status;
  }

  /**
   * Reset a specific circuit.
   */
  reset(provider: string): void {
    this.circuits.delete(provider);
    this.semaphores.delete(provider);
  }

  /**
   * Reset all circuits.
   */
  resetAll(): void {
    this.circuits.clear();
    this.semaphores.clear();
  }
}

// Singleton instance
export const aiConcurrencyService = new AIConcurrencyService();
export default aiConcurrencyService;
