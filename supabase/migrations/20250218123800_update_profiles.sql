-- Add missing columns to profiles table if they don't exist
DO $$ 
BEGIN
    -- Add date_of_birth if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'profiles' AND column_name = 'date_of_birth') THEN
        ALTER TABLE profiles ADD COLUMN date_of_birth DATE;
    END IF;

    -- Add gender if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'profiles' AND column_name = 'gender') THEN
        ALTER TABLE profiles ADD COLUMN gender TEXT;
    END IF;

    -- Add height if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'profiles' AND column_name = 'height') THEN
        ALTER TABLE profiles ADD COLUMN height TEXT;
    END IF;

    -- Add weight if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'profiles' AND column_name = 'weight') THEN
        ALTER TABLE profiles ADD COLUMN weight TEXT;
    END IF;

    -- Add blood_type if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'profiles' AND column_name = 'blood_type') THEN
        ALTER TABLE profiles ADD COLUMN blood_type TEXT;
    END IF;

    -- Add emergency_contact if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'profiles' AND column_name = 'emergency_contact') THEN
        ALTER TABLE profiles ADD COLUMN emergency_contact JSONB;
    END IF;

END $$;

-- Update RLS policies if they don't exist
DO $$ 
BEGIN
    -- Check and create select policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view their own profile') THEN
        CREATE POLICY "Users can view their own profile"
            ON profiles FOR SELECT
            USING (auth.uid() = id);
    END IF;

    -- Check and create update policy
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update their own profile') THEN
        CREATE POLICY "Users can update their own profile"
            ON profiles FOR UPDATE
            USING (auth.uid() = id);
    END IF;
END $$;
