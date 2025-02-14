import type { Container, ServiceDefinition, ServiceIdentifier } from './types';
import { ServiceNotFoundError, CircularDependencyError } from './types';

export class ServiceContainer implements Container {
  private definitions = new Map<ServiceIdentifier, ServiceDefinition>();
  private instances = new Map<ServiceIdentifier, any>();
  private building = new Set<ServiceIdentifier>();

  register<T>(definition: ServiceDefinition<T>): void {
    this.definitions.set(definition.id, definition);
    // Clear instance if service is re-registered
    this.instances.delete(definition.id);
  }

  get<T>(id: ServiceIdentifier): T {
    // Check for existing instance
    const instance = this.instances.get(id);
    if (instance) {
      return instance;
    }

    const definition = this.definitions.get(id);
    if (!definition) {
      throw new ServiceNotFoundError(id);
    }

    // Check for circular dependencies
    if (this.building.has(id)) {
      throw new CircularDependencyError(Array.from(this.building));
    }

    try {
      this.building.add(id);

      // Resolve dependencies first
      const dependencies = definition.dependencies?.map(depId => this.get(depId)) || [];

      // Create instance
      const instance = definition.factory.apply(null, dependencies);

      // Cache instance if singleton
      if (definition.singleton !== false) {
        this.instances.set(id, instance);
      }

      return instance;
    } finally {
      this.building.delete(id);
    }
  }

  has(id: ServiceIdentifier): boolean {
    return this.definitions.has(id);
  }

  remove(id: ServiceIdentifier): void {
    this.definitions.delete(id);
    this.instances.delete(id);
  }

  clear(): void {
    this.definitions.clear();
    this.instances.clear();
    this.building.clear();
  }
}