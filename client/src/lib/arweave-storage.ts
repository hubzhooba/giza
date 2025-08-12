// Wrapper around STOAR that provides a unified interface for Arweave storage
// This allows easy migration to other storage solutions in the future
import { StoarService } from './stoar';

interface ArweaveStorageConfig {
  wallet?: 'use_wallet' | string | object;
  gateway?: string;
  appName?: string;
}

export class ArweaveStorageService {
  private static instance: ArweaveStorageService;
  private stoarService: StoarService;
  private config: ArweaveStorageConfig;
  
  private constructor(config: ArweaveStorageConfig = {}) {
    this.config = {
      wallet: 'use_wallet',
      gateway: 'https://arweave.net',
      appName: 'Giza',
      ...config
    };
    
    this.stoarService = StoarService.getInstance({
      appName: this.config.appName,
      gateway: this.config.gateway
    });
  }
  
  static getInstance(config?: ArweaveStorageConfig): ArweaveStorageService {
    if (!ArweaveStorageService.instance) {
      ArweaveStorageService.instance = new ArweaveStorageService(config);
    }
    return ArweaveStorageService.instance;
  }
  
  async init(): Promise<void> {
    // Initialize STOAR with wallet
    await this.stoarService.init(this.config.wallet);
  }
  
  async uploadDocument(
    data: Buffer | Uint8Array | string | File,
    metadata: {
      name: string;
      contentType?: string;
      roomId?: string;
      documentId?: string;
      encrypted?: boolean;
      folderId?: string;
    },
    options?: {
      tags?: Record<string, string>;
      progress?: (progress: number) => void;
    }
  ): Promise<{ id: string; url: string }> {
    // Prepare data
    let fileData: Buffer | Uint8Array | string;
    if (data instanceof File) {
      const arrayBuffer = await data.arrayBuffer();
      fileData = new Uint8Array(arrayBuffer);
    } else {
      fileData = data;
    }
    
    // Use STOAR for upload
    const result = await this.stoarService.uploadDocument(
      fileData,
      {
        name: metadata.name,
        contentType: metadata.contentType || 'application/octet-stream',
        roomId: metadata.roomId || '',
        documentId: metadata.documentId || '',
        encrypted: metadata.encrypted
      },
      {
        tags: {
          'App-Name': this.config.appName || 'Giza',
          'Document-Type': 'contract',
          ...(metadata.folderId && { 'Folder-ID': metadata.folderId }),
          ...options?.tags
        },
        progress: options?.progress
      }
    );
    
    return {
      id: result.id,
      url: result.url
    };
  }
  
  async uploadBatch(
    files: Array<{
      data: Buffer | Uint8Array | string | File;
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
  ): Promise<{ results: Array<{ id: string; url: string }> }> {
    // Convert files to STOAR format
    const stoarFiles = await Promise.all(files.map(async file => {
      let data: Buffer | Uint8Array | string;
      if (file.data instanceof File) {
        const arrayBuffer = await file.data.arrayBuffer();
        data = new Uint8Array(arrayBuffer);
      } else {
        data = file.data;
      }
      
      return {
        data,
        metadata: file.metadata
      };
    }));
    
    // Use STOAR batch upload - need to provide required roomId and documentId
    const stoarFilesWithDefaults = stoarFiles.map(file => ({
      ...file,
      metadata: {
        ...file.metadata,
        roomId: file.metadata.roomId || '',
        documentId: file.metadata.documentId || ''
      }
    }));
    
    const result = await this.stoarService.uploadBatch(
      stoarFilesWithDefaults,
      {
        bundleTags: options?.bundleTags,
        progress: options?.progress
      }
    );
    
    // Convert results to expected format
    const results = result.files?.map(f => ({
      id: f.id,
      url: f.url || `https://arweave.net/${f.id}`
    })) || [];
    
    return { results };
  }
  
  async getDocument(transactionId: string): Promise<Uint8Array> {
    return await this.stoarService.getDocument(transactionId);
  }
  
  async checkBalance(): Promise<{ balance: string; sufficient: boolean }> {
    // First try to get balance from connected wallet
    if (typeof window !== 'undefined' && window.arweaveWallet) {
      try {
        const address = await window.arweaveWallet.getActiveAddress();
        const response = await fetch(`https://arweave.net/wallet/${address}/balance`);
        const balanceWinston = await response.text();
        
        const balanceInAR = (parseInt(balanceWinston) / 1e12).toFixed(4);
        const sufficient = parseFloat(balanceInAR) >= 0.01;
        
        return { balance: balanceInAR, sufficient };
      } catch (error) {
        console.warn('Failed to get balance from wallet:', error);
      }
    }
    
    // Fallback to STOAR
    if (this.stoarService.getIsInitialized()) {
      return await this.stoarService.checkBalance();
    }
    
    return { balance: 'unknown', sufficient: true };
  }
  
  // Compatibility methods for STOAR
  getIsInitialized(): boolean {
    return this.stoarService.getIsInitialized();
  }
  
  enableAutoBatching(config?: any): void {
    this.stoarService.enableAutoBatching(config);
  }
  
  async disableAutoBatching(): Promise<any> {
    return await this.stoarService.disableAutoBatching();
  }
  
  createBatch(options?: any): string {
    return this.stoarService.createBatch(options);
  }
  
  async commitBatch(batchId: string): Promise<any> {
    return await this.stoarService.commitBatch(batchId);
  }
  
  getBatchStatus(batchId: string): any {
    return this.stoarService.getBatchStatus(batchId);
  }
  
  async queryDocuments(options?: {
    roomId?: string;
    documentId?: string;
    limit?: number;
    after?: string;
  }): Promise<any[]> {
    return await this.stoarService.queryDocuments(options);
  }
}

// Export singleton instance
export const arweaveStorage = ArweaveStorageService.getInstance();