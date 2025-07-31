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
  inviteeId?: string; // New field for two-party system
  participants: Participant[];
  encryptionKey: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  contractData?: {
    arweaveId?: string;
    version?: number;
    documentId?: string;
    status?: 'draft' | 'pending_signatures' | 'signed' | 'rejected';
  };
  isCreator?: boolean;
  isInvitee?: boolean;
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
  fields?: string; // JSON string of field definitions
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

export interface PaymentTerms {
  escrowEnabled: boolean;
  milestones: Milestone[];
  totalAmount: number;
  currency: string;
}

export interface Milestone {
  id: string;
  description: string;
  amount: number;
  dueDate: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'paid';
}

export interface Activity {
  id: string;
  type: 'tent_created' | 'tent_joined' | 'document_uploaded' | 'document_signed' | 
        'document_declined' | 'document_revision' | 'payment_sent' | 'payment_received' | 
        'tent_completed' | 'invitation_sent';
  tentId: string;
  tentName: string;
  userId: string;
  userName: string;
  targetUserId?: string;
  targetUserName?: string;
  documentId?: string;
  documentName?: string;
  amount?: number;
  currency?: string;
  message?: string;
  createdAt: Date;
}