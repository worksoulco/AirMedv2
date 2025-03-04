-- Grant permissions to auth schema
GRANT USAGE ON SCHEMA auth TO postgres, anon, authenticated, service_role;

-- Grant permissions to auth.users
GRANT SELECT ON auth.users TO postgres, anon, authenticated, service_role;
GRANT INSERT ON auth.users TO postgres, anon, authenticated, service_role;
GRANT UPDATE ON auth.users TO postgres, anon, authenticated, service_role;

-- Grant permissions to auth functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO postgres, anon, authenticated, service_role;

-- Ensure public schema permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Ensure RLS is enabled but with proper policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Trigger can create user profiles" ON profiles;

-- Create comprehensive policies
CREATE POLICY "Public profiles are viewable by everyone" 
ON profiles FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Users can insert their own profile" 
ON profiles FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
ON profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id);

CREATE POLICY "Trigger can create user profiles" 
ON profiles FOR INSERT 
TO anon 
WITH CHECK (true);

-- Ensure proper ownership
ALTER TABLE profiles OWNER TO postgres;
