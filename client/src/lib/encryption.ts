import CryptoJS from 'crypto-js';
import sodium from 'libsodium-wrappers';

export class EncryptionService {
  private static instance: EncryptionService;
  private ready: Promise<void>;

  constructor() {
    this.ready = sodium.ready;
  }

  static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  async generateKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
    await this.ready;
    const keyPair = sodium.crypto_sign_keypair();
    return {
      publicKey: sodium.to_base64(keyPair.publicKey),
      privateKey: sodium.to_base64(keyPair.privateKey),
    };
  }

  async generateRoomKey(): Promise<string> {
    await this.ready;
    const key = sodium.crypto_secretbox_keygen();
    return sodium.to_base64(key);
  }

  async encryptData(data: string, key: string): Promise<{ encrypted: string; nonce: string }> {
    await this.ready;
    const keyBytes = sodium.from_base64(key);
    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
    const messageBytes = sodium.from_string(data);
    
    const encrypted = sodium.crypto_secretbox_easy(messageBytes, nonce, keyBytes);
    
    return {
      encrypted: sodium.to_base64(encrypted),
      nonce: sodium.to_base64(nonce),
    };
  }

  async decryptData(encrypted: string, nonce: string, key: string): Promise<string> {
    await this.ready;
    const keyBytes = sodium.from_base64(key);
    const nonceBytes = sodium.from_base64(nonce);
    const encryptedBytes = sodium.from_base64(encrypted);
    
    const decrypted = sodium.crypto_secretbox_open_easy(encryptedBytes, nonceBytes, keyBytes);
    return sodium.to_string(decrypted);
  }

  async signData(data: string, privateKey: string): Promise<string> {
    await this.ready;
    const privateKeyBytes = sodium.from_base64(privateKey);
    const messageBytes = sodium.from_string(data);
    
    const signature = sodium.crypto_sign_detached(messageBytes, privateKeyBytes);
    return sodium.to_base64(signature);
  }

  async verifySignature(data: string, signature: string, publicKey: string): Promise<boolean> {
    await this.ready;
    try {
      const publicKeyBytes = sodium.from_base64(publicKey);
      const signatureBytes = sodium.from_base64(signature);
      const messageBytes = sodium.from_string(data);
      
      return sodium.crypto_sign_verify_detached(signatureBytes, messageBytes, publicKeyBytes);
    } catch {
      return false;
    }
  }

  encryptWithPassword(data: string, password: string): string {
    return CryptoJS.AES.encrypt(data, password).toString();
  }

  decryptWithPassword(encryptedData: string, password: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedData, password);
    return bytes.toString(CryptoJS.enc.Utf8);
  }
  
  async deriveKeyFromPassword(password: string, salt: string): Promise<string> {
    await this.ready;
    
    // Create a deterministic seed from password and salt
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);
    
    // Use first 32 bytes as seed for keypair generation
    const seed = hashArray.slice(0, 32);
    const keyPair = sodium.crypto_sign_seed_keypair(seed);
    
    return sodium.to_base64(keyPair.privateKey);
  }
}