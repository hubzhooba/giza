# Deployment Guide

## Quick Start Deployment Options

### Option 1: Vercel (Recommended for Testing) ⚡
**Time: 3 minutes | Free tier: Yes | Best for: Next.js apps**

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy
vercel

# 3. Follow the prompts:
# - Link to existing project? No
# - What's your project's name? freelance-contract-platform
# - In which directory is your code located? ./client
# - Want to override the settings? No
```

**After deployment:**
- Set environment variables in Vercel dashboard
- Your app will be live at: `https://your-app.vercel.app`

### Option 2: Local Testing with Public URL 🏠
**Time: 1 minute | Free tier: Yes | Best for: Quick testing**

```bash
# 1. Install ngrok
brew install ngrok  # Mac
# or download from https://ngrok.com

# 2. Start dev server
npm run dev

# 3. In another terminal, expose it
ngrok http 3000

# 4. Use the HTTPS URL provided by ngrok
```

### Option 3: Netlify 🔷
**Time: 5 minutes | Free tier: Yes | Good for: Static sites**

```bash
# 1. Install Netlify CLI
npm i -g netlify-cli

# 2. Build the project
cd client && npm run build

# 3. Deploy
netlify deploy --prod --dir=.next
```

### Option 4: Railway 🚂
**Time: 10 minutes | Free tier: Limited | Best for: Full-stack apps**

```bash
# 1. Install Railway CLI
npm i -g @railway/cli

# 2. Login
railway login

# 3. Initialize and deploy
railway init
railway up
```

## Environment Variables Setup

### Required Variables
```env
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Server
SERVER_PORT=3001
JWT_SECRET=your_secret_key
```

### Optional Variables
```env
# Blockchain
ARWEAVE_WALLET_KEY=your_arweave_key
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/your_key
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com

# AI Features
OPENAI_API_KEY=sk-your_key
```

## Platform-Specific Instructions

### Vercel
1. Connect GitHub repo for auto-deployments
2. Add environment variables in project settings
3. Enable Vercel Analytics (optional)

### Netlify
1. Connect GitHub repo
2. Set build command: `cd client && npm run build`
3. Set publish directory: `client/.next`
4. Add environment variables in site settings

### Railway
1. Create new project
2. Add services for frontend and backend
3. Configure environment variables
4. Set up custom domain (optional)

## Testing Document Signing

After deployment:

1. **Create Account**: Sign up with email
2. **Create Room**: Click "New Room"
3. **Upload Document**: Drag & drop PDF
4. **Add Fields**: Place signature fields
5. **Invite Signers**: Share the invite link
6. **Test Signing**: Sign as different users

## Troubleshooting

### "Module not found" errors
```bash
cd client && npm install
```

### Environment variables not working
- Restart the server after adding variables
- Check variable names start with `NEXT_PUBLIC_` for client-side

### Build failures
```bash
# Clear cache
rm -rf .next node_modules
npm install
npm run build
```

### CORS issues
Add your deployed URL to Supabase allowed URLs

## Production Checklist

- [ ] Set NODE_ENV=production
- [ ] Configure custom domain
- [ ] Enable SSL certificate
- [ ] Set up monitoring (Vercel Analytics, Sentry)
- [ ] Configure rate limiting
- [ ] Test all features
- [ ] Backup environment variables

## Quick Deploy Commands

```bash
# Vercel
vercel --prod

# Netlify
netlify deploy --prod

# Railway
railway up

# Heroku (requires Heroku CLI)
heroku create your-app-name
git push heroku main
```

Choose the platform that best fits your needs. Vercel is recommended for the quickest setup!