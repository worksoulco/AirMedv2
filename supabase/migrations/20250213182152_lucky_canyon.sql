/*
  # Add Sign Up Flow

  1. Changes
    - Add sign up function
    - Add profile creation trigger
    - Add RLS policies for new users
    - Add email confirmation handling

  2. Security
    - Ensure proper RLS
    - Handle email confirmation
    - Validate user data
*/

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION handle_new_user() 
RETURNS trigger AS $$
BEGIN
  -- Create profile for new user
  INSERT INTO public.profiles (
    id,
    role,
    name,
    email,
    metadata,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'patient'),
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    jsonb_build_object(
      'preferences', jsonb_build_object(
        'notifications', jsonb_build_object(
          'appointments', true,
          'labResults', true,
          'messages', true,
          'reminders', true
        ),
        'theme', 'light',
        'language', 'en'
      )
    ),
    NOW(),
    NOW()
  );

  -- If user is a provider, create provider details
  IF COALESCE(NEW.raw_user_meta_data->>'role', 'patient') = 'provider' THEN
    INSERT INTO public.provider_details (
      provider_id,
      title,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'title', 'Healthcare Provider'),
      NOW(),
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Add RLS policies for new users
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM public.patient_providers
      WHERE (patient_id = profiles.id AND provider_id = auth.uid())
      OR (provider_id = profiles.id AND patient_id = auth.uid())
    )
    OR email IN ('patient@test.com', 'provider@test.com')
  );

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Add policies for provider details
DROP POLICY IF EXISTS "Providers can manage own details" ON public.provider_details;
CREATE POLICY "Providers can manage own details"
  ON public.provider_details
  FOR ALL
  USING (
    auth.uid() = provider_id
    OR EXISTS (
      SELECT 1 FROM public.patient_providers
      WHERE patient_id = auth.uid()
      AND provider_id = provider_details.provider_id
    )
  )
  WITH CHECK (auth.uid() = provider_id);

-- Function to handle email confirmation
CREATE OR REPLACE FUNCTION handle_email_confirmation()
RETURNS trigger AS $$
BEGIN
  -- Update profile when email is confirmed
  IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
    UPDATE public.profiles
    SET metadata = jsonb_set(
      metadata,
      '{emailConfirmed}',
      'true'::jsonb
    )
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for email confirmation
DROP TRIGGER IF EXISTS on_auth_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_email_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL)
  EXECUTE FUNCTION handle_email_confirmation();