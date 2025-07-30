-- Fix signup trigger to handle errors gracefully

-- First, ensure the profiles table has all necessary columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS full_name text,
ADD COLUMN IF NOT EXISTS public_key text;

-- Remove unique constraint from email temporarily to fix duplicates
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_email_key;

-- Update any missing emails from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- Add unique constraint back
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_email_key UNIQUE (email);

-- Make email NOT NULL
ALTER TABLE public.profiles 
ALTER COLUMN email SET NOT NULL;

-- Update the trigger to handle conflicts better
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, public_key)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'name', new.email),
    new.raw_user_meta_data->>'public_key'
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    public_key = COALESCE(EXCLUDED.public_key, profiles.public_key),
    updated_at = now();
  RETURN new;
EXCEPTION
  WHEN unique_violation THEN
    -- If email already exists, just update the existing profile
    UPDATE public.profiles
    SET 
      full_name = COALESCE(new.raw_user_meta_data->>'name', full_name),
      public_key = COALESCE(new.raw_user_meta_data->>'public_key', public_key),
      updated_at = now()
    WHERE email = new.email;
    RETURN new;
  WHEN OTHERS THEN
    -- Log error but don't fail the signup
    RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Add INSERT policy for profiles
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Force schema cache reload
NOTIFY pgrst, 'reload schema';