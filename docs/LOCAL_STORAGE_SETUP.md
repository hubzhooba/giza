# PDF Storage Solutions

Currently, PDFs are not being stored permanently because Arweave requires:
1. A funded wallet (costs money)
2. Private key configuration

## Current Issue
When you upload a PDF, it's only stored in memory temporarily. That's why users can't see the PDF after page refresh.

## Quick Solutions

### Option 1: Use Supabase Storage (Recommended for Now)
Supabase includes free file storage. Here's how to set it up:

1. **Go to Supabase Dashboard**
   - https://supabase.com/dashboard
   - Select your project

2. **Enable Storage**
   - Go to Storage section
   - Create a bucket called `contracts`
   - Set it to private (authenticated users only)

3. **Update your app** to use Supabase storage instead of Arweave

### Option 2: Base64 in Database (Quick Fix)
Store the PDF as base64 in your existing database:
- Pros: Works immediately, no extra setup
- Cons: Limited to smaller PDFs (~1-2MB)

### Option 3: Use IPFS (Free Alternative)
- Use services like Pinata or Web3.Storage
- Free tier available
- Decentralized like Arweave

### Option 4: Local Development Storage
For testing, store files temporarily in browser:
- localStorage for small files
- IndexedDB for larger files

## Temporary Workaround

For now, you can:
1. Use AI-generated contracts (text-based, no PDF upload needed)
2. Or implement one of the storage solutions above

## Future: Arweave Setup

When ready to use Arweave:
1. Create wallet at https://arweave.app
2. Get AR tokens (small amount for testing)
3. Add private key to Railway environment:
   ```
   ARWEAVE_WALLET_KEY=your-wallet-json-key
   ```

Would you like me to implement Supabase storage as a temporary solution?