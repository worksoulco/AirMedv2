import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
    // Read and execute migrations
    const migrationsPath = path.join(__dirname, '..', 'supabase', 'migrations');
    const migrationFiles = fs.readdirSync(migrationsPath)
      .filter(file => file.endsWith('.sql'))
      .sort();

    for (const file of migrationFiles) {
      console.log(`Applying migration: ${file}`);
      const migration = fs.readFileSync(path.join(migrationsPath, file), 'utf8');
      
      const { error } = await supabase.rpc('exec_sql', { sql: migration });
      if (error) {
        console.error(`Error applying migration ${file}:`, error);
        process.exit(1);
      }
    }

    // Apply combined migrations
    console.log('Applying combined migrations...');
    const combinedMigrations = fs.readFileSync(
      path.join(__dirname, '..', 'supabase', 'combined_migrations.sql'),
      'utf8'
    );
    
    const { error } = await supabase.rpc('exec_sql', { sql: combinedMigrations });
    if (error) {
      console.error('Error applying combined migrations:', error);
      process.exit(1);
    }

    console.log('All migrations applied successfully');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

applyMigrations();
