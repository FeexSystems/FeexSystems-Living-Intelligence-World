/**
 * Route parameter helpers.
 *
 * Express types `req.params` as `Record<string, string>`, but the server
 * compiles with `noUncheckedIndexedAccess`, which widens every lookup to
 * `string | undefined`. A route declared as `/x/:id` always has `id`, so these
 * helpers narrow once at the boundary instead of sprinkling non-null
 * assertions (or `as string` casts) through every handler.
 */

type ParamsCarrier = { params: Record<string, string | undefined> };

/**
 * Read a required route param.
 *
 * Throws if the param is absent — which can only happen if a handler is
 * mounted on a route that doesn't declare it, i.e. a programming error.
 */
export function param(req: ParamsCarrier, name: string): string {
  const value = req.params[name];
  if (value === undefined) {
    throw new Error(`Missing route parameter: ${name}`);
  }
  return value;
}

/** Read an optional route param. */
export function optionalParam(req: ParamsCarrier, name: string): string | undefined {
  return req.params[name];
}
