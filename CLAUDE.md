# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SecureContract is a Web3-enabled platform for freelancers to create secure contracts, obtain digital signatures, and receive cryptocurrency payments through blockchain-powered escrow. The platform combines traditional web technologies with blockchain integration for contract management.

## Development Commands

### Core Development
- `npm run dev` - Runs both frontend (port 3000) and backend (port 3001) concurrently
- `npm run dev:client` - Runs only the frontend development server
- `npm run dev:server` - Runs only the backend development server
- `npm run build` - Builds both client and server for production

### Frontend (in client/ directory)
- `npm run lint` - Run Next.js linting
- `npm run build` - Build the Next.js application

### Backend (in server/ directory)
- `npm run lint` - Run ESLint on TypeScript files
- `npm run build` - Compile TypeScript to JavaScript

### Testing
No test commands are currently configured. When implementing tests, consider adding:
- Unit tests for crypto/encryption utilities
- Integration tests for API endpoints
- E2E tests for critical user flows

## Architecture Overview

### Monorepo Structure
Uses npm workspaces to manage frontend and backend packages:
- `/client` - Next.js 14 frontend with TypeScript and Tailwind CSS
- `/server` - Express.js backend with TypeScript and Socket.io
- `/contracts` - Smart contract code (currently empty)

### Key Technologies

**Frontend Stack:**
- Next.js 14 with file-based routing (pages directory)
- TypeScript for type safety
- Tailwind CSS for styling
- Zustand for state management
- React Query for data fetching
- PDF.js and pdf-lib for document handling
- Libsodium for client-side encryption

**Backend Stack:**
- Express.js with TypeScript
- Socket.io for real-time communication
- Supabase for auth and database
- Multiple blockchain integrations (Ethereum, Polygon, Solana)

**Blockchain Integration:**
- Ethers.js and Web3.js for Ethereum/EVM chains
- Solana Web3.js for Solana
- Arweave for permanent document storage
- Smart contract escrow system (in development)

### Core Features Architecture

1. **Secure Rooms** - End-to-end encrypted spaces for contract negotiation
   - Encryption handled by libsodium
   - Keys stored in Supabase with user association
   
2. **Document Management** - PDF upload, editing, and signing
   - PDF manipulation via pdf-lib
   - Digital signatures using public key cryptography
   - Permanent storage on Arweave blockchain

3. **Payment System** - Invoice generation and crypto payments
   - Multiple blockchain network support
   - Smart contract escrow for milestone-based payments
   - Integration with MetaMask and other Web3 wallets

4. **AI Features** - Contract generation and suggestions
   - OpenAI integration for contract templates
   - Context-aware suggestions based on contract type

### Database Schema
Uses Supabase (PostgreSQL) with tables for:
- `profiles` - User profiles with public keys
- `rooms` - Encrypted contract negotiation spaces
- `documents` - Contract documents with Arweave references
- `invoices` - Payment invoices with crypto payment details

### Environment Configuration
Critical environment variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public Supabase key
- `SUPABASE_SERVICE_ROLE_KEY` - Server-side Supabase key
- `ARWEAVE_WALLET_KEY` - For blockchain document storage
- `OPENAI_API_KEY` - For AI features
- Various RPC URLs for blockchain networks

### Security Considerations
- All documents are encrypted client-side before storage
- Public key infrastructure for digital signatures
- Zero-knowledge architecture - platform cannot access encrypted content
- Smart contract escrow ensures payment security