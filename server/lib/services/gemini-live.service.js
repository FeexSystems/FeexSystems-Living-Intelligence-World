













export class GeminiLiveSessionManager {constructor() { GeminiLiveSessionManager.prototype.__init.call(this); }
   __init() {this.activeSessions = new Map



()}

  /**
   * Register a new client socket for Gemini Live streaming
   */
  registerSession(socket, config) {
    const sessionId = socket.id;
    this.activeSessions.set(sessionId, {
      socket,
      startTime: Date.now(),
      bytesStreamed: 0,
    });

    socket.emit('live:ready', {
      sessionId,
      provider: 'World Model Live Stream',
      sampleRate: 24000,
      timestamp: new Date().toISOString(),
    });

    // Handle inbound real-time audio chunk from client microphone
    socket.on('live:audio_chunk', (chunk) => {
      const session = this.activeSessions.get(sessionId);
      if (session) {
        session.bytesStreamed += chunk.byteLength || 0;
        // In full deployment with Gemini Live WebSocket proxy, this routes to BidiStream
        // Echo simulated acknowledgment
        socket.emit('live:audio_ack', { bytesReceived: chunk.byteLength });
      }
    });

    // Handle user interruption
    socket.on('live:interrupt', () => {
      socket.emit('live:interrupted', { timestamp: Date.now() });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      this.activeSessions.delete(sessionId);
    });
  }

  getActiveSessionCount() {
    return this.activeSessions.size;
  }
}

export const geminiLiveManager = new GeminiLiveSessionManager();
