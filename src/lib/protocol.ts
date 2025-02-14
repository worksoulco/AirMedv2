import { Protocol, ProtocolTask } from '@/types/protocol';

// Load protocols
export function loadProtocols(patientId: string): Protocol[] {
  const stored = localStorage.getItem(`protocols_${patientId}`);
  return stored ? JSON.parse(stored) : [];
}

// Save protocol
export function saveProtocol(protocol: Protocol) {
  const protocols = loadProtocols(protocol.patientId);
  const existingIndex = protocols.findIndex(p => p.id === protocol.id);
  
  const updatedProtocols = existingIndex >= 0
    ? [
        ...protocols.slice(0, existingIndex),
        { ...protocol, metadata: { ...protocol.metadata, updatedAt: new Date().toISOString() }},
        ...protocols.slice(existingIndex + 1)
      ]
    : [...protocols, {
        ...protocol,
        metadata: {
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1
        }
      }];
  
  localStorage.setItem(`protocols_${protocol.patientId}`, JSON.stringify(updatedProtocols));
  window.dispatchEvent(new Event('protocolUpdate'));
  return protocol;
}

// Update task status
export function updateTaskStatus(
  protocolId: string,
  taskId: string,
  status: ProtocolTask['status'],
  userId: string
) {
  const protocols = Object.values(localStorage)
    .map(item => {
      try {
        return JSON.parse(item);
      } catch {
        return null;
      }
    })
    .filter(Array.isArray)
    .flat()
    .filter((item): item is Protocol => 
      item && typeof item === 'object' && 'id' in item && item.id === protocolId
    );

  if (protocols.length === 0) return null;

  const protocol = protocols[0];
  const updatedProtocol = {
    ...protocol,
    tasks: protocol.tasks.map(task =>
      task.id === taskId
        ? {
            ...task,
            status,
            completedDate: status === 'completed' ? new Date().toISOString() : undefined,
            metadata: {
              ...task.metadata,
              updatedAt: new Date().toISOString(),
              completedBy: status === 'completed' ? userId : undefined
            }
          }
        : task
    )
  };

  saveProtocol(updatedProtocol);
  return updatedProtocol;
}