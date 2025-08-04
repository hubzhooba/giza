# ArConnect Wallet Integration Guide

## Overview

Giza now fully supports ArConnect wallet authentication and signing across the entire application. All critical actions require wallet signatures for security.

## Setup Instructions

### 1. Install ArConnect Extension

1. Visit https://www.arconnect.io
2. Install the browser extension for Chrome/Firefox/Brave
3. Create or import your Arweave wallet
4. Make sure you have some AR tokens for transactions

### 2. Environment Setup

Create `/client/.env.local` with:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Optional: Arweave Gateway (defaults to arweave.net)
NEXT_PUBLIC_ARWEAVE_GATEWAY=https://arweave.net
```

### 3. Database Migration

Run the simplified Web3 auth migration in Supabase:

```sql
-- Run the contents of /database/migrations/web3-auth-migration-simple.sql
```

## Features Implemented

### 1. Wallet Authentication
- ✅ Connect with ArConnect wallet
- ✅ Session persistence with localStorage
- ✅ Username registration after first connection
- ✅ Balance display in dashboard
- ✅ Automatic disconnect on wallet switch

### 2. Signed Actions

All critical actions now require wallet signatures:

#### Document Upload
```typescript
// Automatically prompts for signature
const result = await uploadDocument(file.name, async () => {
  return await stoar.uploadDocument(data, metadata);
});
```

#### Contract Signing
```typescript
// Requires confirmation and signature
const result = await signDocument(documentId, documentName, async () => {
  // Sign contract logic
});
```

#### Tent Creation
```typescript
// Signature required to create new tent
const result = await createContract(tentName, async () => {
  // Create tent logic
});
```

### 3. STOAR Integration

STOAR SDK is fully integrated with ArConnect:

- Automatic wallet detection
- Batch uploads with 90% cost savings
- Progress tracking for uploads
- Error handling with retry logic

## User Flow

### First Time User

1. **Landing Page** → Click "Connect with ArConnect"
2. **Wallet Permission** → Approve permissions in ArConnect popup
3. **Profile Creation** → Automatic profile creation in Supabase
4. **Username Setup** → Redirected to `/onboarding` to set username
5. **Dashboard** → Access to all features with wallet authentication

### Returning User

1. **Landing Page** → Click "Connect with ArConnect"
2. **Wallet Recognition** → Automatic login with stored session
3. **Dashboard** → Direct access to tents and contracts

## Security Features

### Message Signing Format

All signed messages follow this format:

```
🔐 Giza Action Request

Action: [Action Name]
Wallet: [Wallet Address]
Timestamp: [ISO Timestamp]
Nonce: [Random Nonce]

Details:
- [Metadata Key]: [Value]

By signing this message, you authorize this action.

⚠️  Only sign if you initiated this action.
```

### Signature Verification

- Nonce prevents replay attacks
- Timestamp for audit trail
- Wallet address binding
- Action-specific metadata

## Component Updates

### Updated Components

1. **DocumentUpload.tsx**
   - Uses `useSignedAction` hook
   - Prompts for signature before upload
   - Shows upload progress

2. **DocumentViewer.tsx**
   - Wallet-based document signing
   - Shows wallet addresses in signatures
   - Connect wallet prompt if not connected

3. **New Tent Creation**
   - Requires wallet connection
   - Shows connected wallet status
   - Signature for tent creation

### Hooks Available

1. **useArConnect()**
   ```typescript
   const {
     isConnected,
     walletAddress,
     username,
     balance,
     connect,
     disconnect,
     signMessage,
     signTransaction
   } = useArConnect();
   ```

2. **useSignedAction()**
   ```typescript
   const {
     executeSignedAction,
     signDocument,
     uploadDocument,
     createContract,
     isSigningInProgress
   } = useSignedAction();
   ```

## Testing Checklist

### Basic Connection
- [ ] Install ArConnect extension
- [ ] Connect wallet from landing page
- [ ] Check wallet address displays correctly
- [ ] Check AR balance shows in dashboard
- [ ] Disconnect and reconnect works

### Username Setup
- [ ] New users redirected to /onboarding
- [ ] Username validation works
- [ ] Username saved correctly
- [ ] Can't use duplicate usernames

### Document Operations
- [ ] Upload document with signature
- [ ] Sign document with wallet
- [ ] Download encrypted document
- [ ] View signatures with wallet addresses

### Tent Operations
- [ ] Create new tent with signature
- [ ] Invite participants works
- [ ] Access control based on wallet

### Error Handling
- [ ] Signature rejection handled gracefully
- [ ] Network errors show proper messages
- [ ] Insufficient balance warnings
- [ ] Wallet disconnect during operation

## Troubleshooting

### Common Issues

1. **"Please install ArConnect extension first"**
   - Install ArConnect from https://www.arconnect.io
   - Refresh the page after installation

2. **"Failed to sign action"**
   - Check ArConnect is unlocked
   - Try disconnecting and reconnecting
   - Clear browser cache

3. **"Insufficient balance"**
   - Need at least 0.01 AR for transactions
   - Check balance in ArConnect extension

4. **Session Lost**
   - Sessions expire after 24 hours
   - Just reconnect with wallet

### Debug Mode

Open browser console and check for:
- ArConnect availability: `window.arweaveWallet`
- Current session: `localStorage.getItem('arweave_wallet_address')`
- STOAR initialization: Check for STOAR init messages

## Cost Estimation

### Storage Costs (with STOAR batching)
- Profile creation: < $0.001
- Document upload (1MB): ~$0.001-0.002
- Batch of 10 documents: ~$0.01-0.02

### Without STOAR batching
- 10x higher costs
- Individual transaction fees

## Next Steps

1. **Test all flows** with ArConnect wallet
2. **Monitor costs** in ArConnect extension
3. **Check Arweave explorer** for your transactions
4. **Enable production mode** when ready

## Support

- ArConnect Discord: https://discord.gg/arconnect
- Arweave Discord: https://discord.gg/arweave
- STOAR Documentation: https://github.com/0xLPircy/stoar-sdk

---

**Note**: All wallet interactions happen client-side. No private keys are ever sent to any server.