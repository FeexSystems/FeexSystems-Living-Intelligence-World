/**
 * Telemetry client for first-party instrumentation.
 */
export interface MarketingEvent {
  worldModelProjectId?: string;
  productId?: string;
  assetId?: string;
  campaignId?: string;
  channelId?: string;
  eventType: string;
  metadata?: Record<string, unknown>;
}

class TelemetryClient {
  private endpoint = '/api/marketing/telemetry/events';
  
  // Use a local queue for batching to reduce network requests
  private queue: MarketingEvent[] = [];
  private isProcessing = false;
  
  /**
   * Track an event
   */
  public track(event: MarketingEvent) {
    this.queue.push(event);
    
    // Fire off asynchronously, batched processing could be implemented here
    // For now we just process them individually but keep the queue structure 
    // for future enhancements
    this.processQueue();
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;
    
    const maxRetries = 3;
    
    try {
      while (this.queue.length > 0) {
        const event = this.queue.shift();
        if (!event) continue;

        let retries = 0;
        let success = false;
        
        while (retries < maxRetries && !success) {
          try {
            const res = await fetch(this.endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(event),
              // Use keepalive for page unload scenarios
              keepalive: true 
            });
            
            if (res.ok) {
              success = true;
            } else {
              retries++;
              await new Promise(r => setTimeout(r, 1000 * retries)); // Exponential-ish backoff
            }
          } catch (e) {
            retries++;
            await new Promise(r => setTimeout(r, 1000 * retries));
          }
        }
        
        if (!success) {
          console.warn('Failed to send telemetry event after multiple retries', event);
        }
      }
    } finally {
      this.isProcessing = false;
      if (this.queue.length > 0) {
        setTimeout(() => this.processQueue(), 500);
      }
    }
  }
}

export const telemetry = new TelemetryClient();
