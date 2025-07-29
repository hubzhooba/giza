# Giza - Secure Contract Platform

A blockchain-enabled platform for secure contract creation, digital signatures, and cryptocurrency payments with end-to-end encryption.

## 🚀 Features

- 🔐 **End-to-End Encryption** - Secure two-party contract negotiation rooms
- 📝 **Digital Signatures** - Legally binding electronic signatures
- 💰 **Crypto Payments** - Multi-chain cryptocurrency payment support
- 🤖 **AI Contract Generation** - Smart contract templates powered by AI
- 📄 **PDF Management** - Upload, edit, and sign PDF contracts
- 🔗 **Blockchain Storage** - Permanent storage on Arweave
- 🤝 **Two-Party System** - Simplified contract flow between two parties

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Express.js, Socket.io, TypeScript  
- **Database**: Supabase (PostgreSQL)
- **Blockchain**: Ethereum, Polygon, Solana, Arweave
- **State Management**: Zustand
- **Authentication**: Supabase Auth

## 🚦 Quick Start

1. Clone the repository:
```bash
git clone https://github.com/hubzhooba/giza.git
cd giza
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp client/.env.example client/.env.local
# Edit with your Supabase credentials
```

4. Run database migrations in Supabase SQL Editor:
- `/client/src/lib/create-profiles-table.sql`
- `/client/src/lib/clean-policy-migration.sql`

5. Start development:
```bash
npm run dev
```

## 📁 Project Structure

```
├── client/           # Next.js frontend
│   ├── src/
│   │   ├── pages/   # Next.js pages
│   │   ├── components/
│   │   ├── lib/     # Utilities and services
│   │   └── types/   # TypeScript types
├── server/          # Express.js backend
└── docs/           # Documentation
```

## 🚀 Deployment

- **Frontend**: Deploy to Vercel
- **Backend**: Deploy to Railway
- **Database**: Supabase

## 📝 Documentation

See the `client/docs` folder for:
- Authentication setup
- Database migrations
- Session persistence
- Two-party contract flow

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details
