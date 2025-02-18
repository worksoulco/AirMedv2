import { supabase } from './client';

export async function setupLabResultsTable() {
  try {
    // Check if lab_results table exists by attempting to select from it
    const { error } = await supabase
      .from('lab_results')
      .select('id')
      .limit(1);

    if (error) {
      if (error.message.includes('does not exist')) {
        throw new Error('Lab results table not found. Please ensure the database is properly set up.');
      }
      throw error;
    }

    console.log('Lab results table verified successfully');
    return true;
  } catch (error) {
    console.error('Failed to verify lab_results table:', error);
    throw error;
  }
}
