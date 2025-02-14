export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  headers?: Record<string, string>;
}

export interface ApiRequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  data?: any;
  params?: Record<string, string>;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  cache?: boolean;
  signal?: AbortSignal;
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  headers: Headers;
  cached?: boolean;
}

export interface ApiError extends Error {
  status?: number;
  code: string;
  data?: any;
  request?: ApiRequestConfig;
  response?: Response;
}

export interface ApiCache {
  get(key: string): Promise<ApiResponse | null>;
  set(key: string, response: ApiResponse, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}