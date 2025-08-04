# Railway Deployment Guide

## Required Environment Variables

To deploy the server on Railway, you need to set the following environment variables in your Railway project:

### Required Variables

```bash
# From your client/.env file
SUPABASE_URL=https://mcgezqqfraydhgmseevl.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1jZ2V6cXFmcmF5ZGhnbXNlZXZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzY5Nzc5MywiZXhwIjoyMDY5MjczNzkzfQ.7lc6HiEjcJVTzDNkkT1Rt_CWgcNXYEhT0U4E9GUitAc

# Generate a secure JWT secret
JWT_SECRET=your_secure_jwt_secret_here

# Server port (Railway will override this)
SERVER_PORT=3001
```

### Optional Variables

These are not required for basic functionality:

```bash
# OpenAI for AI features (optional)
OPENAI_API_KEY=your_openai_api_key

# Email notifications (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
```

## Setting Variables in Railway

1. Go to your Railway project dashboard
2. Click on your service
3. Go to the "Variables" tab
4. Click "Raw Editor"
5. Paste the required variables
6. Click "Save Changes"

## Important Notes

- **ARWEAVE_WALLET_KEY**: Not needed on the server. The platform uses client-side wallets (ArConnect) for document uploads.
- **JWT_SECRET**: Generate a secure random string for production use.
- The server will now start successfully without ARWEAVE_WALLET_KEY.

## Deployment Command

Railway will automatically use the start command from package.json:
```bash
npm run start:railway
```

This builds and runs the TypeScript server in production mode.