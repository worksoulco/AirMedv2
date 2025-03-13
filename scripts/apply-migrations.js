import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function initMigrationsTable(supabase) {
  try {
    // Use rpc to execute SQL
    const { error } = await supabase.rpc('exec_sql', {
      query: `
        CREATE TABLE IF NOT EXISTS _migrations (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL UNIQUE,
          sql TEXT NOT NULL,
          applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          error TEXT
        );
      `
    });
    if (error) throw error;
  } catch (error) {
    console.error('Error creating migrations table:', error);
    throw error;
  }
}

async function getAppliedMigrations(supabase) {
  try {
    const { data, error } = await supabase
      .from('_migrations')
      .select('name')
      .eq('error', null);
    
    if (error) throw error;
    return data.map(m => m.name);
  } catch (error) {
    console.error('Error getting applied migrations:', error);
    return [];
  }
}

async function applyMigration(supabase, file, migration) {
  console.log(`Applying migration: ${file}`);
  
  try {
    // Record migration attempt
    const { error: insertError } = await supabase
      .from('_migrations')
      .upsert([{ 
        name: file,
        sql: migration,
        error: null,
        applied_at: new Date().toISOString()
      }])
      .select();

    if (insertError) throw insertError;

    // Execute migration
    const { error: sqlError } = await supabase.rpc('exec_sql', {
      query: migration
    });
    if (sqlError) throw sqlError;

    console.log(`Successfully applied migration: ${file}`);
    return true;
  } catch (error) {
    console.error(`Error in migration ${file}:`, error);
    
    // Record error
    try {
      await supabase
        .from('_migrations')
        .upsert([{
          name: file,
          sql: migration,
          error: JSON.stringify(error),
          applied_at: new Date().toISOString()
        }]);
    } catch (e) {
      console.error('Failed to record migration error:', e);
    }
    
    throw error;
  }
}

async function applyMigrations() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Initialize migrations table
    await initMigrationsTable(supabase);

    // Get list of applied migrations
    const appliedMigrations = await getAppliedMigrations(supabase);
    
    // Read migration files
    const migrationsPath = path.join(__dirname, '..', 'supabase', 'migrations');
    const migrationFiles = fs.readdirSync(migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort();

    // Apply each migration
    for (const file of migrationFiles) {
      if (appliedMigrations.includes(file)) {
        console.log(`Skipping already applied migration: ${file}`);
        continue;
      }

      const migration = fs.readFileSync(path.join(migrationsPath, file), 'utf8');
      await applyMigration(supabase, file, migration);
    }

    console.log('All migrations completed');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

applyMigrations().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
