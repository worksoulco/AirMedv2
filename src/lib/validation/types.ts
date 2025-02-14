export interface ValidationRule<T = any> {
  type: string;
  message: string;
  validate: (value: T, context?: any) => boolean | Promise<boolean>;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  rule: string;
  message: string;
}

export interface ValidationSchema {
  [field: string]: ValidationRule[];
}

export interface ValidationOptions {
  abortEarly?: boolean;
  context?: any;
}