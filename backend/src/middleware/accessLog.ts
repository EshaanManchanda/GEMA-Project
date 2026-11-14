import { Request, Response } from "express";

/**
 * morgan `skip` option. nginx already keeps the full access log, so unless request
 * logging is switched on (ENABLE_REQUEST_LOGGING=true, or development) only failed
 * requests (4xx/5xx) are written here, instead of one stdout line per request.
 */
export const accessLogSkip =
  (logAllRequests: boolean) =>
  (_req: Request, res: Response): boolean =>
    !logAllRequests && res.statusCode < 400;
