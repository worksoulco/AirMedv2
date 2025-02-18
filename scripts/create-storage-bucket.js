#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { promises as fs } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from project root
dotenv.config({ path: resolve(__dirname, '../.env') });

// Get Supabase URL and key from environment
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error('- VITE_SUPABASE_URL');
  console.error('- VITE_SUPABASE_SERVICE_ROLE_KEY');
  console.error('\nMake sure these are set in your .env file');
  process.exit(1);
}

// Extract project reference from URL
const projectRef = supabaseUrl.match(/https:\/\/(.*?)\.supabase\.co/)[1];

async function createStorageBucket() {
  console.log('Starting storage bucket creation...');
  try {
    // Create Supabase client
    console.log('Creating Supabase client...');
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Create the bucket
    console.log('Creating labs bucket...');
    const { data: bucket, error: bucketError } = await supabase.storage.createBucket('labs', {
      public: false,
      allowedMimeTypes: ['application/pdf'],
      fileSizeLimit: 10485760 // 10MB
    });

    if (bucketError) {
      if (bucketError.message.includes('already exists')) {
        console.log('Bucket already exists, continuing...');
      } else {
        throw bucketError;
      }
    } else {
      console.log('Storage bucket created successfully');
    }

    console.log('Bucket setup complete');
    console.log('');
    console.log('Next steps:');
    console.log('1. Go to the Supabase dashboard SQL editor');
    console.log('2. Run the SQL from supabase/setup.sql to create storage policies');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createStorageBucket();
