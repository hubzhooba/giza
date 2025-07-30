# Railway Deployment - Correct Setup

The issue you're experiencing is because both the frontend and backend are trying to run in the same container. Railway works best with separate services.

## Option 1: Deploy Backend Only (Recommended for Testing)

The current configuration will deploy only the backend API. You can test it with Postman or curl.

### Steps:
1. Push the updated code to your repository
2. In Railway dashboard, redeploy
3. The backend will be available at `https://your-app.railway.app`
4. Test the health endpoint: `https://your-app.railway.app/health`

## Option 2: Deploy as Two Separate Services (Recommended for Production)

### Step 1: Create Backend Service
1. In Railway dashboard, create a new service
2. Connect your GitHub repo
3. Set root directory to `/server`
4. Add these environment variables:
   ```
   PORT=${{PORT}}
   NEXT_PUBLIC_SUPABASE_URL=https://mcgezqqfraydhgmseevl.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   NODE_ENV=production
   ```

### Step 2: Create Frontend Service
1. Create another new service in Railway
2. Connect the same GitHub repo
3. Set root directory to `/client`
4. Add these environment variables:
   ```
   PORT=${{PORT}}
   NEXT_PUBLIC_SUPABASE_URL=https://mcgezqqfraydhgmseevl.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   NEXT_PUBLIC_APP_URL=https://your-frontend.railway.app
   CLIENT_URL=https://your-backend.railway.app
   ```

### Step 3: Update Frontend to Connect to Backend
After both services are deployed, update the frontend's environment variable:
```
NEXT_PUBLIC_API_URL=https://your-backend.railway.app
```

## Option 3: Use Vercel for Frontend + Railway for Backend

Since you have a Next.js app, you could:
1. Deploy frontend to Vercel (free tier available)
2. Deploy backend to Railway
3. Configure CORS to allow your Vercel domain

### Vercel Deployment:
```bash
cd client
npx vercel
```

Then update your Railway backend environment:
```
CLIENT_URL=https://your-app.vercel.app
```

## Quick Fix for Current Setup

To fix your current deployment, update these files and redeploy:

1. The changes we made ensure:
   - Backend runs on Railway's provided PORT
   - Only backend service starts (no port conflict)
   - Health check endpoint is available at `/health`

2. Commit and push:
   ```bash
   git add .
   git commit -m "Fix Railway deployment - backend only"
   git push
   ```

3. Railway will automatically redeploy

## Testing the Backend

Once deployed, test your backend:
```bash
# Check health
curl https://your-app.railway.app/health

# Should return:
# {"status":"ok","timestamp":"2024-01-29T..."}
```