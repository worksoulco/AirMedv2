import { useState, useCallback } from 'react';
import { validationService } from '@/lib/validation/service';
import type { ValidationSchema, ValidationResult } from '@/lib/validation/types';

interface UseValidationOptions {
  schema: ValidationSchema;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  abortEarly?: boolean;
}

export function useValidation<T extends Record<string, any>>({
  schema,
  validateOnChange = true,
  validateOnBlur = true,
  abortEarly = false
}: UseValidationOptions) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);

  const validateField = useCallback(async (name: keyof T, value: any) => {
    if (!schema[name]) return '';

    setIsValidating(true);
    try {
      const result = await validationService.validate(
        { [name]: value },
        { [name]: schema[name] },
        { abortEarly }
      );

      const error = result.errors.find(e => e.field === name)?.message || '';
      setErrors(prev => ({ ...prev, [name]: error }));
      return error;
    } finally {
      setIsValidating(false);
    }
  }, [schema, abortEarly]);

  const validateAll = useCallback(async (values: T): Promise<ValidationResult> => {
    setIsValidating(true);
    try {
      const result = await validationService.validate(values, schema, { abortEarly });
      
      const newErrors = result.errors.reduce((acc, error) => ({
        ...acc,
        [error.field]: error.message
      }), {});
      
      setErrors(newErrors);
      return result;
    } finally {
      setIsValidating(false);
    }
  }, [schema, abortEarly]);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const setFieldError = useCallback((field: string, message: string) => {
    setErrors(prev => ({ ...prev, [field]: message }));
  }, []);

  return {
    errors,
    isValidating,
    validateField,
    validateAll,
    clearErrors,
    setFieldError
  };
}