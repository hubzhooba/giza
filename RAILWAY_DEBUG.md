# Railway Deployment Debug Guide

## Current Issue
Railway is still running the old cached deployment with `concurrently`. The health check is also failing because it's checking `/` instead of `/health`.

## Solution Steps

### 1. Clear Railway Cache
In your Railway dashboard:
1. Go to your service settings
2. Look for "Clear Build Cache" option
3. Clear the cache

### 2. Force Rebuild
Add a dummy environment variable to force a rebuild:
```
DEPLOY_VERSION=2
```

### 3. Alternative: Create New Service
If cache clearing doesn't work:
1. Delete the current service in Railway
2. Create a new service
3. Connect your GitHub repo
4. Add environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://mcgezqqfraydhgmseevl.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jZ2V6cXFmcmF5ZGhnbXNlZXZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2OTc3OTMsImV4cCI6MjA2OTI3Mzc5M30.6GwDnWTzxTT0zNhDHI7gL8bNawMDhaRLVbQ32gvaztU
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jZ2V6cXFmcmF5ZGhnbXNlZXZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzY5Nzc5MywiZXhwIjoyMDY5MjczNzkzfQ.7lc6HiEjcJVTzDNkkT1Rt_CWgcNXYEhT0U4E9GUitAc
   NODE_ENV=production
   ```

### 4. Test Locally First
Before deploying, test the backend locally:
```bash
# Build
npm run build

# Start backend only
node start-backend.js

# In another terminal, test health endpoint
curl http://localhost:3001/health
```

Should return:
```json
{"status":"ok","timestamp":"2024-01-29T..."}
```

### 5. Manual Deployment Commands
If Railway CLI is available:
```bash
# Login
railway login

# Link to project
railway link

# Deploy with logs
railway up --detach=false
```

## What Changed
1. **start-backend.js** - Simple Node.js script that only starts the backend
2. **railway.toml** - Uses the new start script
3. **server PORT** - Now uses Railway's PORT env variable
4. **Health check** - Available at `/health` endpoint

## Expected Behavior
- Only the backend server will start
- It will listen on Railway's provided PORT
- Health check at `/health` will return 200 OK
- No port conflicts since frontend won't start

## Frontend Deployment
For the frontend, use one of these options:
1. **Vercel** (Recommended for Next.js):
   ```bash
   cd client
   npx vercel
   ```

2. **Netlify**:
   ```bash
   cd client
   npm run build
   npx netlify deploy --prod --dir=.next
   ```

3. **Static Export** (if no SSR needed):
   ```bash
   cd client
   npm run build
   npm run export
   # Deploy the 'out' folder to any static host
   ```