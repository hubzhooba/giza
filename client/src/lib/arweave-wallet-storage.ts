/**
 * Arweave storage service that integrates with Arweave Wallet Kit
 * This replaces direct STOAR wallet handling with proper wallet integration
 */

import { useApi } from '@arweave-wallet-kit/react';
import Arweave from 'arweave';
import { StoarService } from './stoar';

// Initialize Arweave client
const arweave = Arweave.init({
  host: 'arweave.net',
  port: 443,
  protocol: 'https',
});

export interface ArweaveUploadResult {
  id: string;
  url: string;
  size: number;
  contentType: string;
}

export interface ArweaveUploadOptions {
  tags?: Record<string, string>;
  progress?: (progress: number) => void;
}

export class ArweaveWalletStorage {
  private static instance: ArweaveWalletStorage;
  private stoarService: StoarService | null = null;
  private walletApi: any = null;
  
  private constructor() {
    // Initialize STOAR as a fallback
    this.stoarService = StoarService.getInstance();
  }
  
  static getInstance(): ArweaveWalletStorage {
    if (!ArweaveWalletStorage.instance) {
      ArweaveWalletStorage.instance = new ArweaveWalletStorage();
    }
    return ArweaveWalletStorage.instance;
  }
  
  /**
   * Set the wallet API from the Arweave Wallet Kit
   */
  setWalletApi(api: any) {
    this.walletApi = api;
  }
  
  /**
   * Initialize the storage service
   */
  async init(): Promise<void> {
    // Try to initialize STOAR with wallet if available
    if (typeof window !== 'undefined' && window.arweaveWallet) {
      try {
        await this.stoarService?.init('use_wallet');
      } catch (error) {
        console.warn('STOAR init failed, will use direct Arweave transactions:', error);
      }
    }
  }
  
  /**
   * Upload a document to Arweave using the connected wallet
   */
  async uploadDocument(
    data: Buffer | Uint8Array | string,
    metadata: {
      name: string;
      contentType?: string;
      roomId?: string;
      documentId?: string;
      encrypted?: boolean;
    },
    options?: ArweaveUploadOptions
  ): Promise<ArweaveUploadResult> {
    // Convert data to Uint8Array if needed
    let dataBytes: Uint8Array;
    if (typeof data === 'string') {
      dataBytes = new TextEncoder().encode(data);
    } else if (Buffer.isBuffer(data)) {
      dataBytes = new Uint8Array(data);
    } else {
      dataBytes = data;
    }
    
    // Try using STOAR first if initialized (it handles batching better)
    if (this.stoarService?.getIsInitialized()) {
      try {
        const result = await this.stoarService.uploadDocument(
          dataBytes,
          {
            name: metadata.name,
            contentType: metadata.contentType || 'application/octet-stream',
            roomId: metadata.roomId || '',
            documentId: metadata.documentId || '',
            encrypted: metadata.encrypted
          },
          options
        );
        
        return {
          id: result.id,
          url: result.url,
          size: result.size,
          contentType: result.contentType
        };
      } catch (error) {
        console.warn('STOAR upload failed, falling back to direct upload:', error);
      }
    }
    
    // Fallback to direct Arweave transaction if wallet is connected
    if (typeof window !== 'undefined' && window.arweaveWallet) {
      try {
        // Create transaction
        const transaction = await arweave.createTransaction({
          data: dataBytes
        });
        
        // Add tags
        transaction.addTag('App-Name', 'Giza');
        transaction.addTag('Content-Type', metadata.contentType || 'application/octet-stream');
        if (metadata.roomId) transaction.addTag('Room-ID', metadata.roomId);
        if (metadata.documentId) transaction.addTag('Document-ID', metadata.documentId);
        if (metadata.encrypted !== undefined) {
          transaction.addTag('Encrypted', metadata.encrypted.toString());
        }
        
        // Add custom tags
        if (options?.tags) {
          Object.entries(options.tags).forEach(([key, value]) => {
            transaction.addTag(key, value);
          });
        }
        
        // Sign transaction with wallet
        await window.arweaveWallet.sign(transaction);
        
        // Post transaction
        const response = await arweave.transactions.post(transaction);
        
        if (response.status === 200) {
          return {
            id: transaction.id,
            url: `https://arweave.net/${transaction.id}`,
            size: dataBytes.length,
            contentType: metadata.contentType || 'application/octet-stream'
          };
        } else {
          throw new Error(`Transaction failed with status ${response.status}`);
        }
      } catch (error) {
        console.error('Direct Arweave upload failed:', error);
        throw error;
      }
    }
    
    throw new Error('No wallet connected for Arweave upload');
  }
  
  /**
   * Get a document from Arweave
   */
  async getDocument(transactionId: string): Promise<Uint8Array> {
    // Try STOAR first (it has caching)
    if (this.stoarService?.getIsInitialized()) {
      try {
        return await this.stoarService.getDocument(transactionId);
      } catch (error) {
        console.warn('STOAR fetch failed, trying direct fetch:', error);
      }
    }
    
    // Direct fetch from Arweave
    try {
      const response = await fetch(`https://arweave.net/${transactionId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.statusText}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    } catch (error) {
      console.error('Failed to fetch document:', error);
      throw error;
    }
  }
  
  /**
   * Check wallet balance
   */
  async checkBalance(): Promise<{ balance: string; sufficient: boolean }> {
    if (typeof window !== 'undefined' && window.arweaveWallet) {
      try {
        const address = await window.arweaveWallet.getActiveAddress();
        const winston = await arweave.wallets.getBalance(address);
        const ar = arweave.ar.winstonToAr(winston);
        const sufficient = parseFloat(ar) >= 0.01;
        
        return { balance: ar, sufficient };
      } catch (error) {
        console.warn('Failed to get balance:', error);
      }
    }
    
    // Fallback to STOAR
    if (this.stoarService?.getIsInitialized()) {
      return await this.stoarService.checkBalance();
    }
    
    return { balance: 'unknown', sufficient: false };
  }
  
  /**
   * Upload multiple documents as a batch
   */
  async uploadBatch(
    files: Array<{
      data: Buffer | Uint8Array | string;
      metadata: {
        name: string;
        contentType?: string;
        roomId?: string;
        documentId?: string;
        encrypted?: boolean;
      };
    }>,
    options?: {
      bundleTags?: Record<string, string>;
      progress?: (status: { completed: number; total: number; current?: string }) => void;
    }
  ): Promise<{ results: Array<ArweaveUploadResult> }> {
    // If STOAR is initialized, use its batching
    if (this.stoarService?.getIsInitialized()) {
      try {
        // Map files to ensure required fields are present for STOAR
        const filesWithDefaults = files.map(file => ({
          data: file.data,
          metadata: {
            ...file.metadata,
            roomId: file.metadata.roomId || '',
            documentId: file.metadata.documentId || ''
          }
        }));
        
        const result = await this.stoarService.uploadBatch(filesWithDefaults, options);
        
        const results = result.files?.map(f => ({
          id: f.id,
          url: f.url || `https://arweave.net/${f.id}`,
          size: 0, // Size not provided by STOAR batch result
          contentType: 'application/octet-stream'
        })) || [];
        
        return { results };
      } catch (error) {
        console.warn('STOAR batch upload failed, falling back to sequential uploads:', error);
      }
    }
    
    // Fallback to sequential uploads
    const results: ArweaveUploadResult[] = [];
    let completed = 0;
    
    for (const file of files) {
      if (options?.progress) {
        options.progress({
          completed,
          total: files.length,
          current: file.metadata.name
        });
      }
      
      try {
        const result = await this.uploadDocument(
          file.data,
          file.metadata,
          { tags: options?.bundleTags }
        );
        results.push(result);
        completed++;
      } catch (error) {
        console.error(`Failed to upload ${file.metadata.name}:`, error);
        // Continue with other files
      }
    }
    
    return { results };
  }
  
  /**
   * Query documents from Arweave
   */
  async queryDocuments(options?: {
    roomId?: string;
    userId?: string;
    documentId?: string;
    limit?: number;
    after?: string;
  }): Promise<any[]> {
    if (this.stoarService?.getIsInitialized()) {
      try {
        return await this.stoarService.queryDocuments(options);
      } catch (error) {
        console.warn('STOAR query failed:', error);
      }
    }
    
    // Fallback: query using GraphQL if needed
    // For now, return empty array
    return [];
  }
  
  // Compatibility methods for STOAR
  getIsInitialized(): boolean {
    return this.stoarService?.getIsInitialized() || false;
  }
  
  enableAutoBatching(config?: any): void {
    this.stoarService?.enableAutoBatching(config);
  }
  
  async disableAutoBatching(): Promise<any> {
    return await this.stoarService?.disableAutoBatching();
  }
}

// Export singleton
export const arweaveWalletStorage = ArweaveWalletStorage.getInstance();