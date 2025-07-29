# Session Persistence Fix Deployment Guide

## Issues Fixed

1. **Session lost on page reload** - User was logged out after refreshing
2. **Login stuck on "signing in"** - After logout, login button would not work
3. **Profile table missing** - Auth was failing due to missing profiles table

## Steps to Deploy

### 1. Create Profiles Table (REQUIRED)
Run this SQL in Supabase SQL Editor:
```sql
-- Run the script from /client/src/lib/create-profiles-table.sql
```

This creates:
- `profiles` table for user metadata
- Automatic profile creation on signup
- RLS policies for security

### 2. Apply Two-Party Schema (REQUIRED)
Run this SQL in Supabase SQL Editor:
```sql
-- Run the script from /client/src/lib/two-party-schema.sql
```

This fixes the infinite recursion error.

### 3. Deploy Code Changes
```bash
git add .
git commit -m "Fix session persistence and auth issues"
git push
```

## What Changed

### Auth State Listener
- Now handles missing profiles gracefully
- Sets user state even if profile doesn't exist
- Properly checks for existing sessions on mount

### Login Flow
- Creates/updates profile on login
- Adds small delay before redirect to ensure state is set
- Uses upsert to handle existing profiles

### AuthGuard Component
- New component that prevents auth race conditions
- Shows loading state while checking auth
- Redirects appropriately based on auth status

### Protected Pages
- Dashboard now uses AuthGuard
- Login page uses AuthGuard with requireAuth=false
- Prevents logged-in users from seeing login page

## Testing

1. **Test Session Persistence**
   - Log in
   - Refresh the page
   - Should stay logged in

2. **Test Login Flow**
   - Log out
   - Try to log in again
   - Should work without getting stuck

3. **Test Protected Routes**
   - Try accessing /dashboard while logged out
   - Should redirect to login
   - After login, should go to dashboard

## Troubleshooting

If issues persist:
1. Clear browser storage: DevTools → Application → Clear site data
2. Check Supabase logs for any errors
3. Ensure all SQL migrations were applied
4. Check browser console for specific error messages