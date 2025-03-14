export class SQLGenerationError extends Error {
  constructor(
    message: string,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'SQLGenerationError';
  }
}
