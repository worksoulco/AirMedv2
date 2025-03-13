-- Fix authentication system issues
-- This migration addresses the "Database error saving new user" issue

-- 1. Ensure proper permissions for auth schema
GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role;
GRANT SELECT ON auth.users TO postgres, authenticated, service_role;

-- 2. Drop existing trigger and function to recreate them
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 3. Create a simplified function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  default_role text := 'patient';
  user_name text := 'Unknown';
BEGIN
  -- Log the function call for debugging
  RAISE LOG 'handle_new_user called for user_id: %, email: %', NEW.id, NEW.email;
  
  -- Basic validation
  IF NEW.id IS NULL OR NEW.email IS NULL THEN
    RAISE LOG 'Missing required user data: id or email is null';
    RETURN NEW; -- Still return NEW to allow auth user creation
  END IF;
  
  -- Extract role with safe fallback
  BEGIN
    IF NEW.raw_user_meta_data IS NOT NULL AND 
       NEW.raw_user_meta_data->>'role' IS NOT NULL AND
       NEW.raw_user_meta_data->>'role' IN ('patient', 'provider') THEN
      default_role := NEW.raw_user_meta_data->>'role';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error extracting role: %', SQLERRM;
  END;
  
  -- Extract name with safe fallback
  BEGIN
    user_name := COALESCE(
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1),
      'Unknown'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error extracting name: %', SQLERRM;
  END;
  
  -- Check if profile already exists (to avoid unique constraint violations)
  BEGIN
    PERFORM 1 FROM public.profiles WHERE id = NEW.id OR email = NEW.email;
    IF FOUND THEN
      RAISE LOG 'Profile already exists for user_id: % or email: %', NEW.id, NEW.email;
      RETURN NEW; -- Still return NEW to allow auth user creation
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error checking existing profile: %', SQLERRM;
  END;
  
  -- Insert profile with minimal required fields and handle errors
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
    
    RAISE LOG 'Profile created successfully for user_id: %', NEW.id;
  EXCEPTION WHEN OTHERS THEN
    -- Log the error but don't fail the transaction
    RAISE LOG 'Error creating profile: % (user_id: %, email: %)', 
      SQLERRM, NEW.id, NEW.email;
  END;
  
  -- Always return NEW to ensure auth user is created even if profile creation fails
  RETURN NEW;
END;
$$;

-- 4. Create trigger with AFTER INSERT to ensure auth user is created first
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 5. Ensure the profiles table has the correct structure and constraints
DO $$ 
BEGIN
  -- Check if profiles table exists, if not create it
  IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') THEN
    CREATE TABLE public.profiles (
      id UUID PRIMARY KEY,
      email TEXT NOT NULL,
      name TEXT,
      role TEXT NOT NULL CHECK (role IN ('patient', 'provider')),
      title TEXT,
      date_of_birth DATE,
      gender TEXT,
      height TEXT,
      weight TEXT,
      blood_type TEXT,
      emergency_contact JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );
  END IF;
END $$;

-- 6. Ensure foreign key constraint exists with ON DELETE CASCADE
DO $$ 
BEGIN
  -- Drop the constraint if it exists
  BEGIN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error dropping constraint: %', SQLERRM;
  END;
  
  -- Add the constraint with ON DELETE CASCADE
  BEGIN
    ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_id_fkey 
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error adding constraint: %', SQLERRM;
  END;
END $$;

-- 7. Add email index and unique constraint
DO $$ 
BEGIN
  -- Create index if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' AND tablename = 'profiles' AND indexname = 'profiles_email_idx'
  ) THEN
    CREATE INDEX profiles_email_idx ON public.profiles(email);
  END IF;
  
  -- Add unique constraint if it doesn't exist
  BEGIN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_email_unique;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_unique UNIQUE (email);
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Error with email unique constraint: %', SQLERRM;
  END;
END $$;

-- 8. Ensure RLS is enabled with proper policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 9. Drop existing policies
DROP POLICY IF EXISTS "Users can read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow all operations on profiles" ON public.profiles;

-- 10. Create proper RLS policies
CREATE POLICY "Users can read their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 11. Grant minimal required permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;

-- 12. Add insert permission for the auth trigger
GRANT INSERT ON public.profiles TO postgres, service_role;
