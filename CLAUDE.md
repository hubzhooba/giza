# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Giza (formerly SecureContract) is a Web3-enabled platform for freelancers to create secure contracts, obtain digital signatures, and receive cryptocurrency payments through blockchain-powered escrow. The platform combines traditional web technologies with blockchain integration for contract management.

## Development Commands

### Core Development
```bash
npm run dev              # Runs both frontend (port 3000) and backend (port 3001) concurrently
npm run dev:client       # Frontend development server only
npm run dev:server       # Backend development server only
npm run build            # Builds both client and server for production
npm run lint             # Lints all workspaces
npm run clean            # Clean all node_modules and build artifacts
npm run start:railway    # Start production server for Railway deployment
```

### Frontend Commands (in client/ directory)
```bash
npm run dev              # Start Next.js development server
npm run build            # Build Next.js application
npm run lint             # Run Next.js linting
npm run export           # Static export
npm run deploy:vercel    # Deploy to Vercel
npm run deploy:netlify   # Deploy to Netlify
```

### Backend Commands (in server/ directory)
```bash
npm run dev              # Development with tsx watch
npm run build            # TypeScript compilation
npm run start            # Production start
npm run lint             # ESLint on TypeScript files
```

### Testing
No test commands are currently configured. When implementing tests, consider adding:
- Unit tests for crypto/encryption utilities in `client/src/lib/crypto/`
- Integration tests for API endpoints in `server/src/routes/`
- E2E tests for critical user flows (contract creation, signing, payment)

### Common Development Tasks
```bash
# Clean install when dependencies issues occur
rm -rf node_modules package-lock.json
npm install

# Kill processes on ports if already in use
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9

# Set up initial environment
cp client/.env.example client/.env.local
mkdir -p uploads temp
```

## Architecture Overview

### Monorepo Structure
Uses npm workspaces to manage frontend and backend packages:
- `/client` - Next.js 14 frontend with TypeScript and Tailwind CSS
- `/server` - Express.js backend with TypeScript and Socket.io
- `/contracts` - Smart contract code (currently empty - planned for escrow contracts)
- `/database` - Database migrations and setup scripts
- `/scripts` - Deployment and utility scripts

### Key Technologies

**Frontend Stack:**
- Next.js 14 with file-based routing (pages directory)
- TypeScript for type safety
- Tailwind CSS with custom glassmorphism theme
- Zustand for state management (`client/src/store/`)
- React Query (@tanstack) for data fetching
- PDF.js and pdf-lib for document handling
- Libsodium for client-side encryption
- React Hook Form for form management
- Framer Motion for animations

**Backend Stack:**
- Express.js with TypeScript
- Socket.io for real-time communication
- ESM modules (type: "module" in package.json)
- Supabase for auth and database
- JWT for additional authentication
- Multer for file uploads
- Winston for logging
- Zod for request validation

**Blockchain Integration:**
- Ethers.js v6 and Web3.js v4 for Ethereum/EVM chains
- Solana Web3.js for Solana blockchain
- Arweave for permanent document storage
- Smart contract escrow system (in development)
- Multi-chain support: Ethereum, Polygon, Arbitrum, Optimism, BSC, Avalanche, Solana

### Core Features Architecture

1. **Secure Rooms** (`client/src/pages/rooms/`) - End-to-end encrypted spaces for contract negotiation
   - Encryption handled by libsodium (`client/src/lib/crypto/`)
   - Room keys stored in Supabase with user association
   - Real-time updates via Socket.io
   
2. **Document Management** (`client/src/components/documents/`) - PDF upload, editing, and signing
   - PDF manipulation via pdf-lib
   - Digital signatures using public key cryptography
   - Permanent storage on Arweave blockchain
   - Document templates in `client/src/lib/templates/`

3. **Payment System** (`client/src/components/invoices/`) - Invoice generation and crypto payments
   - Multiple blockchain network support
   - Smart contract escrow for milestone-based payments
   - Integration with MetaMask and other Web3 wallets
   - Payment processing in `client/src/lib/blockchain/`

4. **AI Features** (`server/src/controllers/ai.controller.ts`) - Contract generation and suggestions
   - OpenAI integration for contract templates
   - Context-aware suggestions based on contract type
   - Prompt templates in `server/src/prompts/`

### Key File Locations

**Frontend:**
- Pages: `client/src/pages/`
- Components: `client/src/components/`
- Blockchain logic: `client/src/lib/blockchain/`
- Encryption utilities: `client/src/lib/crypto/`
- Supabase client: `client/src/lib/supabase/client.ts`
- State management: `client/src/store/`
- Type definitions: `client/src/types/`

**Backend:**
- Entry point: `server/src/index.ts`
- API routes: `server/src/routes/`
- Controllers: `server/src/controllers/`
- Services: `server/src/services/`
- Middleware: `server/src/middleware/`
- Type definitions: `server/src/types/`

### Database Schema
Uses Supabase (PostgreSQL) with tables for:
- `profiles` - User profiles with public keys
- `rooms` - Encrypted contract negotiation spaces
- `documents` - Contract documents with Arweave references
- `invoices` - Payment invoices with crypto payment details
- `signatures` - Digital signatures for documents
- `templates` - Contract templates

Migration files located in:
- `client/src/lib/create-profiles-table.sql`
- `client/src/lib/clean-policy-migration.sql`

### Environment Configuration
Critical environment variables:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Public Supabase key
- `SUPABASE_SERVICE_ROLE_KEY` - Server-side Supabase key
- `ARWEAVE_WALLET_KEY` - For blockchain document storage
- `OPENAI_API_KEY` - For AI features
- `JWT_SECRET` - For JWT token signing
- `SERVER_PORT` - Backend server port (default: 3001)
- Various RPC URLs for blockchain networks (see `client/.env.example`)

### Security Considerations
- All documents are encrypted client-side before storage
- Public key infrastructure for digital signatures
- Zero-knowledge architecture - platform cannot access encrypted content
- Smart contract escrow ensures payment security
- Rate limiting on API endpoints
- Helmet.js for security headers
- CORS configuration for frontend-backend communication

### Deployment
- **Frontend**: Vercel or Netlify (configuration in `vercel.json`)
- **Backend**: Railway (configuration in `railway.toml`)
- **Database**: Supabase
- Health check endpoint: `GET /health`
- Production environment variables required for deployment

### Development Workflow
1. Always run `npm install` at root level (uses workspaces)
2. Use `npm run dev` to start both frontend and backend
3. Frontend changes hot-reload automatically
4. Backend uses tsx watch for auto-restart
5. Check browser console and terminal for errors
6. Use React Query DevTools in development
7. Socket.io events can be monitored in browser DevTools