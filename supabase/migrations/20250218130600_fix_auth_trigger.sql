-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create function with exception handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  default_role text := 'patient';
BEGIN
  -- Check if user metadata exists and contains role
  IF NEW.raw_user_meta_data IS NULL OR NEW.raw_user_meta_data->>'role' IS NULL THEN
    default_role := 'patient';
  ELSE
    default_role := NEW.raw_user_meta_data->>'role';
  END IF;

  -- Insert with minimal required fields
  BEGIN
    INSERT INTO public.profiles (
      id,
      email,
      role
    )
    VALUES (
      NEW.id,
      NEW.email,
      default_role
    );
  EXCEPTION WHEN OTHERS THEN
    -- Log error details
    RAISE NOTICE 'Error in handle_new_user: %', SQLERRM;
    -- Return NEW to allow auth user creation even if profile fails
    RETURN NEW;
  END;

  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Ensure proper permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Ensure RLS is enabled with simple policy
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create simple policy that allows everything
CREATE POLICY "Allow all operations on profiles"
ON profiles FOR ALL
USING (true)
WITH CHECK (true);
