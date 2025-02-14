import { storage } from '../storage';
import { authService } from '../auth/service';
import type { AppError, ErrorLog, ErrorHandler, ErrorConfig } from './types';

class ErrorService {
  private config: ErrorConfig = {
    logLevel: 'error',
    maxLogs: 100,
    reportErrors: true
  };

  private handlers: Set<ErrorHandler> = new Set();

  constructor() {
    // Set up global error handlers
    window.addEventListener('error', this.handleGlobalError);
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  private handleGlobalError = (event: ErrorEvent) => {
    const error: AppError = {
      name: event.error?.name || 'Error',
      message: event.message,
      code: 'UNCAUGHT_ERROR',
      stack: event.error?.stack,
      timestamp: new Date().toISOString(),
      handled: false
    };

    this.handleError(error);
  };

  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const error: AppError = {
      name: event.reason?.name || 'UnhandledRejection',
      message: event.reason?.message || 'Unhandled Promise rejection',
      code: 'UNHANDLED_REJECTION',
      stack: event.reason?.stack,
      timestamp: new Date().toISOString(),
      handled: false
    };

    this.handleError(error);
  };

  async handleError(error: AppError) {
    try {
      // Create error log
      const log: ErrorLog = {
        id: crypto.randomUUID(),
        error,
        timestamp: new Date().toISOString(),
        context: {
          url: window.location.href,
          metadata: {
            userAgent: navigator.userAgent,
            platform: navigator.platform
          }
        }
      };

      // Add user info if available
      const user = authService.getCurrentUser();
      if (user) {
        log.user = {
          id: user.id,
          role: user.role
        };
      }

      // Save log
      this.saveLog(log);

      // Notify handlers
      for (const handler of this.handlers) {
        try {
          await handler(error);
        } catch (handlerError) {
          console.error('Error handler failed:', handlerError);
        }
      }

      // Report error if enabled
      if (this.config.reportErrors) {
        await this.reportError(log);
      }
    } catch (handlingError) {
      console.error('Failed to handle error:', handlingError);
    }
  }

  private saveLog(log: ErrorLog) {
    const logs = this.getLogs();
    logs.unshift(log);

    // Trim logs if exceeding max
    if (logs.length > this.config.maxLogs) {
      logs.length = this.config.maxLogs;
    }

    storage.set('errorLogs', logs);
  }

  private async reportError(log: ErrorLog) {
    // In a real app, send to error reporting service
    console.error('Error Report:', log);
  }

  getLogs(): ErrorLog[] {
    return storage.get<ErrorLog[]>('errorLogs') || [];
  }

  clearLogs() {
    storage.set('errorLogs', []);
  }

  addHandler(handler: ErrorHandler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  configure(config: Partial<ErrorConfig>) {
    this.config = { ...this.config, ...config };
  }

  createError(message: string, code: string, context?: Record<string, any>): AppError {
    return {
      name: 'AppError',
      message,
      code,
      context,
      timestamp: new Date().toISOString(),
      handled: true
    };
  }
}

export const errorService = new ErrorService();