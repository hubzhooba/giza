# Vercel Frontend Deployment

## Quick Deploy Steps

### 1. Navigate to client directory
```bash
cd client
```

### 2. Install Vercel CLI (if not already installed)
```bash
npm i -g vercel
```

### 3. Deploy to Vercel
```bash
vercel --prod
```

### 4. Follow the prompts:
- **Set up and deploy?** → Yes
- **Which scope?** → Select your account
- **Link to existing project?** → No (create new)
- **Project name?** → secure-contract-platform (or your choice)
- **Directory?** → ./ (current directory)
- **Override settings?** → No

## What Happens Next

1. Vercel will:
   - Detect Next.js automatically
   - Build your application
   - Deploy to production
   - Provide you with URLs

2. You'll get two URLs:
   - Preview: `https://secure-contract-platform-abc123.vercel.app`
   - Production: `https://secure-contract-platform.vercel.app`

## Post-Deployment Steps

### 1. Update Railway Backend CORS
Go to Railway dashboard and update the CLIENT_URL variable:
```
CLIENT_URL=https://secure-contract-platform.vercel.app
```

### 2. Update Frontend Environment (if needed)
If you need to change any environment variables:
1. Go to Vercel dashboard
2. Select your project
3. Go to Settings → Environment Variables
4. Update as needed
5. Redeploy

### 3. Test Your Application
1. Visit your Vercel URL
2. Create an account
3. Test the contract creation flow

## Environment Variables (Already Set)

The `vercel.json` file includes:
- `NEXT_PUBLIC_API_URL`: Points to your Railway backend
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase instance
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public Supabase key

## Troubleshooting

### Build Errors
If build fails, check:
- All TypeScript errors are fixed
- Dependencies are installed
- Environment variables are set

### CORS Errors
Make sure:
- CLIENT_URL in Railway matches your Vercel URL exactly
- Include https:// in the URL
- No trailing slash

### API Connection Issues
Verify:
- Backend is running on Railway
- API_URL is correct in Vercel env vars
- Health check works: `curl https://securecontract-production.up.railway.app/health`

## Custom Domain (Optional)

To add a custom domain:
1. Go to Vercel dashboard → Your project → Settings → Domains
2. Add your domain
3. Update DNS records as instructed
4. Update CLIENT_URL in Railway to match