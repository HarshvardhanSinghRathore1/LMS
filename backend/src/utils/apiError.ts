export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: any;

  constructor(statusCode: number, code: string, message: string, details: any = null) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, code = 'BAD_REQUEST', details: any = null): ApiError {
    return new ApiError(400, code, message, details);
  }

  static unauthorized(message = 'Unauthorized access', code = 'UNAUTHORIZED', details: any = null): ApiError {
    return new ApiError(401, code, message, details);
  }

  static forbidden(message = 'Forbidden action', code = 'FORBIDDEN', details: any = null): ApiError {
    return new ApiError(403, code, message, details);
  }

  static notFound(message = 'Resource not found', code = 'NOT_FOUND', details: any = null): ApiError {
    return new ApiError(404, code, message, details);
  }

  static conflict(message = 'Resource conflict', code = 'CONFLICT', details: any = null): ApiError {
    return new ApiError(409, code, message, details);
  }

  static internal(message = 'Internal server error', code = 'INTERNAL_SERVER_ERROR', details: any = null): ApiError {
    return new ApiError(500, code, message, details);
  }

  static serviceDegraded(message = 'Service unavailable', code = 'SERVICE_DEGRADED', details: any = null): ApiError {
    return new ApiError(503, code, message, details);
  }
}
