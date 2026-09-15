// Export all services
export * from './user.service';
export * from './session.service';
export * from './auth.service';
export * from './ai.service';
export * from './ai-registry.service';
export * from './ai-request.service';
export * from './ai-queue.service';
export * from './ai-provider.service';
export * from './ai-analytics.service';
export * from './ai-websocket.service';
export * from './security.service';
export * from './security-scanner-registry.service';
export * from './security-scan-request.service';
export * from './security-scan-queue.service';
export * from './security-scan-processor.service';
export * from './cve-database.service';

// Service factory for dependency injection
import { PrismaClient } from '@prisma/client';
import { UserService } from './user.service';
import { SessionService } from './session.service';
import { AuthService } from './auth.service';

export class ServiceFactory {
  
  
  
  
  

   constructor() {
    this.prisma = new PrismaClient();
    this.userService = new UserService(this.prisma);
    this.sessionService = new SessionService(this.prisma);
    this.authService = new AuthService(this.prisma);
  }

  static getInstance() {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory();
    }
    return ServiceFactory.instance;
  }

  getUserService() {
    return this.userService;
  }

  getSessionService() {
    return this.sessionService;
  }

  getAuthService() {
    return this.authService;
  }

  getPrisma() {
    return this.prisma;
  }

  async disconnect() {
    await this.prisma.$disconnect();
  }
}

// Convenience function to get services
export function getServices() {
  const factory = ServiceFactory.getInstance();
  return {
    userService: factory.getUserService(),
    sessionService: factory.getSessionService(),
    authService: factory.getAuthService(),
    prisma: factory.getPrisma(),
  };
}