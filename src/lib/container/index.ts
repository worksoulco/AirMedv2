import { ServiceContainer } from './container';
import type { Container, ServiceDefinition, ServiceIdentifier } from './types';
export * from './types';

// Create global container instance
export const container = new ServiceContainer();

// Service decorator
export function Service(options: Partial<Omit<ServiceDefinition, 'factory'>> = {}) {
  return function (target: any) {
    container.register({
      id: options.id || target.name,
      factory: () => new target(),
      dependencies: options.dependencies,
      singleton: options.singleton
    });
  };
}

// Inject decorator
export function Inject(id: ServiceIdentifier) {
  return function (target: any, propertyKey: string) {
    Object.defineProperty(target, propertyKey, {
      get: () => container.get(id),
      enumerable: true,
      configurable: true
    });
  };
}