# Authentication Troubleshooting Guide

## Common Login Issues

### 1. 400 Bad Request Error

If you're getting a 400 error when trying to login, check:

#### A. Email Confirmation
- New users must confirm their email before logging in
- Check your inbox for a confirmation email from Supabase
- Click the confirmation link before attempting to login

#### B. Supabase Auth Settings
1. Go to your Supabase dashboard
2. Navigate to Authentication → Settings
3. Ensure:
   - Email auth is enabled
   - Email confirmations are configured
   - Password requirements match what you're using

#### C. Password Requirements
Default Supabase requirements:
- Minimum 6 characters
- No maximum length
- Any characters allowed

### 2. Testing Authentication

Visit `/test-auth` to test authentication directly:
1. Try signing up with a new email
2. Check for confirmation email
3. Confirm email
4. Try logging in

### 3. Reset Password

If you forgot your password:
1. Go to Supabase dashboard
2. Authentication → Users
3. Find your user
4. Click "Send recovery email"

### 4. Check Supabase Status

1. Visit https://status.supabase.com/
2. Check if there are any ongoing issues
3. Check your project's health in the dashboard

### 5. Database User Profile

After email confirmation, ensure your profile exists:
```sql
-- Run in Supabase SQL Editor
SELECT * FROM auth.users WHERE email = 'your-email@example.com';
SELECT * FROM public.profiles WHERE email = 'your-email@example.com';
```

### 6. Clear Browser Data

Sometimes auth tokens get corrupted:
1. Open DevTools (F12)
2. Application → Storage → Clear site data
3. Try logging in again

### 7. Check Network Tab

1. Open DevTools → Network tab
2. Try to login
3. Look for the `/auth/v1/token` request
4. Check request/response details for specific errors