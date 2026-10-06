/**
 * Structured logger for FeexSystems server.
 * Uses structured JSON in production, readable format in development.
 * Provides requestId correlation context via async storage.
 */

 









function formatEntry(level, args) {
  const [first, ...rest] = args;
  const message = typeof first === 'string' ? first : JSON.stringify(first);
  const meta = rest.length === 1 && typeof rest[0] === 'object' && rest[0] !== null
    ? (rest[0] )
    : rest.length > 0 ? { extra: rest } : {};

  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    service: 'feexsystems-api',
    ...meta,
  };
}

function write(level, entry) {
  const isProd = process.env.NODE_ENV === 'production';
  const output = isProd ? JSON.stringify(entry) : formatDevLog(level, entry);
  if (level === 'error') {
    process.stderr.write(output + '\n');
  } else {
    process.stdout.write(output + '\n');
  }
}

function formatDevLog(level, entry) {
  const colors = {
    debug: '\x1b[36m',  // cyan
    info:  '\x1b[32m',  // green
    warn:  '\x1b[33m',  // yellow
    error: '\x1b[31m',  // red
  };
  const reset = '\x1b[0m';
  const ts = entry.timestamp.substring(11, 23); // HH:MM:SS.mmm
  const rid = entry.requestId ? ` [${entry.requestId}]` : '';
  const { level: _l, message, timestamp: _ts, requestId: _rid, service: _s, ...meta } = entry;
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${colors[level]}[${level.toUpperCase()}]${reset} ${ts}${rid} ${message}${metaStr}`;
}

export const logger = {
  debug: (...args) => write('debug', formatEntry('debug', args)),
  info:  (...args) => write('info',  formatEntry('info',  args)),
  warn:  (...args) => write('warn',  formatEntry('warn',  args)),
  error: (...args) => write('error', formatEntry('error', args)),

  /** Create a child logger with a bound requestId for correlation */
  child: (requestId) => ({
    debug: (...args) => write('debug', { ...formatEntry('debug', args), requestId }),
    info:  (...args) => write('info',  { ...formatEntry('info',  args), requestId }),
    warn:  (...args) => write('warn',  { ...formatEntry('warn',  args), requestId }),
    error: (...args) => write('error', { ...formatEntry('error', args), requestId }),
  }),
};
