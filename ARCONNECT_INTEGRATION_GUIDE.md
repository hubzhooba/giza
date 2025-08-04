# ArConnect Wallet Integration Guide

## Overview

Giza now uses ArConnect wallet for authentication instead of traditional email/password. Users must connect their Arweave wallet to access the platform.

## What's Changed

### 1. **Authentication System**
- **Old**: Email/password with Supabase Auth
- **New**: ArConnect wallet authentication
- Users are identified by their Arweave wallet address
- Sessions are managed via JWT tokens and database sessions

### 2. **User Registration**
- **Old**: Sign up with email/password
- **New**: Connect wallet → Choose username
- First-time users are redirected to `/onboarding` to set their username

### 3. **Database Schema**
- Added `wallet_address` as primary identifier
- Added `username` field for display names
- Created `wallet_sessions` table for session management
- Created `wallet_activity` table for tracking user actions
- Updated all foreign keys to support wallet-based relationships

### 4. **UI/UX Changes**
- Beautiful new landing page with Web3 aesthetic
- Wallet balance displayed in dashboard and navbar
- Username displayed instead of email
- Disconnect button to logout

## Setup Instructions

### 1. Run Database Migration

```sql
-- Run in Supabase SQL Editor
-- File: /database/migrations/wallet-auth-migration.sql
```

This migration:
- Adds wallet authentication fields
- Creates session management tables
- Updates RLS policies for wallet-based auth
- Creates helper functions for authentication

### 2. Install ArConnect Extension

1. Visit https://www.arconnect.io/
2. Install the browser extension
3. Create or import an Arweave wallet
4. Get some AR tokens (for document uploads)

### 3. Environment Variables

No changes needed to environment variables. The app will automatically detect and use ArConnect.

## User Flow

### New User
1. Visit homepage → Click "Connect with ArConnect"
2. Approve permissions in ArConnect popup
3. Redirected to `/onboarding` to choose username
4. Username must be unique, 3-20 characters
5. After setting username → Redirected to dashboard

### Existing User
1. Visit homepage → Click "Connect with ArConnect"
2. Approve permissions in ArConnect popup
3. Redirected directly to dashboard
4. Can start creating tents and uploading documents

## Features

### Wallet Balance Display
- Real-time AR balance shown in dashboard
- Updates every minute automatically
- Displayed in sidebar and top navbar

### Session Management
- Sessions last 7 days by default
- Automatic logout on wallet disconnect
- Session validated on each request
- Secure JWT tokens for API calls

### Protected Routes
- All pages except landing require wallet connection
- Automatic redirect to home if disconnected
- HOC `withArConnectAuth` for page protection

## API Endpoints

### Authentication
- `POST /api/auth/wallet-login` - Login/register with wallet
- `GET /api/auth/validate-session` - Validate current session
- `GET /api/auth/check-username` - Check username availability
- `POST /api/auth/set-username` - Set username (one-time)
- `POST /api/auth/update-balance` - Update cached balance
- `GET /api/auth/profile` - Get user profile data

## Code Examples

### Using ArConnect Hook
```typescript
import { useArConnect } from '@/contexts/ArConnectContext';

function MyComponent() {
  const { 
    walletAddress, 
    username, 
    balance, 
    connect, 
    disconnect 
  } = useArConnect();
  
  // Use wallet data in your component
}
```

### Protecting Pages
```typescript
import { withArConnectAuth } from '@/contexts/ArConnectContext';

function ProtectedPage() {
  // Page content
}

export default withArConnectAuth(ProtectedPage);
```

### Checking Authentication
```typescript
const { isConnected, isLoading } = useArConnect();

if (isLoading) return <Spinner />;
if (!isConnected) return <ConnectPrompt />;
```

## Security Considerations

1. **Wallet Security**
   - Never share your wallet seed phrase
   - ArConnect handles private key security
   - App never has access to private keys

2. **Session Security**
   - Sessions expire after 7 days
   - JWT tokens for API authentication
   - Wallet address validation on each request

3. **Data Privacy**
   - All documents still end-to-end encrypted
   - Wallet address is public, username is public
   - No email or personal data required

## Troubleshooting

### "ArConnect not detected"
- Install ArConnect extension
- Refresh the page after installation
- Check if extension is enabled

### "Failed to connect wallet"
- Unlock ArConnect if locked
- Approve all requested permissions
- Check browser console for errors

### "Username already taken"
- Choose a different username
- Usernames are case-insensitive
- Only alphanumeric, underscore, hyphen allowed

### "Session expired"
- Reconnect your wallet
- Sessions last 7 days
- Check if wallet was switched

## Benefits of Wallet Auth

1. **No Passwords** - More secure, no password leaks
2. **Decentralized** - You control your identity
3. **Integrated Payments** - Wallet ready for AR transactions
4. **Privacy** - No email or personal info needed
5. **Permanent Storage** - Direct integration with Arweave

## Migration from Email Auth

For existing users with email accounts:
1. Current email accounts will continue working
2. Future update will allow linking wallet to email account
3. All data will be preserved during migration

## Next Steps

1. **Get AR Tokens** - Visit https://faucet.arweave.net/ for test tokens
2. **Set Username** - Choose a unique username after connecting
3. **Upload Documents** - Start using STOAR for permanent storage
4. **Invite Clients** - Share tent links for contract collaboration

## Support

- **ArConnect Issues**: https://discord.gg/arconnect
- **Giza Issues**: https://github.com/hubzhooba/giza/issues
- **Documentation**: Check `/docs` folder for more guides