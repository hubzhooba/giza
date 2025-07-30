# Railway Final Setup Guide

## Step-by-Step Railway Configuration

### 1. Deploy the Backend Service

Since this is a monorepo, we need to tell Railway to only deploy the server:

#### Option A: Using Railway CLI
```bash
# From the root directory
railway init
railway link
railway service create --name "securecontract-backend"

# Set the root directory for the service
railway variables set ROOT_DIRECTORY=server

# Deploy
railway up
```

#### Option B: Using Railway Dashboard
1. Create a new project in Railway
2. Connect your GitHub repository
3. **Important**: Set the "Root Directory" to `server` in the service settings
4. Deploy

### 2. Configure Environment Variables

In Railway dashboard, go to your service and click "Variables". Add these:

```env
# Required Variables
NEXT_PUBLIC_SUPABASE_URL=https://mcgezqqfraydhgmseevl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jZ2V6cXFmcmF5ZGhnbXNlZXZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2OTc3OTMsImV4cCI6MjA2OTI3Mzc5M30.6GwDnWTzxTT0zNhDHI7gL8bNawMDhaRLVbQ32gvaztU
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jZ2V6cXFmcmF5ZGhnbXNlZXZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzY5Nzc5MywiZXhwIjoyMDY5MjczNzkzfQ.7lc6HiEjcJVTzDNkkT1Rt_CWgcNXYEhT0U4E9GUitAc
NODE_ENV=production

# Railway provides PORT automatically, don't set it manually

# CORS Configuration (update after frontend deployment)
CLIENT_URL=http://localhost:3000
```

### 3. Configure Service Settings

In Railway dashboard:

1. Go to your service → **Settings tab**
2. Scroll to **Service Settings**
3. Set the following:
   - **Root Directory**: `server`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/health`

### 4. Expose the Service

Still in the Settings tab:
1. Under **Networking**
2. Click **Generate Domain**
3. Railway will provide a public URL like: `https://securecontract-backend.up.railway.app`

### 5. Test the Deployment

Once deployed, test your backend:

```bash
# Test health endpoint
curl https://your-app.up.railway.app/health

# Should return:
# {"status":"ok","timestamp":"2024-01-29T..."}
```

### 6. Deploy the Frontend

Now deploy your frontend to Vercel:

```bash
cd client

# Create .env.production.local
echo "NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app" > .env.production.local
echo "NEXT_PUBLIC_SUPABASE_URL=https://mcgezqqfraydhgmseevl.supabase.co" >> .env.production.local
echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jZ2V6cXFmcmF5ZGhnbXNlZXZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2OTc3OTMsImV4cCI6MjA2OTI3Mzc5M30.6GwDnWTzxTT0zNhDHI7gL8bNawMDhaRLVbQ32gvaztU" >> .env.production.local

# Deploy to Vercel
npx vercel --prod
```

### 7. Update Backend CORS

After frontend is deployed, update the CLIENT_URL in Railway:

```env
CLIENT_URL=https://your-frontend.vercel.app
```

## Troubleshooting

### "Cannot GET /" Error
This is normal - the backend doesn't serve a frontend. Test with `/health` instead.

### Port Issues
- Don't manually set PORT in Railway variables
- Railway automatically assigns and injects PORT
- The server code already uses `process.env.PORT`

### Build Failures
Check that:
- Root directory is set to `server`
- Node version is 18+ (add `NODE_VERSION=18` in variables if needed)

### CORS Errors
Make sure CLIENT_URL in Railway matches your frontend URL exactly.

## Complete Setup Checklist

- [ ] Railway service created
- [ ] Root directory set to `server`
- [ ] Environment variables added
- [ ] Service exposed with public domain
- [ ] Health check working
- [ ] Frontend deployed to Vercel
- [ ] CORS configured correctly

## Final URLs

After complete setup:
- **Backend API**: `https://your-backend.up.railway.app`
- **Frontend App**: `https://your-app.vercel.app`
- **Health Check**: `https://your-backend.up.railway.app/health`