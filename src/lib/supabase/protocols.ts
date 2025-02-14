import { supabase } from './client';
import type { Protocol, ProtocolTask } from '@/types/protocol';
import { getCurrentUser } from '@/lib/auth';

// Get patient's protocols
export async function getPatientProtocols(patientId: string) {
  try {
    const { data, error } = await supabase
      .rpc('get_patient_protocols', {
        p_patient_id: patientId
      });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error loading protocols:', error);
    throw error;
  }
}

// Create new protocol
export async function createProtocol(protocol: Omit<Protocol, 'id' | 'metadata'>) {
  try {
    const user = getCurrentUser();
    if (!user) throw new Error('Not authenticated');

    // First create the protocol
    const { data: protocolData, error: protocolError } = await supabase
      .from('protocols')
      .insert({
        title: protocol.title,
        description: protocol.description,
        type: protocol.type,
        status: protocol.status,
        provider_id: user.id,
        patient_id: protocol.patientId,
        start_date: protocol.startDate,
        end_date: protocol.endDate,
        notes: protocol.notes
      })
      .select()
      .single();

    if (protocolError) throw protocolError;

    // Then add tasks
    if (protocol.tasks?.length > 0) {
      const { error: tasksError } = await supabase
        .from('protocol_tasks')
        .insert(
          protocol.tasks.map(task => ({
            protocol_id: protocolData.id,
            title: task.title,
            description: task.description,
            frequency: task.frequency,
            status: task.status,
            due_date: task.dueDate
          }))
        );

      if (tasksError) throw tasksError;
    }

    // Finally add attachments if any
    if (protocol.attachments?.length > 0) {
      const { error: attachmentsError } = await supabase
        .from('protocol_attachments')
        .insert(
          protocol.attachments.map(attachment => ({
            protocol_id: protocolData.id,
            name: attachment.name,
            url: attachment.url,
            type: attachment.type,
            size: attachment.size
          }))
        );

      if (attachmentsError) throw attachmentsError;
    }

    return protocolData;
  } catch (error) {
    console.error('Error creating protocol:', error);
    throw error;
  }
}

// Update protocol task status
export async function updateProtocolTaskStatus(
  taskId: string,
  status: ProtocolTask['status']
) {
  try {
    const { data, error } = await supabase
      .rpc('update_protocol_task_status', {
        p_task_id: taskId,
        p_status: status
      });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating task status:', error);
    throw error;
  }
}

// Subscribe to protocol updates
export function subscribeToProtocolUpdates(patientId: string) {
  const channel = supabase
    .channel('protocol_updates')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'protocols',
        filter: `patient_id=eq.${patientId}`
      },
      () => window.dispatchEvent(new Event('protocolUpdate'))
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'protocol_tasks',
        filter: `protocol_id=in.(select id from protocols where patient_id=eq.${patientId})`
      },
      () => window.dispatchEvent(new Event('protocolUpdate'))
    )
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
}