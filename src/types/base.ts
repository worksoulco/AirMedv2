export interface BaseEntity {
  id: string;
  metadata: {
    createdAt: string;
    updatedAt: string;
    version: number;
    createdBy?: string;
    updatedBy?: string;
  };
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  metadata: {
    uploadedAt: string;
    uploadedBy: string;
    mimeType: string;
    checksum?: string;
  };
}

export interface UserReference {
  id: string;
  name: string;
  email: string;
  role: 'patient' | 'provider';
  photo?: string;
}

export interface AuditLog {
  id: string;
  entityId: string;
  entityType: string;
  action: 'create' | 'update' | 'delete';
  userId: string;
  userRole: string;
  timestamp: string;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  metadata?: Record<string, any>;
}