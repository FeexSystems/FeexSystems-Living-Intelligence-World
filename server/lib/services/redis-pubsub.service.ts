/**
 * Redis Pub/Sub Service
 *
 * Provides horizontal scaling for WebSocket state by broadcasting
 * messages across multiple server instances via Redis pub/sub.
 *
 * Falls back to in-memory event emitter when Redis is unavailable.
 */

import { EventEmitter } from 'events';

interface PubSubMessage {
  channel: string;
  payload: unknown;
  origin: string;
  timestamp: number;
}

class RedisPubSubService extends EventEmitter {
  private instanceId: string;
  private redisAvailable = false;
  private subscriptions: Map<string, Set<(payload: unknown) => void>> = new Map();

  constructor() {
    super();
    this.instanceId = `instance-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  /**
   * Publish a message to a channel.
   */
  async publish(channel: string, payload: unknown): Promise<void> {
    const message: PubSubMessage = {
      channel,
      payload,
      origin: this.instanceId,
      timestamp: Date.now(),
    };

    // Try Redis first
    try {
      // Dynamic import to avoid hard dependency
      const { createRedisClient } = await import('../redis');
      const client = createRedisClient();
      if (client && typeof client.publish === 'function') {
        await client.publish(channel, JSON.stringify(message));
        this.redisAvailable = true;
        return;
      }
    } catch {
      this.redisAvailable = false;
    }

    // Fallback: in-memory broadcast
    this.emit(channel, message);
  }

  /**
   * Subscribe to a channel.
   */
  async subscribe(channel: string, handler: (payload: unknown) => void): Promise<() => void> {
    if (!this.subscriptions.has(channel)) {
      this.subscriptions.set(channel, new Set());
    }
    this.subscriptions.get(channel)!.add(handler);

    // Try Redis subscription
    try {
      const { createRedisClient } = await import('../redis');
      const client = createRedisClient();
      if (client && typeof client.subscribe === 'function') {
        await client.subscribe(channel);
        client.on('message', (ch: string, msg: string) => {
          if (ch === channel) {
            try {
              const parsed = JSON.parse(msg) as PubSubMessage;
              if (parsed.origin !== this.instanceId) {
                handler(parsed.payload);
              }
            } catch {
              handler(msg);
            }
          }
        });
        this.redisAvailable = true;
      }
    } catch {
      this.redisAvailable = false;
    }

    // Return unsubscribe function
    return () => {
      const subs = this.subscriptions.get(channel);
      if (subs) {
        subs.delete(handler);
        if (subs.size === 0) {
          this.subscriptions.delete(channel);
        }
      }
    };
  }

  /**
   * Check if Redis is available.
   */
  isRedisAvailable(): boolean {
    return this.redisAvailable;
  }

  /**
   * Get instance ID.
   */
  getInstanceId(): string {
    return this.instanceId;
  }
}

export const redisPubSub = new RedisPubSubService();
export default redisPubSub;
