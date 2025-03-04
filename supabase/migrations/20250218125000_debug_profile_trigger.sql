-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create debug function to log errors
CREATE OR REPLACE FUNCTION public.log_error(error_message TEXT)
RETURNS void AS $$
BEGIN
  INSERT INTO public.error_logs (message, created_at)
  VALUES (error_message, now());
EXCEPTION WHEN OTHERS THEN
  -- If we can't log the error, at least raise it
  RAISE NOTICE 'Error logging failed: %', error_message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create error logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.error_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create or replace the function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Log the attempt
  PERFORM public.log_error('Attempting to create profile for user: ' || NEW.id);
  
  BEGIN
    INSERT INTO public.profiles (
      id,
      email,
      role,
      name,
      title
    )
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'role', 'patient'),
      COALESCE(NEW.raw_user_meta_data->>'name', ''),
      COALESCE(NEW.raw_user_meta_data->>'title', '')
    )
    ON CONFLICT (id) DO UPDATE
    SET
      email = EXCLUDED.email,
      role = EXCLUDED.role,
      name = EXCLUDED.name,
      title = EXCLUDED.title,
      updated_at = now();

    -- Log success
    PERFORM public.log_error('Successfully created profile for user: ' || NEW.id);
    
    RETURN NEW;
  EXCEPTION WHEN OTHERS THEN
    -- Log the error details
    PERFORM public.log_error('Error creating profile: ' || SQLERRM || ' for user: ' || NEW.id);
    RAISE EXCEPTION 'Profile creation failed: %', SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT ALL ON public.error_logs TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.log_error TO postgres, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user TO postgres, anon, authenticated, service_role;
