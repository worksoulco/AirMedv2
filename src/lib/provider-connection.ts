import { supabase } from './supabase/client';

export async function generateProviderCode(expiryDays: number = 30) {
  const { data, error } = await supabase.rpc('create_provider_code', {
    expiry_days: expiryDays,
  });

  if (error) throw error;
  return data;
}

export async function requestProviderConnection(code: string) {
  const { data, error } = await supabase.rpc('request_provider_connection', {
    connection_code: code,
  });

  if (error) throw error;
  return data;
}

export async function handleConnectionRequest(requestId: string, accept: boolean) {
  const { data, error } = await supabase.rpc('handle_connection_request', {
    request_id: requestId,
    new_status: accept ? 'active' : 'rejected',
  });

  if (error) throw error;
  return data;
}

export async function getProviderCodes() {
  const { data, error } = await supabase
    .from('provider_codes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

export async function revokeProviderCode(codeId: string) {
  const { data, error } = await supabase
    .from('provider_codes')
    .update({ status: 'revoked' })
    .eq('id', codeId);

  if (error) throw error;
  return data;
}

export async function getConnectionRequests() {
  const { data, error } = await supabase
    .from('patient_providers')
    .select(`
      id,
      created_at,
      patient:users!patient_id (
        id,
        raw_user_meta_data
      )
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

import type { ProviderConnection } from '@/types/provider-connection';

export async function getActiveConnections(): Promise<ProviderConnection[]> {
  const { data, error } = await supabase
    .from('patient_providers')
    .select(`
      id,
      created_at,
      provider:users!provider_id (
        id,
        raw_user_meta_data,
        provider_details (*)
      )
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as ProviderConnection[];
}
