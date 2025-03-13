-- Enable access to auth schema
GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role;
GRANT SELECT ON auth.users TO postgres, authenticated, service_role;

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Add indexes and constraints
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_email_unique;
ALTER TABLE profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email);

-- Ensure foreign key constraint exists
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'profiles_id_fkey'
    ) THEN
        ALTER TABLE profiles 
        ADD CONSTRAINT profiles_id_fkey 
        FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create improved function with proper error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  default_role text := 'patient';
  profile_exists boolean;
BEGIN
  BEGIN
    -- Validate required fields
    IF NEW.id IS NULL THEN
      RAISE EXCEPTION 'User ID cannot be null';
    END IF;
    
    IF NEW.email IS NULL THEN
      RAISE EXCEPTION 'Email cannot be null';
    END IF;

    -- Check if profile already exists
    SELECT EXISTS (
      SELECT 1 FROM public.profiles WHERE email = NEW.email
    ) INTO profile_exists;
    
    IF profile_exists THEN
      RAISE EXCEPTION 'Profile already exists for email %', NEW.email;
    END IF;

    -- Extract and validate role
    BEGIN
      IF NEW.raw_user_meta_data IS NOT NULL AND 
         NEW.raw_user_meta_data->>'role' IS NOT NULL AND
         NEW.raw_user_meta_data->>'role' IN ('patient', 'provider') THEN
        default_role := NEW.raw_user_meta_data->>'role';
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error parsing role from metadata: %. Using default role.', SQLERRM;
    END;

    -- Extract name with fallback
    DECLARE
      user_name text;
    BEGIN
      user_name := COALESCE(
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1),
        'Unknown'
      );
    EXCEPTION WHEN OTHERS THEN
      user_name := 'Unknown';
      RAISE WARNING 'Error extracting name: %. Using default name.', SQLERRM;
    END;

    -- Insert with minimal required fields
    BEGIN
      INSERT INTO public.profiles (
        id,
        email,
        role,
        name,
        created_at,
        updated_at
      )
      VALUES (
        NEW.id,
        NEW.email,
        default_role,
        user_name,
        NOW(),
        NOW()
      );
    EXCEPTION 
      WHEN foreign_key_violation THEN
        RAISE EXCEPTION 'Failed to link profile to user: %', SQLERRM;
      WHEN unique_violation THEN
        RAISE EXCEPTION 'Duplicate profile: %', SQLERRM;
      WHEN not_null_violation THEN
        RAISE EXCEPTION 'Missing required field: %', SQLERRM;
      WHEN OTHERS THEN
        RAISE WARNING 'Error creating profile: %', SQLERRM;
        RAISE EXCEPTION 'Failed to create profile: %', SQLERRM;
    END;

    RETURN NEW;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RAISE EXCEPTION 'Failed to create profile: %', SQLERRM;
  END;
END;
$$;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Drop existing policies
DROP POLICY IF EXISTS "Allow all operations on profiles" ON profiles;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Allow all operations on profiles" ON profiles;

-- Create proper RLS policies
CREATE POLICY "Users can read their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Grant minimal required permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, UPDATE ON profiles TO authenticated;
