 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * Structured Logger
 * Task 14: Phase 1, Sprint 3
 *
 * Provides debug/info/warn/error levels with timestamp, context, and environment-based filtering.
 */











class Logger {
  
  
   __init() {this.logHistory = []}
   __init2() {this.maxHistorySize = 100}

   constructor() {;Logger.prototype.__init.call(this);Logger.prototype.__init2.call(this);
    this.isDev = this.checkIsDev();
  }

  static getInstance() {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

   checkIsDev() {
    if (typeof process !== 'undefined' && _optionalChain([process, 'optionalAccess', _ => _.env, 'optionalAccess', _2 => _2.NODE_ENV])) {
      return process.env.NODE_ENV === 'development';
    }
    if (typeof import.meta !== 'undefined' && _optionalChain([import.meta, 'optionalAccess', _3 => _3.env, 'optionalAccess', _4 => _4.DEV])) {
      return true;
    }
    return false;
  }

   shouldLog(level) {
    // In production, only log warn and error
    if (!this.isDev) {
      return level === 'warn' || level === 'error';
    }
    return true;
  }

   formatLogEntry(level, message, context) {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
    };
  }

   addHistory(entry) {
    this.logHistory.push(entry);
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }
  }

   log(level, message, context) {
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

   getConsoleMethod(level) {
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

  debug(message, context) {
    this.log('debug', message, context);
  }

  info(message, context) {
    this.log('info', message, context);
  }

  warn(message, context) {
    this.log('warn', message, context);
  }

  error(message, error, context) {
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
  getHistory() {
    return [...this.logHistory];
  }

  // Clear log history
  clearHistory() {
    this.logHistory = [];
  }

  // Set minimum log level
  setMinLevel(_level) {
    // This would filter logs by level, but for now we just use dev/prod env
    // Can be extended to respect a configured minimum level
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Convenience exports
export const logDebug = (message, context) => logger.debug(message, context);
export const logInfo = (message, context) => logger.info(message, context);
export const logWarn = (message, context) => logger.warn(message, context);
export const logError = (message, error, context) => logger.error(message, error, context);
