interface ArweaveWallet {
  connect(permissions: string[]): Promise<void>;
  disconnect(): Promise<void>;
  getActiveAddress(): Promise<string>;
  getActivePublicKey(): Promise<string>;
  getAllAddresses(): Promise<string[]>;
  getWalletNames(): Promise<{ [addr: string]: string }>;
  sign(transaction: any, options?: any): Promise<any>;
  getPermissions(): Promise<string[]>;
  encrypt(data: string, options: any): Promise<Uint8Array>;
  decrypt(data: Uint8Array, options: any): Promise<string>;
  signature(data: Uint8Array, options: any): Promise<any>;
  userHasValidKeyPair(publicKey: string): Promise<boolean>;
  addToken(id: string): Promise<void>;
  isTokenAdded(id: string): Promise<boolean>;
  dispatch(args: { type: string; data?: any }): Promise<any>;
  getArweaveConfig(): Promise<any>;
  // New API (may not be available in older versions)
  signMessage?(message: ArrayBuffer | string, options?: any): Promise<ArrayBuffer | string>;
}

interface Window {
  arweaveWallet: ArweaveWallet;
}