import { useCallback } from 'react';
import { errorService } from '@/lib/errors/service';
import type { AppError } from '@/lib/errors/types';

interface UseErrorHandlerOptions {
  context?: Record<string, any>;
  onError?: (error: AppError) => void;
}

export function useErrorHandler(options: UseErrorHandlerOptions = {}) {
  const handleError = useCallback((error: Error | AppError | unknown) => {
    // Convert unknown error to AppError
    const appError: AppError = error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          code: 'UNKNOWN_ERROR',
          context: options.context,
          timestamp: new Date().toISOString(),
          handled: true
        }
      : {
          name: 'UnknownError',
          message: 'An unknown error occurred',
          code: 'UNKNOWN_ERROR',
          context: options.context,
          timestamp: new Date().toISOString(),
          handled: true
        };

    // Handle error through service
    errorService.handleError(appError);

    // Call optional error callback
    if (options.onError) {
      options.onError(appError);
    }

    return appError;
  }, [options]);

  const withErrorHandling = useCallback(<T extends (...args: any[]) => any>(
    fn: T
  ) => {
    return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
      try {
        return await fn(...args);
      } catch (error) {
        handleError(error);
        throw error;
      }
    };
  }, [handleError]);

  return {
    handleError,
    withErrorHandling
  };
}