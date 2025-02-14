export interface Protocol {
  id: string;
  title: string;
  description: string;
  type: 'treatment' | 'recovery' | 'maintenance' | 'preventive';
  status: 'active' | 'completed' | 'archived';
  startDate: string;
  endDate?: string;
  providerId: string;
  patientId: string;
  tasks: ProtocolTask[];
  notes?: string;
  attachments?: ProtocolAttachment[];
  metadata?: {
    createdAt: string;
    updatedAt: string;
    version: number;
    previousVersionId?: string;
  };
}

export interface ProtocolTask {
  id: string;
  title: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'as_needed';
  status: 'pending' | 'in_progress' | 'completed';
  dueDate?: string;
  completedDate?: string;
  reminders?: {
    enabled: boolean;
    time?: string;
    days?: number[];
  };
  metadata?: {
    createdAt: string;
    updatedAt: string;
    completedBy?: string;
  };
}

export interface ProtocolAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
}