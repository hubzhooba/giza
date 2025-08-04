# Fix Wallet Connection Error

## The Issue
The API URL is undefined, causing the wallet connection to fail.

## Quick Fix

1. **Create `/client/.env.local`** with:
```bash
# Supabase (copy from your root .env)
NEXT_PUBLIC_SUPABASE_URL=https://kpjpgqxtzufvkryikrqh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwanBncXh0enVmdmtyeWlrcnFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjg2MDI1NzgsImV4cCI6MjA0NDE3ODU3OH0.bvZQ3NKJGNn1lsRCvISr3hBZ0q3EGyf95V2xtJVdBpc

# API URL (IMPORTANT!)
NEXT_PUBLIC_API_URL=http://localhost:3001
```

2. **Start the backend server** (in a new terminal):
```bash
cd server
npm run dev
```

3. **Start the frontend** (in another terminal):
```bash
cd client
npm run dev
```

## Alternative: Update for Production

If you want to use Supabase Edge Functions instead of a separate backend, we can modify the authentication to work directly with Supabase. Let me know if you'd prefer this approach.

## About the Signature Warning

The warning about the deprecated signature API is from ArConnect. We're using the old API for compatibility. This will work fine for now, but we can update it later to use the new API.

## Testing Steps

1. Make sure both frontend (port 3000) and backend (port 3001) are running
2. Install ArConnect extension
3. Click "Connect with ArConnect" on the landing page
4. Approve the permissions
5. You should be redirected to the onboarding page to set your username

## If you still get errors:

1. Check the browser console for more details
2. Make sure the backend is running on port 3001
3. Check that your `.env` files are properly configured
4. Try clearing your browser cache and localStorage