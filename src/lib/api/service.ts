import { errorService } from '../errors/service';
import { authService } from '../auth/service';
import type { ApiConfig, ApiRequestConfig, ApiResponse, ApiError, ApiCache } from './types';

class ApiService {
  private config: ApiConfig;
  private cache: ApiCache;

  constructor(config: ApiConfig, cache: ApiCache) {
    this.config = config;
    this.cache = cache;
  }

  private async request<T>(config: ApiRequestConfig): Promise<ApiResponse<T>> {
    const { method, path, data, params, headers = {}, timeout, retries, cache } = config;

    // Build URL with query parameters
    const url = new URL(path, this.config.baseUrl);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    // Check cache first if enabled
    if (method === 'GET' && cache) {
      const cacheKey = url.toString();
      const cachedResponse = await this.cache.get(cacheKey);
      if (cachedResponse) {
        return { ...cachedResponse, cached: true };
      }
    }

    // Prepare request
    const requestInit: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...this.config.headers,
        ...headers
      },
      signal: config.signal
    };

    // Add auth token if available
    const user = authService.getCurrentUser();
    if (user) {
      requestInit.headers = {
        ...requestInit.headers,
        'Authorization': `Bearer ${user.id}` // Replace with actual token
      };
    }

    // Add body for non-GET requests
    if (data && method !== 'GET') {
      requestInit.body = JSON.stringify(data);
    }

    // Make request with retries
    const maxRetries = retries ?? this.config.retries;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url.toString(), requestInit, timeout);
        
        // Handle non-2xx responses
        if (!response.ok) {
          throw await this.createApiError(response, config);
        }

        const responseData = await response.json();
        const apiResponse: ApiResponse<T> = {
          data: responseData,
          status: response.status,
          headers: response.headers
        };

        // Cache successful GET requests
        if (method === 'GET' && cache) {
          await this.cache.set(url.toString(), apiResponse);
        }

        return apiResponse;
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry if request was aborted or if it's a 4xx error
        if (error instanceof DOMException && error.name === 'AbortError') {
          throw error;
        }
        if ((error as ApiError).status && (error as ApiError).status < 500) {
          throw error;
        }
        
        // Wait before retrying
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw lastError;
  }

  private async fetchWithTimeout(url: string, init: RequestInit, timeout?: number): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      timeout || this.config.timeout
    );

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async createApiError(response: Response, request: ApiRequestConfig): Promise<ApiError> {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = null;
    }

    const error: ApiError = {
      name: 'ApiError',
      message: errorData?.message || `HTTP Error ${response.status}`,
      code: errorData?.code || `HTTP_${response.status}`,
      status: response.status,
      data: errorData,
      request,
      response
    };

    return error;
  }

  // HTTP method helpers
  async get<T>(path: string, config: Omit<ApiRequestConfig, 'method' | 'path'> = {}) {
    return this.request<T>({ ...config, method: 'GET', path });
  }

  async post<T>(path: string, data?: any, config: Omit<ApiRequestConfig, 'method' | 'path' | 'data'> = {}) {
    return this.request<T>({ ...config, method: 'POST', path, data });
  }

  async put<T>(path: string, data?: any, config: Omit<ApiRequestConfig, 'method' | 'path' | 'data'> = {}) {
    return this.request<T>({ ...config, method: 'PUT', path, data });
  }

  async patch<T>(path: string, data?: any, config: Omit<ApiRequestConfig, 'method' | 'path' | 'data'> = {}) {
    return this.request<T>({ ...config, method: 'PATCH', path, data });
  }

  async delete<T>(path: string, config: Omit<ApiRequestConfig, 'method' | 'path'> = {}) {
    return this.request<T>({ ...config, method: 'DELETE', path });
  }

  // Cache helpers
  async clearCache() {
    await this.cache.clear();
  }

  async invalidateCache(path: string) {
    const url = new URL(path, this.config.baseUrl).toString();
    await this.cache.delete(url);
  }
}

// Simple in-memory cache implementation
class MemoryCache implements ApiCache {
  private cache: Map<string, { response: ApiResponse; expires: number }> = new Map();

  async get(key: string): Promise<ApiResponse | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (entry.expires && entry.expires < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    return entry.response;
  }

  async set(key: string, response: ApiResponse, ttl = 5 * 60 * 1000): Promise<void> {
    this.cache.set(key, {
      response,
      expires: Date.now() + ttl
    });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }
}

// Initialize API service
export const apiService = new ApiService(
  {
    baseUrl: process.env.API_URL || 'https://api.example.com',
    timeout: 30000, // 30 seconds
    retries: 3
  },
  new MemoryCache()
);