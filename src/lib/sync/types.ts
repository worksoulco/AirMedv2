export interface SyncConfig {
  enabled: boolean;
  interval: number;
  retryAttempts: number;
  retryDelay: number;
  batchSize: number;
}

export interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: string;
  data: any;
  timestamp: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  error?: string;
}

export interface SyncState {
  lastSync: string;
  inProgress: boolean;
  pendingOperations: number;
  errors: Array<{
    operation: string;
    error: string;
    timestamp: string;
  }>;
}