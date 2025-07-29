# Railway Deployment Guide

This guide will help you deploy the Freelance Contract Platform on Railway.

## Prerequisites

- Railway account (sign up at https://railway.app)
- Railway CLI installed
- Environment variables ready (see `.env.example`)

## Step 1: Install Railway CLI

```bash
curl -fsSL https://railway.app/install.sh | sh
```

## Step 2: Login to Railway

```bash
railway login
```

## Step 3: Initialize Railway Project

```bash
railway init
```

Select "Create new project" when prompted.

## Step 4: Configure Environment Variables

1. Go to your Railway dashboard
2. Select your project
3. Click on "Variables" tab
4. Add all the required environment variables from `.env.example`:

Required variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL` (will be provided by Railway after first deploy)
- `PORT` (set to 3001 for backend)

Optional variables for full functionality:
- `ARWEAVE_WALLET_KEY` (for blockchain storage)
- `NEXT_PUBLIC_ALCHEMY_API_KEY` (for Ethereum)
- `NEXT_PUBLIC_INFURA_API_KEY` (for Ethereum backup)
- `OPENAI_API_KEY` (for AI contract generation)

## Step 5: Deploy

```bash
railway up
```

This will:
1. Build both client and server
2. Deploy the application
3. Provide you with a deployment URL

## Step 6: Update APP_URL

After first deployment:
1. Copy the deployment URL from Railway
2. Update `NEXT_PUBLIC_APP_URL` environment variable with this URL
3. Redeploy: `railway up`

## Monitoring

- View logs: `railway logs`
- Open dashboard: `railway open`
- Check deployment status: `railway status`

## Troubleshooting

### Build Failures
- Ensure Node.js version is 18+ (Railway uses Node 18 by default)
- Check build logs: `railway logs --build`

### Runtime Errors
- Check environment variables are set correctly
- Ensure Supabase project is configured properly
- View runtime logs: `railway logs`

### Port Issues
- The backend runs on port 3001
- The frontend runs on port 3000
- Railway handles port mapping automatically

## Custom Domain

To add a custom domain:
1. Go to Railway dashboard
2. Select your project
3. Go to "Settings" → "Domains"
4. Add your custom domain
5. Update DNS records as instructed

## Scaling

Railway automatically handles:
- SSL certificates
- Load balancing
- Auto-scaling based on usage

For manual scaling:
1. Go to project settings
2. Adjust instance size
3. Configure replicas if needed