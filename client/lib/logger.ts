/**
 * Structured Logger
 * Task 14: Phase 1, Sprint 3
 *
 * Provides debug/info/warn/error levels with timestamp, context, and environment-based filtering.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  stack?: string;
}

class Logger {
  private static instance: Logger;
  private isDev: boolean;
  private logHistory: LogEntry[] = [];
  private maxHistorySize = 100;

  private constructor() {
    this.isDev = this.checkIsDev();
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private checkIsDev(): boolean {
    if (typeof process !== 'undefined' && process?.env?.NODE_ENV) {
      return process.env.NODE_ENV === 'development';
    }
    if (typeof import.meta !== 'undefined' && import.meta?.env?.DEV) {
      return true;
    }
    return false;
  }

  private shouldLog(level: LogLevel): boolean {
    // In production, only log warn and error
    if (!this.isDev) {
      return level === 'warn' || level === 'error';
    }
    return true;
  }

  private formatLogEntry(level: LogLevel, message: string, context?: Record<string, any>): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
    };
  }

  private addHistory(entry: LogEntry) {
    this.logHistory.push(entry);
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }
  }

  private log(level: LogLevel, message: string, context?: Record<string, any>) {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry = this.formatLogEntry(level, message, context);
    this.addHistory(entry);

    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    const logMethod = this.getConsoleMethod(level);

    logMethod(`[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`);
  }

  private getConsoleMethod(level: LogLevel): (...args: any[]) => void {
    switch (level) {
      case 'debug':
        return console.debug;
      case 'info':
        return console.info;
      case 'warn':
        return console.warn;
      case 'error':
        return console.error;
      default:
        return console.log;
    }
  }

  debug(message: string, context?: Record<string, any>) {
    this.log('debug', message, context);
  }

  info(message: string, context?: Record<string, any>) {
    this.log('info', message, context);
  }

  warn(message: string, context?: Record<string, any>) {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: Record<string, any>) {
    const errorContext = {
      ...context,
      ...(error && {
        errorName: error.name,
        errorMessage: error.message,
        stack: error.stack,
      }),
    };
    this.log('error', message, errorContext);
  }

  // Get log history for debugging
  getHistory(): LogEntry[] {
    return [...this.logHistory];
  }

  // Clear log history
  clearHistory() {
    this.logHistory = [];
  }

  // Set minimum log level
  setMinLevel(_level: LogLevel) {
    // This would filter logs by level, but for now we just use dev/prod env
    // Can be extended to respect a configured minimum level
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Convenience exports
export const logDebug = (message: string, context?: Record<string, any>) => logger.debug(message, context);
export const logInfo = (message: string, context?: Record<string, any>) => logger.info(message, context);
export const logWarn = (message: string, context?: Record<string, any>) => logger.warn(message, context);
export const logError = (message: string, error?: Error, context?: Record<string, any>) => logger.error(message, error, context);
