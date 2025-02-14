export type ServiceIdentifier = string | symbol;

export interface ServiceDefinition<T = any> {
  id: ServiceIdentifier;
  factory: () => T;
  dependencies?: ServiceIdentifier[];
  singleton?: boolean;
}

export interface Container {
  register<T>(definition: ServiceDefinition<T>): void;
  get<T>(id: ServiceIdentifier): T;
  has(id: ServiceIdentifier): boolean;
  remove(id: ServiceIdentifier): void;
  clear(): void;
}

export class ServiceNotFoundError extends Error {
  constructor(id: ServiceIdentifier) {
    super(`Service "${String(id)}" not found`);
    this.name = 'ServiceNotFoundError';
  }
}

export class CircularDependencyError extends Error {
  constructor(ids: ServiceIdentifier[]) {
    super(`Circular dependency detected: ${ids.map(String).join(' -> ')}`);
    this.name = 'CircularDependencyError';
  }
}