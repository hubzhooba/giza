import { StoarClient, StoarS3Client } from '@stoar/sdk';
import { 
  StoarError,
  UploadError,
  WalletError,
  InsufficientBalanceError 
} from '@stoar/sdk';
import type { 
  UploadResult, 
  BatchUploadResult, 
  QueryResult, 
  FileMetadata
} from '@stoar/sdk';
import { ArweaveUploadResult } from '../types/index.js';
import dotenv from 'dotenv';

dotenv.config();

export class StoarService {
  private static instance: StoarService;
  private client: StoarClient;
  private s3Client: StoarS3Client | null = null;
  private isInitialized = false;

  private constructor() {
    this.client = new StoarClient({
      appName: 'Giza-Server',
      appVersion: '1.0.0',
      gateway: process.env.ARWEAVE_GATEWAY || 'https://arweave.net'
    });
  }

  static getInstance(): StoarService {
    if (!StoarService.instance) {
      StoarService.instance = new StoarService();
    }
    return StoarService.instance;
  }

  async init(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const walletKey = process.env.ARWEAVE_WALLET_KEY;
      if (!walletKey) {
        throw new Error('ARWEAVE_WALLET_KEY not configured');
      }

      await this.client.init(walletKey);
      this.isInitialized = true;
      
      // Initialize S3 client for compatibility
      this.s3Client = new StoarS3Client(this.client, {
        bucket: 'giza-server-documents',
        region: 'us-east-1'
      });

      console.log('STOAR Service initialized successfully');
      const balance = await this.client.getBalance();
      console.log(`Wallet balance: ${balance} AR`);
    } catch (error) {
      console.error('Failed to initialize STOAR:', error);
      throw error;
    }
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('STOAR Service not initialized. Call init() first.');
    }
  }

  async uploadDocument(
    data: Buffer | Uint8Array | string,
    metadata: {
      name: string;
      contentType?: string;
      roomId: string;
      documentId: string;
      userId: string;
      encrypted?: boolean;
    }
  ): Promise<ArweaveUploadResult> {
    this.ensureInitialized();

    try {
      const fileMetadata: FileMetadata = {
        name: metadata.name,
        size: typeof data === 'string' ? Buffer.byteLength(data) : data.length,
        contentType: metadata.contentType || 'application/octet-stream',
        lastModified: Date.now()
      };

      const tags = {
        'App-Name': 'Giza-Server',
        'Document-Type': 'contract',
        'Room-ID': metadata.roomId,
        'Document-ID': metadata.documentId,
        'User-ID': metadata.userId,
        'Encrypted': metadata.encrypted ? 'true' : 'false',
        'Content-Type': fileMetadata.contentType,
        'Upload-Source': 'server'
      };

      const result = await this.client.uploadFile(data, fileMetadata, { tags });

      return {
        id: result.id,
        url: result.url,
        timestamp: Date.now()
      };
    } catch (error) {
      if (error instanceof InsufficientBalanceError) {
        throw new Error(`Insufficient balance: Required ${error.required} AR, Available ${error.available} AR`);
      }
      if (error instanceof UploadError) {
        throw new Error(`Upload failed: ${error.message}`);
      }
      throw error;
    }
  }

  async uploadBatch(
    files: Array<{
      data: Buffer | Uint8Array | string;
      metadata: {
        name: string;
        contentType?: string;
        roomId: string;
        documentId: string;
        userId: string;
        encrypted?: boolean;
      };
    }>
  ): Promise<{ bundleId: string; bundleUrl: string; files: Array<{ documentId: string; transactionId: string }> }> {
    this.ensureInitialized();

    const batchFiles = files.map(file => ({
      data: file.data instanceof Buffer || file.data instanceof Uint8Array 
        ? file.data 
        : Buffer.from(file.data),
      metadata: {
        name: file.metadata.name,
        size: typeof file.data === 'string' ? Buffer.byteLength(file.data) : file.data.length,
        contentType: file.metadata.contentType || 'application/octet-stream',
        lastModified: Date.now()
      },
      tags: {
        'Room-ID': file.metadata.roomId,
        'Document-ID': file.metadata.documentId,
        'User-ID': file.metadata.userId,
        'Encrypted': file.metadata.encrypted ? 'true' : 'false',
        'Upload-Source': 'server'
      }
    }));

    const bundleTags = {
      'App-Name': 'Giza-Server',
      'Bundle-Type': 'document-batch',
      'Bundle-Count': files.length.toString(),
      'Upload-Source': 'server',
      'Timestamp': new Date().toISOString()
    };

    const result = await this.client.uploadBatch(batchFiles, { bundleTags });

    // Map the results back to document IDs
    const fileMapping = files.map((file, index) => ({
      documentId: file.metadata.documentId,
      transactionId: result.files?.[index]?.id || `${result.bundleId}-${index}`
    }));

    return {
      bundleId: result.bundleId || '',
      bundleUrl: result.bundleUrl || '',
      files: fileMapping
    };
  }

  async getDocument(transactionId: string): Promise<Buffer> {
    this.ensureInitialized();
    
    const data = await this.client.getFile(transactionId);
    return Buffer.from(data);
  }

  async queryDocuments(options: {
    roomId?: string;
    userId?: string;
    documentId?: string;
    limit?: number;
    after?: string;
  }): Promise<QueryResult[]> {
    this.ensureInitialized();

    const tags: Record<string, string> = {
      'App-Name': 'Giza-Server'
    };

    if (options.roomId) {
      tags['Room-ID'] = options.roomId;
    }
    if (options.userId) {
      tags['User-ID'] = options.userId;
    }
    if (options.documentId) {
      tags['Document-ID'] = options.documentId;
    }

    return await this.client.query({
      tags,
      limit: options.limit || 20,
      after: options.after
    });
  }

  async verifyTransaction(transactionId: string): Promise<boolean> {
    this.ensureInitialized();

    try {
      // Query for the specific transaction
      const results = await this.client.query({
        limit: 1,
        tags: { 'App-Name': 'Giza-Server' }
      });

      // Check if transaction exists in results
      return results.some(r => r.id === transactionId);
    } catch (error) {
      console.error('Failed to verify transaction:', error);
      return false;
    }
  }

  async getBalance(): Promise<{ balance: string; sufficient: boolean }> {
    this.ensureInitialized();

    const balance = await this.client.getBalance();
    // Check if balance is sufficient for at least one transaction (0.01 AR)
    const sufficient = parseFloat(balance) >= 0.01;
    
    return { balance, sufficient };
  }

  getAddress(): string {
    this.ensureInitialized();
    return this.client.getAddress();
  }

  // Batch management for server operations
  createBatch(options?: {
    maxFiles?: number;
    maxBytes?: number;
    timeout?: number;
    autoCommit?: boolean;
  }): string {
    this.ensureInitialized();
    return this.client.createBatch(options);
  }

  async commitBatch(batchId: string): Promise<BatchUploadResult> {
    this.ensureInitialized();
    return await this.client.commitBatch(batchId);
  }

  getBatchStatus(batchId: string): {
    batchId: string;
    fileCount: number;
    totalSize: number;
    status: 'pending' | 'committed' | 'failed';
    createdAt: Date;
    error?: Error;
  } {
    this.ensureInitialized();
    const status = this.client.getBatchStatus(batchId);
    if (!status) {
      throw new Error(`Batch ${batchId} not found`);
    }
    
    // Map STOAR status to our expected status
    let mappedStatus: 'pending' | 'committed' | 'failed' = 'pending';
    if (status.status === 'completed') {
      mappedStatus = 'committed';
    } else if (status.status === 'failed') {
      mappedStatus = 'failed';
    } else if (status.status === 'open' || status.status === 'processing') {
      mappedStatus = 'pending';
    }
    
    return {
      batchId: status.batchId,
      fileCount: status.fileCount,
      totalSize: status.totalSize,
      status: mappedStatus,
      createdAt: new Date(status.createdAt),
      error: status.error ? new Error(status.error) : undefined
    };
  }
}

// Export types for use in controllers
export type {
  UploadResult,
  BatchUploadResult,
  QueryResult,
  FileMetadata,
  StoarError,
  UploadError,
  WalletError,
  InsufficientBalanceError
};