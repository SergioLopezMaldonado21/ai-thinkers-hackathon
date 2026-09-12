export interface AppErrorOptions {
  code: string;
  statusCode: number;
  cause?: unknown;
  data?: unknown;
}

export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly data?: unknown;

  constructor(message: string, options: AppErrorOptions) {
    super(message, { cause: options.cause });
    this.name = new.target.name;
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.data = options.data;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, code = 'VALIDATION_ERROR') {
    super(message, { code, statusCode: 400 });
  }
}

export class NotFoundError extends AppError {
  constructor(message: string, code = 'NOT_FOUND') {
    super(message, { code, statusCode: 404 });
  }
}

export class ConflictError extends AppError {
  constructor(message: string, code = 'CONFLICT') {
    super(message, { code, statusCode: 409 });
  }
}
