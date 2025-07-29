#!/bin/bash

echo "🚂 Deploying to Railway..."

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Login to Railway
echo "📝 Logging into Railway..."
railway login

# Initialize Railway project
echo "🚀 Initializing Railway project..."
railway init

# Link to the project
echo "🔗 Linking project..."
railway link

# Set up environment variables
echo "⚙️  Setting up environment variables..."
echo "Please add these environment variables in Railway dashboard:"
echo ""
echo "Required:"
echo "- NEXT_PUBLIC_SUPABASE_URL"
echo "- NEXT_PUBLIC_SUPABASE_ANON_KEY" 
echo "- SUPABASE_SERVICE_ROLE_KEY"
echo "- JWT_SECRET"
echo "- SERVER_PORT=3001"
echo ""
echo "Optional:"
echo "- ARWEAVE_WALLET_KEY"
echo "- OPENAI_API_KEY"
echo ""
echo "Press Enter after adding environment variables..."
read

# Deploy
echo "🚀 Deploying to Railway..."
railway up

echo "✅ Deployment complete!"
echo ""
echo "Your app should be available at your Railway URL"
echo "Run 'railway open' to view in dashboard"