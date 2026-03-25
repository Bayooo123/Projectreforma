export class CrudValidationError extends Error {
  readonly code = 'VALIDATION_ERROR';

  constructor(message: string) {
    super(message);
    this.name = 'CrudValidationError';
  }
}

export class CrudExecutionError extends Error {
  readonly code = 'SERVER_ERROR';

  constructor(message: string) {
    super(message);
    this.name = 'CrudExecutionError';
  }
}
