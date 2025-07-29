// Shared types from client
export interface User {
  id: string;
  email: string;
  name: string;
  publicKey: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SecureRoom {
  id: string;
  name: string;
  creatorId: string;
  participants: Participant[];
  encryptionKey: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'completed' | 'cancelled';
  contractData?: {
    arweaveId?: string;
    version?: number;
    documentId?: string;
    status?: 'draft' | 'pending_signatures' | 'signed' | 'rejected';
  };
}

export interface Participant {
  userId: string;
  email: string;
  name: string;
  role: 'creator' | 'signer';
  hasJoined: boolean;
  publicKey?: string;
  joinedAt?: Date;
}

export interface Document {
  id: string;
  roomId: string;
  name: string;
  type?: 'contract' | 'invoice';
  arweaveId?: string;
  encryptedContent?: string;
  fields?: string;
  signatures: Signature[];
  status: 'draft' | 'pending_signatures' | 'signed' | 'rejected';
  invoiceData?: Invoice; // For invoice documents
  contractData?: any; // For contract documents
  createdAt: Date;
  updatedAt: Date;
}

export interface Signature {
  userId: string;
  signature: string;
  timestamp: Date;
  publicKey: string;
}

export interface Invoice {
  id: string;
  roomId: string;
  documentId: string;
  fromUser: BillingDetails;
  toUser: BillingDetails;
  items: InvoiceItem[];
  paymentMethod: PaymentMethod;
  status: 'draft' | 'sent' | 'pending' | 'paid' | 'cancelled';
  totalAmount: number;
  currency: string;
  dueDate: Date;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface BillingDetails {
  name: string;
  email: string;
  address: string;
  taxId?: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface PaymentMethod {
  type: 'crypto';
  network: 'ethereum' | 'polygon' | 'solana' | 'bitcoin';
  token: string;
  walletAddress: string;
  transactionHash?: string;
}

// Server-specific types
export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export interface EncryptedData {
  iv: string;
  ciphertext: string;
  authTag: string;
}

export interface ArweaveUploadResult {
  id: string;
  url: string;
  timestamp: number;
}

export interface EmailNotification {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
  }>;
}