# Deployment Guide for Giza

Since Giza is now a Web3-native dApp that doesn't require a backend server, you should deploy only the frontend.

## Recommended Deployment Options

### Option 1: Vercel (Recommended)

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Deploy from client directory**:
   ```bash
   cd client
   vercel
   ```

3. **Set environment variables in Vercel dashboard**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Remove `NEXT_PUBLIC_API_URL` (not needed anymore)

4. **Update vercel.json**:
   ```json
   {
     "buildCommand": "cd client && npm install && npm run build",
     "outputDirectory": "client/.next",
     "framework": "nextjs",
     "installCommand": "npm install"
   }
   ```

### Option 2: Netlify

1. **Create netlify.toml**:
   ```toml
   [build]
     base = "client"
     command = "npm run build"
     publish = ".next"

   [[plugins]]
     package = "@netlify/plugin-nextjs"

   [build.environment]
     NEXT_PUBLIC_SUPABASE_URL = "your_supabase_url"
     NEXT_PUBLIC_SUPABASE_ANON_KEY = "your_supabase_anon_key"
   ```

2. **Deploy**:
   ```bash
   cd client
   npm run deploy:netlify
   ```

### Option 3: Static Export to IPFS/Arweave

For a fully decentralized deployment:

1. **Update next.config.js**:
   ```javascript
   module.exports = {
     output: 'export',
     // ... other config
   };
   ```

2. **Build static files**:
   ```bash
   cd client
   npm run build
   npm run export
   ```

3. **Upload to IPFS**:
   ```bash
   ipfs add -r out/
   ```

4. **Or upload to Arweave using arkb**:
   ```bash
   npm install -g arkb
   arkb deploy out/ --wallet wallet.json
   ```

## Why Not Railway?

Railway is designed for backend services that expose health check endpoints. Since Giza is now a client-only Web3 dApp that uses:
- ArConnect for authentication
- Arweave for storage
- Supabase for indexing (optional)

There's no need for a backend server, so Railway isn't the right choice.

## Environment Variables

For any deployment platform, you only need:

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional
NEXT_PUBLIC_ARWEAVE_GATEWAY=https://arweave.net
```

## Quick Deploy Commands

### Vercel
```bash
cd client && vercel --prod
```

### Netlify
```bash
cd client && netlify deploy --prod
```

### GitHub Pages (Static)
```bash
cd client
npm run build && npm run export
# Push out/ directory to gh-pages branch
```

## Post-Deployment

1. Update your domain DNS settings
2. Enable HTTPS (automatic on Vercel/Netlify)
3. Test wallet connection flow
4. Monitor Arweave transaction costs

## Continuous Deployment

### With GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd client && npm install
      - run: cd client && npm run build
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          working-directory: ./client
```

## Cost Considerations

- **Vercel/Netlify**: Free tier usually sufficient
- **IPFS**: Pay for pinning service (optional)
- **Arweave**: One-time payment for permanent hosting
- **Traditional hosting**: Not recommended for Web3 dApps

Choose based on your decentralization requirements!