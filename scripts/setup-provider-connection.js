import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupProviderConnection() {
  try {
    console.log('Setting up provider connection system...');

    // Read migration file
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/20250217165935_setup_provider_connection.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // Execute each statement
    for (const sql of statements) {
      const { error } = await supabase.rpc('exec_sql', { sql: sql + ';' });
      if (error) {
        throw error;
      }
    }

    console.log('Provider connection system set up successfully!');
    console.log('\nNext steps:');
    console.log('1. Restart your development server');
    console.log('2. Log in as a provider to generate connection codes');
    console.log('3. Log in as a patient to test connecting with a provider');

  } catch (error) {
    console.error('Error setting up provider connection system:', error);
    process.exit(1);
  }
}

setupProviderConnection();
