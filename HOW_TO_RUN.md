# How to Run and Access the Freelance Contract Platform

## 🚀 Local Development

### 1. Start Everything Locally

```bash
# From the root directory
npm run dev
```

This starts:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

### 2. Access the Application

1. **Open your browser**: Go to http://localhost:3000
2. **Sign up for an account**: Click "Sign Up" and create your account
3. **Start using the platform**:
   - Create contracts
   - Invite clients to sign
   - Generate invoices
   - Track payments

## 🌐 Production Access (After Deployment)

### Backend API (Railway)
Once deployed to Railway, your backend will be available at:
```
https://your-app-name.railway.app
```

Test it with:
```bash
curl https://your-app-name.railway.app/health
```

### Frontend Options

#### Option 1: Deploy to Vercel (Recommended)
```bash
cd client
npx vercel

# Follow prompts, then access at:
# https://your-app.vercel.app
```

#### Option 2: Deploy to Netlify
```bash
cd client
npm run build
npx netlify deploy --prod

# Access at:
# https://your-app.netlify.app
```

#### Option 3: Run Frontend Locally with Production Backend
```bash
# Set environment variable to point to Railway backend
export NEXT_PUBLIC_API_URL=https://your-railway-app.railway.app

# Run frontend
cd client
npm run dev

# Access at http://localhost:3000
```

## 📱 Features to Test

### 1. Contract Creation
- Go to "Contracts" → "Create New"
- Choose AI generation or upload PDF
- Add signature fields
- Send to clients

### 2. Document Signing
- Clients receive invite links
- They can review and sign documents
- Signatures are cryptographically verified

### 3. Invoice Generation
- After contract signing, create invoices
- Set payment schedules
- Accept crypto payments

### 4. Secure Rooms
- End-to-end encrypted communication
- Real-time collaboration
- Document sharing

## 🔧 Environment Setup

### Required Environment Variables
Create a `.env.local` file in the `client` directory:

```env
# Supabase (Already configured)
NEXT_PUBLIC_SUPABASE_URL=https://mcgezqqfraydhgmseevl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jZ2V6cXFmcmF5ZGhnbXNlZXZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2OTc3OTMsImV4cCI6MjA2OTI3Mzc5M30.6GwDnWTzxTT0zNhDHI7gL8bNawMDhaRLVbQ32gvaztU

# Backend URL (update after deployment)
NEXT_PUBLIC_API_URL=http://localhost:3001  # For local dev
# NEXT_PUBLIC_API_URL=https://your-railway-app.railway.app  # For production
```

Create a `.env` file in the `server` directory:

```env
# Supabase
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jZ2V6cXFmcmF5ZGhnbXNlZXZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzY5Nzc5MywiZXhwIjoyMDY5MjczNzkzfQ.7lc6HiEjcJVTzDNkkT1Rt_CWgcNXYEhT0U4E9GUitAc

# Server Port
PORT=3001

# Client URL (for CORS)
CLIENT_URL=http://localhost:3000  # For local dev
# CLIENT_URL=https://your-frontend.vercel.app  # For production
```

## 🧪 Testing the Application

### 1. Create a Test Account
- Sign up with your email
- Verify the account (check Supabase dashboard if email not received)

### 2. Test Contract Flow
```
1. Create Contract → 2. Add Fields → 3. Invite Signer → 4. Sign Document → 5. Create Invoice
```

### 3. Test API Endpoints
```bash
# Health check
curl http://localhost:3001/health

# WebSocket connection (for real-time features)
# Will be tested automatically when using the app
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill existing processes
pkill -f "node.*3000"
pkill -f "node.*3001"

# Or find and kill specific process
lsof -i :3000
lsof -i :3001
kill -9 <PID>
```

### Database Connection Issues
1. Check Supabase dashboard is accessible
2. Verify environment variables are correct
3. Check if your IP is allowed in Supabase settings

### Build Errors
```bash
# Clean install
npm run clean
npm install
npm run build
```

## 📊 Monitoring

### Local Development
- Frontend logs: Terminal where `npm run dev` is running
- Backend logs: Same terminal (concurrent output)
- Browser console: F12 → Console tab

### Production
- Railway logs: `railway logs` or dashboard
- Vercel logs: Vercel dashboard → Functions tab
- Supabase logs: Supabase dashboard → Logs

## 🎯 Quick Start Commands

```bash
# Full local setup
git clone <your-repo>
cd freelance-contract-platform
npm install
npm run dev

# Open browser
open http://localhost:3000

# Deploy backend
railway up

# Deploy frontend
cd client && npx vercel
```

## 📝 Next Steps

1. **Set up payment processing**: Add Stripe/crypto payment keys
2. **Configure email**: Add SMTP settings for notifications
3. **Add custom domain**: Configure in Railway/Vercel settings
4. **Enable blockchain features**: Add Arweave wallet for permanent storage