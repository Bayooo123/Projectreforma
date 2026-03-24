export class JeqlValidationError extends Error {
  readonly code = 'VALIDATION_ERROR';

  constructor(message: string) {
    super(message);
    this.name = 'JeqlValidationError';
  }
}

export class JeqlCompilationError extends Error {
  readonly code = 'SERVER_ERROR';

  constructor(message: string) {
    super(message);
    this.name = 'JeqlCompilationError';
  }
}
