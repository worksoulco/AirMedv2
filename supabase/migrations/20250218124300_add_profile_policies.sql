-- Add INSERT policy for profiles
CREATE POLICY "Trigger can create user profiles"
ON profiles FOR INSERT
WITH CHECK (true);

-- Add INSERT policy for authenticated users
CREATE POLICY "Users can insert their own profile"
ON profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- Ensure RLS is enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Grant permissions to authenticated users
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role;
