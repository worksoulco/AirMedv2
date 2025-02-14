import { eventService, EVENTS } from '../events';
import { storage } from '../storage';
import type { SyncConfig, SyncOperation, SyncState } from './types';

class SyncService {
  private config: SyncConfig = {
    enabled: true,
    interval: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 5000, // 5 seconds
    batchSize: 50
  };

  private syncInterval: number | null = null;
  private state: SyncState = {
    lastSync: new Date().toISOString(),
    inProgress: false,
    pendingOperations: 0,
    errors: []
  };

  constructor() {
    this.loadState();
  }

  private loadState() {
    const savedState = storage.get<SyncState>('syncState');
    if (savedState) {
      this.state = savedState;
    }
  }

  private saveState() {
    storage.set('syncState', this.state);
  }

  start() {
    if (!this.config.enabled) return;

    // Clear any existing interval
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Start sync interval
    this.syncInterval = window.setInterval(() => {
      this.sync().catch(console.error);
    }, this.config.interval);

    // Do initial sync
    this.sync().catch(console.error);
  }

  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async sync() {
    if (this.state.inProgress) return;

    try {
      this.state.inProgress = true;
      eventService.emit(EVENTS.SYNC.STARTED);

      // Get pending operations
      const operations = this.getPendingOperations();
      this.state.pendingOperations = operations.length;

      // Process operations in batches
      for (let i = 0; i < operations.length; i += this.config.batchSize) {
        const batch = operations.slice(i, i + this.config.batchSize);
        await this.processBatch(batch);
      }

      this.state.lastSync = new Date().toISOString();
      this.state.pendingOperations = 0;
      this.saveState();

      eventService.emit(EVENTS.SYNC.COMPLETED);
    } catch (error) {
      console.error('Sync failed:', error);
      this.state.errors.push({
        operation: 'sync',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      eventService.emit(EVENTS.SYNC.ERROR, { error });
    } finally {
      this.state.inProgress = false;
      this.saveState();
    }
  }

  private getPendingOperations(): SyncOperation[] {
    return storage.get<SyncOperation[]>('pendingOperations') || [];
  }

  private async processBatch(operations: SyncOperation[]) {
    const results = await Promise.allSettled(
      operations.map(op => this.processOperation(op))
    );

    // Handle results
    results.forEach((result, index) => {
      const operation = operations[index];
      if (result.status === 'rejected') {
        this.handleOperationError(operation, result.reason);
      }
    });
  }

  private async processOperation(operation: SyncOperation): Promise<void> {
    try {
      operation.status = 'processing';
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      operation.status = 'completed';
      this.removeOperation(operation.id);
    } catch (error) {
      operation.status = 'failed';
      operation.attempts += 1;
      throw error;
    }
  }

  private handleOperationError(operation: SyncOperation, error: any) {
    if (operation.attempts < this.config.retryAttempts) {
      // Schedule retry
      setTimeout(() => {
        this.processOperation(operation).catch(console.error);
      }, this.config.retryDelay * operation.attempts);
    } else {
      this.state.errors.push({
        operation: operation.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      this.removeOperation(operation.id);
    }
  }

  private removeOperation(id: string) {
    const operations = this.getPendingOperations();
    const filtered = operations.filter(op => op.id !== id);
    storage.set('pendingOperations', filtered);
  }

  queueOperation(operation: Omit<SyncOperation, 'id' | 'status' | 'attempts' | 'timestamp'>) {
    const operations = this.getPendingOperations();
    const newOperation: SyncOperation = {
      ...operation,
      id: crypto.randomUUID(),
      status: 'pending',
      attempts: 0,
      timestamp: new Date().toISOString()
    };

    operations.push(newOperation);
    storage.set('pendingOperations', operations);
    this.state.pendingOperations = operations.length;
    this.saveState();

    // Trigger immediate sync if not in progress
    if (!this.state.inProgress) {
      this.sync().catch(console.error);
    }
  }

  getState(): SyncState {
    return { ...this.state };
  }

  configure(config: Partial<SyncConfig>) {
    this.config = { ...this.config, ...config };
    
    // Restart sync if interval changed
    if (this.syncInterval) {
      this.stop();
      this.start();
    }
  }
}

export const syncService = new SyncService();