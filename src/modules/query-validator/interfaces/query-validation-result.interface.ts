export interface ValidationError {
  code: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface QueryCostEstimate {
  bytesProcessed: number;
}

export interface QueryValidationResult {
  isValid: boolean;
  errors?: ValidationError[];
  warnings?: ValidationError[];
  estimatedCost?: QueryCostEstimate;
}
