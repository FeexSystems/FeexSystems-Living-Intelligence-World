 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { logError } from '../logging/sentry';

export class APIError extends Error {
  
  
  

  constructor(message, status, code, details) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const handleAPIError = (error) => {
  const status = _optionalChain([error, 'access', _ => _.response, 'optionalAccess', _2 => _2.status]) || 500;
  const data = _optionalChain([error, 'access', _3 => _3.response, 'optionalAccess', _4 => _4.data]) ;
  
  // Create structured error object
  const apiError = new APIError(
    _optionalChain([data, 'optionalAccess', _5 => _5.message]) || error.message || 'An unexpected error occurred',
    status,
    _optionalChain([data, 'optionalAccess', _6 => _6.code]),
    _optionalChain([data, 'optionalAccess', _7 => _7.details])
  );

  // Log to Sentry with context
  logError(apiError, {
    endpoint: _optionalChain([error, 'access', _8 => _8.config, 'optionalAccess', _9 => _9.url]),
    method: _optionalChain([error, 'access', _10 => _10.config, 'optionalAccess', _11 => _11.method]),
    requestData: _optionalChain([error, 'access', _12 => _12.config, 'optionalAccess', _13 => _13.data]),
    responseData: _optionalChain([error, 'access', _14 => _14.response, 'optionalAccess', _15 => _15.data]),
  });

  throw apiError;
};
