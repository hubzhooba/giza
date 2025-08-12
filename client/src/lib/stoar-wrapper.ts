/**
 * Wrapper for STOAR operations that handles initialization gracefully
 * and provides fallback for when STOAR is not available
 */

import { StoarService } from './stoar';

export class StoarWrapper {
  private static instance: StoarWrapper;
  private stoar: StoarService;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  private constructor() {
    this.stoar = StoarService.getInstance();
  }

  static getInstance(): StoarWrapper {
    if (!StoarWrapper.instance) {
      StoarWrapper.instance = new StoarWrapper();
    }
    return StoarWrapper.instance;
  }

  /**
   * Initialize STOAR only when we have a wallet
   */
  async initWithWallet(): Promise<boolean> {
    // If already initializing, wait for that
    if (this.initPromise) {
      await this.initPromise;
      return this.initialized;
    }

    // If already initialized, return status
    if (this.initialized) {
      return true;
    }

    this.initPromise = this.doInit();
    await this.initPromise;
    return this.initialized;
  }

  private async doInit(): Promise<void> {
    try {
      // Only initialize if we have ArConnect and it's connected
      if (typeof window !== 'undefined' && window.arweaveWallet) {
        try {
          // Check if wallet is connected
          await window.arweaveWallet.getActiveAddress();
          
          // Initialize STOAR with wallet
          await this.stoar.init();
          this.initialized = this.stoar.getIsInitialized();
        } catch (error) {
          console.warn('Wallet not connected, STOAR features disabled');
          this.initialized = false;
        }
      } else {
        console.warn('ArConnect not available, STOAR features disabled');
        this.initialized = false;
      }
    } catch (error) {
      console.error('Failed to initialize STOAR:', error);
      this.initialized = false;
    } finally {
      this.initPromise = null;
    }
  }

  /**
   * Check if STOAR is initialized and ready
   */
  isReady(): boolean {
    return this.initialized && this.stoar.getIsInitialized();
  }

  /**
   * Upload document only if STOAR is ready
   */
  async uploadDocument(
    data: Buffer | Uint8Array | string,
    metadata: any,
    options?: any
  ): Promise<any> {
    if (!this.isReady()) {
      throw new Error('STOAR not initialized. Please connect your wallet.');
    }
    return this.stoar.uploadDocument(data, metadata, options);
  }

  /**
   * Get document only if STOAR is ready
   */
  async getDocument(transactionId: string): Promise<Uint8Array> {
    if (!this.isReady()) {
      throw new Error('STOAR not initialized. Cannot fetch from Arweave.');
    }
    return this.stoar.getDocument(transactionId);
  }

  /**
   * Query documents only if STOAR is ready
   */
  async queryDocuments(options?: any): Promise<any[]> {
    if (!this.isReady()) {
      console.warn('STOAR not initialized. Returning empty results.');
      return [];
    }
    return this.stoar.queryDocuments(options);
  }

  /**
   * Check balance only if STOAR is ready
   */
  async checkBalance(): Promise<{ balance: string; sufficient: boolean }> {
    if (!this.isReady()) {
      return { balance: 'unknown', sufficient: false };
    }
    return this.stoar.checkBalance();
  }

  /**
   * Get wallet address only if STOAR is ready
   */
  getAddress(): string {
    if (!this.isReady()) {
      return '';
    }
    return this.stoar.getAddress();
  }
}

export const stoarWrapper = StoarWrapper.getInstance();