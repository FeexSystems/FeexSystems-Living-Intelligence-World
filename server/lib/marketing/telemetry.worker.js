
import { MarketingTelemetryService, } from './telemetry.service';
import { experimentService } from './experiment.service';

// Basic queue using memory. In a real environment, use BullMQ/Redis (already used in the project for other things).
const eventQueue = [];
let isProcessing = false;

export class TelemetryWorker {
  

  constructor( prisma) {;this.prisma = prisma;
    this.service = new MarketingTelemetryService(this.prisma);
  }

  /**
   * Enqueue an event for background processing
   */
   enqueue(event) {
    eventQueue.push(event);
    this.processQueue();
  }

  /**
   * Process the queue in the background
   */
   async processQueue() {
    if (isProcessing || eventQueue.length === 0) return;
    
    isProcessing = true;
    
    try {
      while (eventQueue.length > 0) {
        const batch = eventQueue.splice(0, 10); // Process in batches of 10
        await Promise.allSettled(batch.map(async (event) => {
          // Intercept Experiment Data
          if (event.metadata && (event.metadata ).experimentVariantId) {
            const variantId = (event.metadata ).experimentVariantId;
            const metric = event.eventType === 'qie' ? 'QIE' : 'CLICK';
            const value = (event.metadata ).value || 1;
            
            await experimentService.recordObservation(variantId, metric, value, event.metadata);
          }
          
          return this.service.ingestEvent(event);
        }));
      }
    } catch (error) {
      console.error('Error processing telemetry queue:', error);
    } finally {
      isProcessing = false;
      
      // If new events came in while we were processing, trigger again
      if (eventQueue.length > 0) {
        this.processQueue();
      }
    }
  }
}
