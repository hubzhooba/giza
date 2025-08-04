# STOAR Integration Setup Guide

## Prerequisites

1. Supabase project set up
2. Arweave wallet (for STOAR)
3. Node.js 18+ installed

## Step 1: Database Setup

Run these SQL scripts in your Supabase SQL Editor **in this order**:

### 1.1 First, run the existing migrations (if not already done):
```bash
# Run these in Supabase SQL Editor:
/database/migrations/create-profiles-table.sql
/database/migrations/database-schema.sql
/database/migrations/two-party-schema.sql
```

### 1.2 Then run the new STOAR migration:
```bash
# Run this to add Arweave fields:
/database/migrations/add-arweave-fields.sql
```

## Step 2: Environment Variables

### 2.1 Client Environment (.env.local)

Create `/client/.env.local` with:

```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# API (Required)
NEXT_PUBLIC_API_URL=http://localhost:3001

# Arweave/STOAR (Optional but recommended)
# Option 1: Use JSON wallet key (get from https://arweave.app)
NEXT_PUBLIC_ARWEAVE_WALLET_KEY={"kty":"RSA","n":"...your-wallet-json..."}

# Option 2: Leave empty to use ArConnect browser extension
# NEXT_PUBLIC_ARWEAVE_WALLET_KEY=

# Optional: Custom gateway (defaults to https://arweave.net)
NEXT_PUBLIC_ARWEAVE_GATEWAY=https://arweave.net
```

### 2.2 Server Environment (.env)

Create `/server/.env` with:

```bash
# Server
PORT=3001
NODE_ENV=development

# Supabase (Required)
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# JWT (Required)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# Arweave/STOAR (Required for server-side uploads)
ARWEAVE_WALLET_KEY={"kty":"RSA","n":"...your-wallet-json..."}
ARWEAVE_GATEWAY=https://arweave.net

# Optional
OPENAI_API_KEY=your_openai_key_if_using_ai_features
```

## Step 3: Getting an Arweave Wallet

### Option 1: ArConnect (Browser Extension) - Client Only
1. Install ArConnect from: https://www.arconnect.io/
2. Create a new wallet
3. Get some AR tokens from a faucet or exchange
4. No configuration needed - the app will detect it

### Option 2: JSON Wallet File - Client & Server
1. Go to https://arweave.app
2. Click "Generate Wallet"
3. Download the JSON keyfile
4. Copy the entire JSON content
5. Paste it as the value for `ARWEAVE_WALLET_KEY` in your .env files

**Important**: You need some AR tokens to upload files. Get them from:
- Faucet: https://faucet.arweave.net/ (small amounts for testing)
- Exchange: Buy AR tokens and send to your wallet address

## Step 4: Install Dependencies

```bash
# From project root
npm install
```

## Step 5: Run the Application

```bash
# From project root
npm run dev
```

This will start:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## Step 6: Test STOAR Integration

### Test 1: Single Document Upload
1. Create a new tent/room
2. Upload a PDF document
3. Add signature fields and save
4. Check console for "Document uploaded to Arweave successfully!"
5. Check the document viewer - should show "Stored on Arweave" badge

### Test 2: Batch Document Upload
1. Go to a tent/room
2. Look for the Batch Upload component (if implemented in the UI)
3. Select multiple files
4. Click "Upload Batch"
5. Check for bundle ID in success message

### Test 3: Document Archive
1. Navigate to `/documents/archive`
2. Should see all documents stored on Arweave
3. Click on a document to view details
4. Try downloading the encrypted JSON

### Test 4: Check Wallet Balance
1. Look for balance display in upload components
2. Should show "Balance: X.XXXX AR"

## Troubleshooting

### "Failed to connect to Arweave wallet"
- Check if ArConnect is installed (for browser wallet)
- Verify JSON wallet key is valid and properly formatted
- Ensure wallet has some AR balance

### "Insufficient balance"
- You need AR tokens to upload
- Each upload costs a small amount
- Get tokens from faucet or exchange

### "Document saved locally. Arweave upload failed"
- Check your internet connection
- Verify wallet configuration
- Check browser console for detailed errors

### Build Errors
```bash
# Clean install if you get dependency errors
rm -rf node_modules package-lock.json
npm install
```

## Checking Upload Status

### In the UI:
- Look for the cloud icon (☁️) next to documents
- "Stored on Arweave" badge indicates successful upload

### In Supabase:
```sql
-- Check documents with Arweave IDs
SELECT id, name, "arweaveId", "arweaveUrl" 
FROM documents 
WHERE "arweaveId" IS NOT NULL;
```

### On Arweave:
- Copy the transaction ID from the document
- Visit: `https://viewblock.io/arweave/tx/[TRANSACTION_ID]`

## Cost Estimates

- Single document: ~0.0001 AR
- Batch of 10 documents: ~0.0001 AR (90% savings!)
- Current AR price: Check https://www.coingecko.com/en/coins/arweave

## Next Steps

Once everything is working:
1. Upload some test documents
2. Verify they appear in the archive
3. Test downloading from Arweave
4. Check batch upload for cost savings
5. Monitor your wallet balance

Need help? Check:
- Browser console for errors
- Network tab for API calls
- Supabase logs for database issues