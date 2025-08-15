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
import { getHealthyGateway } from './arweave-gateways';

interface StoarServiceConfig {
  appName?: string;
  appVersion?: string;
  gateway?: string;
  enableBatching?: boolean;
  batchConfig?: {
    timeout?: number;
    maxFiles?: number;
    maxBytes?: number;
  };
}

export class StoarService {
  private static instance: StoarService;
  private client: StoarClient;
  private s3Client: StoarS3Client | null = null;
  private isInitialized = false;

  private constructor(config?: StoarServiceConfig) {
    this.client = new StoarClient({
      appName: config?.appName || 'Giza',
      appVersion: config?.appVersion || '1.0.0',
      gateway: config?.gateway || 'https://arweave.net'  // Using official Arweave gateway
    });
  }

  static getInstance(config?: StoarServiceConfig): StoarService {
    if (!StoarService.instance) {
      StoarService.instance = new StoarService(config);
    }
    return StoarService.instance;
  }

  async init(walletSource?: string | ArrayBuffer | object): Promise<void> {
    // If already initialized, return early
    if (this.isInitialized) {
      return;
    }
    
    try {
      // Use configured gateway or default to arweave.net
      const gateway = process.env.NEXT_PUBLIC_ARWEAVE_GATEWAY || 'https://arweave.net';
      console.log(`Using Arweave gateway: ${gateway}`);
      
      // Reinitialize client with gateway
      this.client = new StoarClient({
        appName: 'Giza',
        appVersion: '1.0.0',
        gateway: gateway
      });
      
      // Try to initialize with wallet
      if (!walletSource) {
        // Check if wallet is connected through Arweave Wallet Kit
        if (typeof window !== 'undefined' && window.arweaveWallet) {
          try {
            // Check if wallet is actually connected
            const address = await window.arweaveWallet.getActiveAddress();
            if (address) {
              // Wallet is connected, use it with STOAR
              await this.client.init('use_wallet');
              this.isInitialized = true;
              console.log('STOAR initialized with connected Arweave wallet');
            } else {
              // No active address, wallet not fully connected
              console.warn('Arweave wallet exists but no active address, STOAR in read-only mode');
              this.isInitialized = false;
              return;
            }
          } catch (walletError) {
            // Wallet exists but couldn't get address or init failed
            console.warn('Could not initialize STOAR with wallet:', walletError);
            this.isInitialized = false;
            return;
          }
        } else {
          // No wallet extension installed
          console.warn('No Arweave wallet detected, STOAR running in read-only mode');
          this.isInitialized = false;
          return;
        }
      } else {
        // Initialize with provided wallet source
        await this.client.init(walletSource);
        this.isInitialized = true;
      }
      
      // Initialize S3 client for compatibility if initialized
      if (this.isInitialized) {
        this.s3Client = new StoarS3Client(this.client, {
          bucket: 'giza-documents',
          region: 'us-east-1'
        });
      }
    } catch (error) {
      // Reset initialization state on error
      this.isInitialized = false;
      
      if (error instanceof WalletError) {
        console.warn(`Wallet initialization failed: ${error.message}`);
        // Don't throw, just warn - allow read-only operations
        return;
      }
      
      console.error('STOAR initialization error:', error);
      // Don't throw for initialization errors - just log them
      // This allows the app to continue working without STOAR
    }
  }

  // Add a method to check initialization status
  getIsInitialized(): boolean {
    return this.isInitialized;
  }

  async checkBalance(): Promise<{ balance: string; sufficient: boolean }> {
    if (!this.isInitialized) {
      throw new Error('StoarService not initialized. Call init() first.');
    }
    
    try {
      const balance = await this.client.getBalance();
      // Check if balance is sufficient for at least one transaction (0.01 AR)
      const sufficient = parseFloat(balance) >= 0.01;
      
      return { balance, sufficient };
    } catch (error) {
      // If balance check fails due to gateway timeout, return a default
      console.warn('Balance check failed, assuming sufficient balance:', error);
      return { balance: 'unknown', sufficient: true };
    }
  }

  async uploadDocument(
    data: Buffer | Uint8Array | string,
    metadata: {
      name: string;
      contentType?: string;
      roomId: string;
      documentId: string;
      encrypted?: boolean;
    },
    options?: {
      tags?: Record<string, string>;
      batch?: boolean | string;
      progress?: (progress: number) => void;
    }
  ): Promise<UploadResult> {
    if (!this.isInitialized) {
      throw new Error('StoarService not initialized. Call init() first.');
    }

    try {
      const fileMetadata: FileMetadata = {
        name: metadata.name,
        size: typeof data === 'string' ? new TextEncoder().encode(data).length : data.length,
        contentType: metadata.contentType || 'application/octet-stream',
        lastModified: Date.now()
      };

      const tags = {
        'App-Name': 'Giza',
        'Document-Type': 'contract',
        'Room-ID': metadata.roomId,
        'Document-ID': metadata.documentId,
        'Encrypted': metadata.encrypted ? 'true' : 'false',
        'Content-Type': fileMetadata.contentType,
        ...options?.tags
      };

      const result = await this.client.uploadFile(data, fileMetadata, {
        tags,
        batch: options?.batch,
        progress: options?.progress
      });

      return result;
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
        encrypted?: boolean;
      };
    }>,
    options?: {
      bundleTags?: Record<string, string>;
      progress?: (status: { completed: number; total: number; current?: string }) => void;
    }
  ): Promise<BatchUploadResult> {
    if (!this.isInitialized) {
      throw new Error('StoarService not initialized. Call init() first.');
    }

    const batchFiles = files.map(file => ({
      data: file.data instanceof Buffer || file.data instanceof Uint8Array ? file.data : new TextEncoder().encode(file.data),
      metadata: {
        name: file.metadata.name,
        size: typeof file.data === 'string' ? new TextEncoder().encode(file.data).length : file.data.length,
        contentType: file.metadata.contentType || 'application/octet-stream',
        lastModified: Date.now()
      },
      tags: {
        'Room-ID': file.metadata.roomId,
        'Document-ID': file.metadata.documentId,
        'Encrypted': file.metadata.encrypted ? 'true' : 'false'
      }
    }));

    const bundleTags = {
      'App-Name': 'Giza',
      'Bundle-Type': 'document-batch',
      'Bundle-Count': files.length.toString(),
      ...options?.bundleTags
    };

    return await this.client.uploadBatch(batchFiles, {
      bundleTags,
      progress: options?.progress
    });
  }

  async getDocument(transactionId: string): Promise<Uint8Array> {
    if (!this.isInitialized) {
      throw new Error('StoarService not initialized. Call init() first.');
    }

    return await this.client.getFile(transactionId);
  }

  async queryDocuments(options?: {
    roomId?: string;
    documentId?: string;
    limit?: number;
    after?: string;
  }): Promise<QueryResult[]> {
    if (!this.isInitialized) {
      throw new Error('StoarService not initialized. Call init() first.');
    }

    const tags: Record<string, string> = {
      'App-Name': 'Giza'
    };

    if (options?.roomId) {
      tags['Room-ID'] = options.roomId;
    }
    if (options?.documentId) {
      tags['Document-ID'] = options.documentId;
    }

    return await this.client.query({
      tags,
      limit: options?.limit || 20,
      after: options?.after
    });
  }

  // Batch management methods
  enableAutoBatching(config?: {
    timeout?: number;
    maxFiles?: number;
    maxBytes?: number;
  }): void {
    if (!this.isInitialized) {
      throw new Error('StoarService not initialized. Call init() first.');
    }

    this.client.enableBatching(config);
  }

  async disableAutoBatching(): Promise<BatchUploadResult | void> {
    if (!this.isInitialized) {
      throw new Error('StoarService not initialized. Call init() first.');
    }

    return await this.client.disableBatching();
  }

  createBatch(options?: {
    maxFiles?: number;
    maxBytes?: number;
    timeout?: number;
    autoCommit?: boolean;
  }): string {
    if (!this.isInitialized) {
      throw new Error('StoarService not initialized. Call init() first.');
    }

    return this.client.createBatch(options);
  }

  async commitBatch(batchId: string): Promise<BatchUploadResult> {
    if (!this.isInitialized) {
      throw new Error('StoarService not initialized. Call init() first.');
    }

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
    if (!this.isInitialized) {
      throw new Error('StoarService not initialized. Call init() first.');
    }

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

  // S3-compatible methods for easy migration
  async putObject(params: {
    Key: string;
    Body: string | Buffer | Uint8Array;
    ContentType?: string;
    Metadata?: Record<string, string>;
  }): Promise<UploadResult> {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized');
    }

    const s3Result = await this.s3Client.putObject(params);
    
    // Convert S3 result to UploadResult format
    return {
      id: s3Result.VersionId || s3Result.ETag || '',
      url: s3Result.Location || `https://arweave.net/${s3Result.Key}`,
      size: params.Body instanceof Uint8Array ? params.Body.length : 
            Buffer.isBuffer(params.Body) ? params.Body.length : 
            new TextEncoder().encode(params.Body).length,
      contentType: params.ContentType || 'application/octet-stream'
    } as UploadResult;
  }

  async getObject(params: { Key: string }): Promise<{ Body: Uint8Array; ContentType?: string }> {
    if (!this.s3Client) {
      throw new Error('S3 client not initialized');
    }

    return await this.s3Client.getObject(params);
  }

  getAddress(): string {
    if (!this.isInitialized) {
      throw new Error('StoarService not initialized. Call init() first.');
    }

    return this.client.getAddress();
  }
}

// Export types for use in components
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