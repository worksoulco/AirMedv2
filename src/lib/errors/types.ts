export interface AppError extends Error {
  code: string;
  context?: Record<string, any>;
  timestamp: string;
  handled: boolean;
}

export interface ErrorLog {
  id: string;
  error: AppError;
  user?: {
    id: string;
    role: string;
  };
  session?: {
    id: string;
    deviceInfo: Record<string, any>;
  };
  context: {
    url: string;
    action?: string;
    metadata?: Record<string, any>;
  };
  timestamp: string;
}

export type ErrorHandler = (error: AppError) => void | Promise<void>;

export interface ErrorConfig {
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  maxLogs: number;
  reportErrors: boolean;
}