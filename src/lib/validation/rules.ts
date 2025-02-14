import { ValidationRule } from './types';

// String Rules
export const required: ValidationRule<any> = {
  type: 'required',
  message: 'This field is required',
  validate: (value) => {
    if (value === null || value === undefined) return false;
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  }
};

export const email: ValidationRule<string> = {
  type: 'email',
  message: 'Invalid email address',
  validate: (value) => {
    if (!value) return true; // Let required handle empty values
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(value);
  }
};

export const minLength = (min: number): ValidationRule<string | any[]> => ({
  type: 'minLength',
  message: `Must be at least ${min} characters`,
  validate: (value) => {
    if (!value) return true;
    return value.length >= min;
  }
});

export const maxLength = (max: number): ValidationRule<string | any[]> => ({
  type: 'maxLength',
  message: `Must be no more than ${max} characters`,
  validate: (value) => {
    if (!value) return true;
    return value.length <= max;
  }
});

export const pattern = (regex: RegExp, message: string): ValidationRule<string> => ({
  type: 'pattern',
  message,
  validate: (value) => {
    if (!value) return true;
    return regex.test(value);
  }
});

// Number Rules
export const min = (min: number): ValidationRule<number> => ({
  type: 'min',
  message: `Must be at least ${min}`,
  validate: (value) => {
    if (value === null || value === undefined) return true;
    return value >= min;
  }
});

export const max = (max: number): ValidationRule<number> => ({
  type: 'max',
  message: `Must be no more than ${max}`,
  validate: (value) => {
    if (value === null || value === undefined) return true;
    return value <= max;
  }
});

export const integer: ValidationRule<number> = {
  type: 'integer',
  message: 'Must be a whole number',
  validate: (value) => {
    if (value === null || value === undefined) return true;
    return Number.isInteger(value);
  }
};

// Date Rules
export const date: ValidationRule<string> = {
  type: 'date',
  message: 'Invalid date',
  validate: (value) => {
    if (!value) return true;
    const date = new Date(value);
    return !isNaN(date.getTime());
  }
};

export const minDate = (min: Date): ValidationRule<string> => ({
  type: 'minDate',
  message: `Must be after ${min.toLocaleDateString()}`,
  validate: (value) => {
    if (!value) return true;
    const date = new Date(value);
    return date >= min;
  }
});

export const maxDate = (max: Date): ValidationRule<string> => ({
  type: 'maxDate',
  message: `Must be before ${max.toLocaleDateString()}`,
  validate: (value) => {
    if (!value) return true;
    const date = new Date(value);
    return date <= max;
  }
});

// Array Rules
export const arrayMinLength = (min: number): ValidationRule<any[]> => ({
  type: 'arrayMinLength',
  message: `Must have at least ${min} items`,
  validate: (value) => {
    if (!Array.isArray(value)) return true;
    return value.length >= min;
  }
});

export const arrayMaxLength = (max: number): ValidationRule<any[]> => ({
  type: 'arrayMaxLength',
  message: `Must have no more than ${max} items`,
  validate: (value) => {
    if (!Array.isArray(value)) return true;
    return value.length <= max;
  }
});

// Custom Rules
export const custom = (
  validate: (value: any, context?: any) => boolean | Promise<boolean>,
  message: string
): ValidationRule => ({
  type: 'custom',
  message,
  validate
});