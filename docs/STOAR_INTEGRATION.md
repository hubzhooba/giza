# STOAR SDK Integration Guide

This document explains how the STOAR SDK has been integrated into the Giza platform for permanent document storage on Arweave.

## Overview

STOAR SDK provides a simplified interface for storing files on Arweave with features like:
- 🚀 Simple file uploads
- 📦 Batch uploads for cost efficiency
- 🔐 Wallet management (ArConnect & JSON wallets)
- 💾 S3-compatible API
- 🔄 Automatic retry logic
- 📊 Progress tracking

## Architecture

### Client-Side Integration

1. **STOAR Service Wrapper** (`client/src/lib/stoar.ts`)
   - Singleton service that wraps STOAR SDK
   - Handles initialization with wallet
   - Provides methods for upload, download, and query
   - Manages batch operations

2. **Document Upload** (`client/src/components/DocumentUpload.tsx`)
   - Single document upload with encryption
   - Stores encrypted content on Arweave
   - Falls back to local storage on failure
   - Shows wallet balance and upload status

3. **Batch Upload** (`client/src/components/BatchDocumentUpload.tsx`)
   - Multiple document upload in a single transaction
   - Saves 90%+ on transaction fees
   - Progress tracking for each file
   - Automatic batching with STOAR SDK

4. **Document Viewer** (`client/src/components/DocumentViewer.tsx`)
   - Fetches documents from Arweave when available
   - Falls back to local storage
   - Shows Arweave storage status

5. **Error Handling** (`client/src/lib/stoar-error-handler.ts`)
   - Comprehensive error handling for all STOAR operations
   - User-friendly error messages
   - Retry logic for recoverable errors
   - Specific handling for wallet and balance errors

### Database Schema

Added fields to the `documents` table:
- `arweave_id` - STOAR transaction ID
- `arweave_url` - Direct URL to the document

Migration: `database/migrations/add-arweave-fields.sql`

## Configuration

### Environment Variables

```bash
# Client (.env.local)
NEXT_PUBLIC_ARWEAVE_WALLET_KEY=your_wallet_json_key  # Optional
NEXT_PUBLIC_ARWEAVE_GATEWAY=https://arweave.net     # Optional

# Server (.env)
ARWEAVE_WALLET_KEY=your_wallet_json_key
ARWEAVE_GATEWAY=https://arweave.net                 # Optional
```

### Wallet Setup

1. **Browser Wallet (ArConnect)**
   - Install ArConnect extension
   - No configuration needed
   - SDK will auto-detect and use it

2. **JSON Wallet**
   - Generate wallet at https://arweave.app
   - Add to environment variable
   - SDK will use it automatically

## Usage Examples

### Single Document Upload

```typescript
// Upload happens automatically in DocumentUpload component
// When user adds signature fields and saves:
const uploadResult = await stoar.uploadDocument(
  encryptedData,
  {
    name: 'contract.pdf.encrypted',
    contentType: 'application/json',
    roomId: 'room-123',
    documentId: 'doc-456',
    encrypted: true
  }
);
```

### Batch Upload

```typescript
// Enable auto-batching
stoar.enableAutoBatching({
  timeout: 60000,
  maxFiles: 100,
  maxBytes: 100 * 1024 * 1024
});

// Upload multiple files (automatically batched)
for (const file of files) {
  await stoar.uploadDocument(file.data, file.metadata, { batch: true });
}

// Commit the batch
const result = await stoar.disableAutoBatching();
console.log(`Saved ${result.fileCount - 1} transactions!`);
```

### Query Documents

```typescript
// Find all documents for a room
const documents = await stoar.queryDocuments({
  roomId: 'room-123',
  limit: 50
});

// Get specific document
const data = await stoar.getDocument(transactionId);
```

## Cost Optimization

### Batch Upload Benefits

- **Individual uploads**: 10 files = 10 transaction fees
- **Batch upload**: 10 files = 1 transaction fee
- **Savings**: 90% reduction in fees

### When to Use Batch Upload

- Multiple contracts for the same project
- Document sets (contracts + attachments)
- Bulk operations (e.g., migrating existing documents)

## Error Handling

The integration includes comprehensive error handling:

1. **Insufficient Balance**
   - Shows required vs available balance
   - Prompts user to top up wallet

2. **Wallet Errors**
   - Guides user to install ArConnect
   - Checks wallet configuration

3. **Upload Failures**
   - Automatic retry with exponential backoff
   - Falls back to local storage
   - Preserves document functionality

4. **Network Issues**
   - Retries on temporary failures
   - Clear error messages
   - Maintains app functionality

## Security Considerations

1. **Encryption First**
   - All documents encrypted client-side before upload
   - Encryption keys never leave the client
   - Arweave stores only encrypted data

2. **Wallet Security**
   - JSON wallets should be kept secure
   - Use environment variables, not hardcoded
   - Consider using ArConnect for browser security

3. **Access Control**
   - Documents linked to rooms via tags
   - Only room participants can decrypt
   - Arweave provides immutability

## Migration Guide

For existing documents without Arweave storage:

1. Query local documents
2. Batch upload to Arweave
3. Update database with transaction IDs
4. Verify successful uploads

Example migration script:
```typescript
const documents = await getDocumentsWithoutArweave();
const batch = stoar.createBatch({ maxFiles: 100 });

for (const doc of documents) {
  await stoar.uploadDocument(doc.encryptedContent, {
    name: doc.name,
    roomId: doc.roomId,
    documentId: doc.id
  }, { batch });
}

const result = await stoar.commitBatch(batch);
// Update database with result.files mapping
```

## Monitoring

Track STOAR usage:
- Wallet balance checks
- Upload success/failure rates
- Batch efficiency metrics
- Storage costs per document

## Future Enhancements

1. **Automatic Archival**
   - Archive signed documents automatically
   - Configurable retention policies

2. **IPFS Gateway**
   - Dual storage on Arweave + IPFS
   - Faster retrieval options

3. **Advanced Queries**
   - Search documents by content
   - Filter by date ranges
   - Full-text search on metadata

4. **Storage Analytics**
   - Cost tracking dashboard
   - Usage reports
   - Optimization recommendations