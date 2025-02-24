export class BigQueryExecutionError extends Error {
  constructor(
    message: string,
    public readonly query: string,
    public readonly originalError: Error
  ) {
    super(message);
    this.name = 'BigQueryExecutionError';
  }
} 