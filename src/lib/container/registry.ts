import { container } from './index';
import { authService } from '../auth/service';
import { chatService } from '../chat/service';
import { deviceService } from '../devices/service';
import { errorService } from '../errors/service';
import { eventService } from '../events';
import { notificationService } from '../notifications/service';
import { searchService } from '../search/service';
import { storageService } from '../storage';
import { syncService } from '../sync/service';
import { validationService } from '../validation/service';
import { wsService } from '../websocket/service';

// Register core services
container.register({
  id: 'auth',
  factory: () => authService,
  singleton: true
});

container.register({
  id: 'chat',
  factory: () => chatService,
  dependencies: ['auth', 'websocket', 'storage', 'notifications'],
  singleton: true
});

container.register({
  id: 'devices',
  factory: () => deviceService,
  dependencies: ['events', 'storage'],
  singleton: true
});

container.register({
  id: 'errors',
  factory: () => errorService,
  singleton: true
});

container.register({
  id: 'events',
  factory: () => eventService,
  singleton: true
});

container.register({
  id: 'notifications',
  factory: () => notificationService,
  dependencies: ['storage', 'errors'],
  singleton: true
});

container.register({
  id: 'search',
  factory: () => searchService,
  dependencies: ['storage'],
  singleton: true
});

container.register({
  id: 'storage',
  factory: () => storageService,
  singleton: true
});

container.register({
  id: 'sync',
  factory: () => syncService,
  dependencies: ['events', 'storage'],
  singleton: true
});

container.register({
  id: 'validation',
  factory: () => validationService,
  singleton: true
});

container.register({
  id: 'websocket',
  factory: () => wsService,
  dependencies: ['events', 'errors'],
  singleton: true
});

// Export for type safety
export const services = {
  auth: () => container.get('auth'),
  chat: () => container.get('chat'),
  devices: () => container.get('devices'),
  errors: () => container.get('errors'),
  events: () => container.get('events'),
  notifications: () => container.get('notifications'),
  search: () => container.get('search'),
  storage: () => container.get('storage'),
  sync: () => container.get('sync'),
  validation: () => container.get('validation'),
  websocket: () => container.get('websocket')
} as const;