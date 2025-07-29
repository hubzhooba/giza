#!/bin/bash

# Start the development server
echo "Starting development server..."
npm run dev &

# Wait for server to start
sleep 5

# Start ngrok
echo "Starting ngrok tunnel..."
ngrok http 3000

# Instructions
echo "
Your app is now accessible at the ngrok URL above.
Share this URL to test document signing with others.
"