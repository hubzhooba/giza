#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the .env file
const envPath = path.join(__dirname, '../.env');
const envContent = fs.readFileSync(envPath, 'utf8');

// Find the ARWEAVE_WALLET_KEY line
const lines = envContent.split('\n');
let walletKeyStartIndex = -1;
let walletKeyEndIndex = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].startsWith('ARWEAVE_WALLET_KEY=')) {
    walletKeyStartIndex = i;
    // Find the end of the JSON (look for the closing brace)
    for (let j = i; j < lines.length; j++) {
      if (lines[j].includes('}')) {
        walletKeyEndIndex = j;
        break;
      }
    }
    break;
  }
}

if (walletKeyStartIndex === -1) {
  console.error('❌ Could not find ARWEAVE_WALLET_KEY in .env file');
  process.exit(1);
}

// Extract the wallet key JSON
let walletKeyLines = [];
for (let i = walletKeyStartIndex; i <= walletKeyEndIndex; i++) {
  if (i === walletKeyStartIndex) {
    // Get everything after the equals sign
    walletKeyLines.push(lines[i].substring(lines[i].indexOf('=') + 1));
  } else {
    walletKeyLines.push(lines[i]);
  }
}

// Join all lines and remove extra whitespace
let walletKeyJson = walletKeyLines.join('').trim();

// Parse to validate it's valid JSON
try {
  JSON.parse(walletKeyJson);
  console.log('✅ Wallet key is valid JSON');
} catch (error) {
  console.error('❌ Invalid JSON:', error.message);
  process.exit(1);
}

// Reconstruct the env file with the fixed wallet key
let newEnvContent = '';
let skipUntil = -1;

for (let i = 0; i < lines.length; i++) {
  if (i === walletKeyStartIndex) {
    newEnvContent += `ARWEAVE_WALLET_KEY=${walletKeyJson}\n`;
    skipUntil = walletKeyEndIndex;
  } else if (i > skipUntil) {
    newEnvContent += lines[i] + (i < lines.length - 1 ? '\n' : '');
  }
}

// Write the fixed content back
fs.writeFileSync(envPath, newEnvContent);
console.log('✅ Fixed ARWEAVE_WALLET_KEY formatting in .env file');

// Also update client and server .env files
const clientEnvPath = path.join(__dirname, '../client/.env.local');
const serverEnvPath = path.join(__dirname, '../server/.env');

// Update client .env.local if it exists
if (fs.existsSync(clientEnvPath)) {
  let clientEnv = fs.readFileSync(clientEnvPath, 'utf8');
  if (clientEnv.includes('NEXT_PUBLIC_ARWEAVE_WALLET_KEY=')) {
    clientEnv = clientEnv.replace(
      /NEXT_PUBLIC_ARWEAVE_WALLET_KEY=.*/,
      `NEXT_PUBLIC_ARWEAVE_WALLET_KEY=${walletKeyJson}`
    );
    fs.writeFileSync(clientEnvPath, clientEnv);
    console.log('✅ Updated client/.env.local');
  }
}

// Update server .env if it exists
if (fs.existsSync(serverEnvPath)) {
  let serverEnv = fs.readFileSync(serverEnvPath, 'utf8');
  if (serverEnv.includes('ARWEAVE_WALLET_KEY=')) {
    serverEnv = serverEnv.replace(
      /ARWEAVE_WALLET_KEY=.*/,
      `ARWEAVE_WALLET_KEY=${walletKeyJson}`
    );
    fs.writeFileSync(serverEnvPath, serverEnv);
    console.log('✅ Updated server/.env');
  }
}

console.log('\n🎉 Wallet key formatting fixed successfully!');