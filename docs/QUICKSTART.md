# Quick Start Guide

## 1. Initial Setup (5 minutes)

Run the setup script:
```bash
./setup.sh
```

Or manually:
```bash
npm install
cp .env.example .env
mkdir -p uploads temp
```

## 2. Configure Environment

### Option A: Minimal Setup (Just to see it working)
Edit `.env` and add these minimal values:
```env
# Use Supabase's free tier
NEXT_PUBLIC_SUPABASE_URL=https://xyzcompany.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Server config
SERVER_PORT=3001
JWT_SECRET=your-secret-key-here

# These can be dummy values for now
ARWEAVE_WALLET_KEY=dummy-key
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/dummy
OPENAI_API_KEY=sk-dummy-key
```

### Option B: Full Setup
1. **Create a Supabase account** (free): https://supabase.com
2. Create a new project and get your API keys
3. Run the SQL from README.md in Supabase SQL editor
4. Add your real keys to `.env`

## 3. Run the Application

```bash
npm run dev
```

This starts both frontend (port 3000) and backend (port 3001).

## 4. Access the Application

Open your browser to: http://localhost:3000

## 5. Test the Application

### Without Supabase (Limited functionality):
- Browse the landing page
- View the UI components
- See the contract templates

### With Supabase:
1. Sign up for an account
2. Create a secure room
3. Upload a PDF document
4. Invite participants (use fake emails)
5. Sign documents
6. Create invoices

## Common Issues

### Port already in use
```bash
# Kill processes on ports
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
```

### Dependencies issues
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Can't connect to Supabase
- Check your Supabase URL and keys in `.env`
- Make sure you've created the required tables

## Features Available Without External Services

✅ Can use:
- UI/UX exploration
- PDF viewer (with sample PDFs)
- Contract templates browsing
- Local encryption testing

❌ Need external services for:
- User authentication (Supabase)
- Document storage (Arweave)
- Crypto payments (Web3 wallet)
- AI contract generation (OpenAI)

## Next Steps

1. **Set up Supabase** for full functionality
2. **Get MetaMask** for crypto features
3. **Deploy smart contracts** for escrow
4. **Add OpenAI key** for AI features

## Development Tips

### Frontend only:
```bash
cd client && npm run dev
```

### Backend only:
```bash
cd server && npm run dev
```

### Build for production:
```bash
npm run build
```