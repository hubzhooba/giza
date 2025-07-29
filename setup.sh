#!/bin/bash

echo "🚀 Setting up Freelance Contract Platform..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Copy environment file
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please edit .env with your actual credentials"
fi

# Create necessary directories
mkdir -p uploads temp

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your credentials:"
echo "   - Supabase URL and keys"
echo "   - Arweave wallet key (optional for now)"
echo "   - Blockchain RPC URLs (optional for now)"
echo "   - OpenAI API key (optional for now)"
echo ""
echo "2. Set up Supabase database (see README.md for SQL)"
echo ""
echo "3. Run the development server:"
echo "   npm run dev"
echo ""
echo "The app will be available at:"
echo "   - Frontend: http://localhost:3000"
echo "   - Backend: http://localhost:3001"