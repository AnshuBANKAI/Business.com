export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const notFound = (what = 'Resource') => new HttpError(404, `${what} not found`);

/** Wrap async route handlers so rejections reach the error middleware (Express 4). */
export const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
