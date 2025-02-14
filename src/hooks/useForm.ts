import { useState, useCallback, useEffect } from 'react';
import { validationService } from '@/lib/validation/service';
import type { ValidationSchema, ValidationResult, ValidationError } from '@/lib/validation/types';

interface UseFormOptions<T> {
  initialValues: T;
  validationSchema?: ValidationSchema;
  onSubmit?: (values: T) => void | Promise<void>;
}

interface FormState<T> {
  values: T;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
}

export function useForm<T extends Record<string, any>>({
  initialValues,
  validationSchema,
  onSubmit
}: UseFormOptions<T>) {
  const [state, setState] = useState<FormState<T>>({
    values: initialValues,
    errors: {},
    touched: {},
    isSubmitting: false,
    isValid: true,
    isDirty: false
  });

  // Validate a single field
  const validateField = useCallback(async (name: keyof T, value: any) => {
    if (!validationSchema || !validationSchema[name]) return '';

    const result = await validationService.validate(
      { [name]: value },
      { [name]: validationSchema[name] }
    );

    return result.errors.find(error => error.field === name)?.message || '';
  }, [validationSchema]);

  // Validate all fields
  const validateForm = useCallback(async (values: T): Promise<ValidationResult> => {
    if (!validationSchema) {
      return { valid: true, errors: [] };
    }

    return validationService.validate(values, validationSchema);
  }, [validationSchema]);

  // Handle field change
  const handleChange = useCallback(async (
    name: keyof T,
    value: any,
    shouldValidate = true
  ) => {
    setState(prev => ({
      ...prev,
      values: { ...prev.values, [name]: value },
      isDirty: true
    }));

    if (shouldValidate) {
      const error = await validateField(name, value);
      setState(prev => ({
        ...prev,
        errors: { ...prev.errors, [name]: error }
      }));
    }
  }, [validateField]);

  // Handle field blur
  const handleBlur = useCallback(async (name: keyof T) => {
    setState(prev => ({
      ...prev,
      touched: { ...prev.touched, [name]: true }
    }));

    const error = await validateField(name, state.values[name]);
    setState(prev => ({
      ...prev,
      errors: { ...prev.errors, [name]: error }
    }));
  }, [state.values, validateField]);

  // Handle form submission
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    setState(prev => ({ ...prev, isSubmitting: true }));

    try {
      const validationResult = await validateForm(state.values);

      if (!validationResult.valid) {
        const errors = validationResult.errors.reduce((acc, error) => ({
          ...acc,
          [error.field]: error.message
        }), {});

        setState(prev => ({
          ...prev,
          errors,
          isSubmitting: false,
          isValid: false
        }));

        return;
      }

      if (onSubmit) {
        await onSubmit(state.values);
      }

      setState(prev => ({
        ...prev,
        isSubmitting: false,
        isValid: true,
        isDirty: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        isSubmitting: false,
        isValid: false
      }));
      throw error;
    }
  }, [state.values, validateForm, onSubmit]);

  // Reset form
  const reset = useCallback((newValues = initialValues) => {
    setState({
      values: newValues,
      errors: {},
      touched: {},
      isSubmitting: false,
      isValid: true,
      isDirty: false
    });
  }, [initialValues]);

  // Set field value
  const setFieldValue = useCallback((
    name: keyof T,
    value: any,
    shouldValidate = true
  ) => {
    handleChange(name, value, shouldValidate);
  }, [handleChange]);

  // Set field error
  const setFieldError = useCallback((name: keyof T, error: string) => {
    setState(prev => ({
      ...prev,
      errors: { ...prev.errors, [name]: error }
    }));
  }, []);

  // Set field touched
  const setFieldTouched = useCallback((name: keyof T, isTouched = true) => {
    setState(prev => ({
      ...prev,
      touched: { ...prev.touched, [name]: isTouched }
    }));
  }, []);

  // Set form errors
  const setErrors = useCallback((errors: Record<string, string>) => {
    setState(prev => ({
      ...prev,
      errors
    }));
  }, []);

  // Validate on mount if schema exists
  useEffect(() => {
    if (validationSchema) {
      validateForm(state.values).then(result => {
        if (!result.valid) {
          const errors = result.errors.reduce((acc, error) => ({
            ...acc,
            [error.field]: error.message
          }), {});
          setState(prev => ({
            ...prev,
            errors,
            isValid: false
          }));
        }
      });
    }
  }, [validationSchema]);

  return {
    values: state.values,
    errors: state.errors,
    touched: state.touched,
    isSubmitting: state.isSubmitting,
    isValid: state.isValid,
    isDirty: state.isDirty,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    setFieldValue,
    setFieldError,
    setFieldTouched,
    setErrors,
    validateField,
    validateForm
  };
}