import Arweave from 'arweave';
import { JWKInterface } from 'arweave/node/lib/wallet';

// Initialize Arweave client
const arweave = Arweave.init({
  host: 'arweave.net',
  port: 443,
  protocol: 'https',
  timeout: 20000,
  logging: false,
});

// GraphQL endpoint for querying Arweave data
const GRAPHQL_ENDPOINT = 'https://arweave.net/graphql';

// App name tag for filtering
const APP_NAME = 'Giza';
const APP_VERSION = '1.0';

// Tag names
const TAGS = {
  APP_NAME: 'App-Name',
  APP_VERSION: 'App-Version',
  TYPE: 'Type',
  WALLET: 'Wallet-Address',
  USERNAME: 'Username',
  ENCRYPTED: 'Encrypted',
  CONTENT_TYPE: 'Content-Type',
  TIMESTAMP: 'Unix-Timestamp',
  ACTION: 'Action',
  REFERENCE: 'Reference-ID',
};

// Data types
export enum DataType {
  PROFILE = 'profile',
  CONTRACT = 'contract',
  DOCUMENT = 'document',
  SIGNATURE = 'signature',
  MESSAGE = 'message',
  ROOM = 'room',
  INVOICE = 'invoice',
}

interface ArweaveData {
  id: string;
  owner: string;
  data: any;
  tags: Record<string, string>;
  timestamp: number;
}

// Upload data to Arweave
export async function uploadToArweave(
  data: any,
  type: DataType,
  tags: Record<string, string> = {},
  useWallet: boolean = true
): Promise<string> {
  try {
    let transaction: any;
    
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    
    if (useWallet && window.arweaveWallet) {
      // Create transaction using wallet
      transaction = await arweave.createTransaction({
        data: dataString,
      });
      
      // Add tags
      transaction.addTag(TAGS.APP_NAME, APP_NAME);
      transaction.addTag(TAGS.APP_VERSION, APP_VERSION);
      transaction.addTag(TAGS.TYPE, type);
      transaction.addTag(TAGS.TIMESTAMP, Date.now().toString());
      transaction.addTag(TAGS.CONTENT_TYPE, 'application/json');
      
      // Add wallet address
      const address = await window.arweaveWallet.getActiveAddress();
      transaction.addTag(TAGS.WALLET, address);
      
      // Add custom tags
      Object.entries(tags).forEach(([key, value]) => {
        transaction.addTag(key, value);
      });
      
      // Sign and dispatch transaction
      await window.arweaveWallet.sign(transaction);
    } else {
      throw new Error('Wallet not connected');
    }
    
    return transaction.id;
  } catch (error) {
    console.error('Arweave upload failed:', error);
    throw error;
  }
}

// Query data from Arweave using GraphQL
export async function queryArweaveData(
  type?: DataType,
  walletAddress?: string,
  additionalTags?: Record<string, string>,
  limit: number = 100
): Promise<ArweaveData[]> {
  try {
    const tagFilters = [
      { name: TAGS.APP_NAME, values: [APP_NAME] },
    ];
    
    if (type) {
      tagFilters.push({ name: TAGS.TYPE, values: [type] });
    }
    
    if (walletAddress) {
      tagFilters.push({ name: TAGS.WALLET, values: [walletAddress] });
    }
    
    if (additionalTags) {
      Object.entries(additionalTags).forEach(([name, value]) => {
        tagFilters.push({ name, values: [value] });
      });
    }
    
    const query = `
      query {
        transactions(
          first: ${limit}
          tags: ${JSON.stringify(tagFilters)}
          sort: HEIGHT_DESC
        ) {
          edges {
            node {
              id
              owner {
                address
              }
              tags {
                name
                value
              }
              block {
                timestamp
              }
            }
          }
        }
      }
    `;
    
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });
    
    const result = await response.json();
    
    if (result.errors) {
      throw new Error('GraphQL query failed');
    }
    
    const transactions = result.data.transactions.edges;
    
    // Fetch data for each transaction
    const dataPromises = transactions.map(async (edge: any) => {
      const node = edge.node;
      const tags: Record<string, string> = {};
      
      node.tags.forEach((tag: any) => {
        tags[tag.name] = tag.value;
      });
      
      try {
        const dataResponse = await fetch(`https://arweave.net/${node.id}`);
        const data = await dataResponse.json();
        
        return {
          id: node.id,
          owner: node.owner.address,
          data,
          tags,
          timestamp: node.block?.timestamp || parseInt(tags[TAGS.TIMESTAMP] || '0'),
        };
      } catch (error) {
        console.error(`Failed to fetch data for ${node.id}:`, error);
        return null;
      }
    });
    
    const results = await Promise.all(dataPromises);
    return results.filter(Boolean) as ArweaveData[];
  } catch (error) {
    console.error('Arweave query failed:', error);
    throw error;
  }
}

// Get specific transaction data
export async function getArweaveData(transactionId: string): Promise<ArweaveData | null> {
  try {
    const response = await fetch(`https://arweave.net/${transactionId}`);
    if (!response.ok) return null;
    
    const data = await response.json();
    
    // Get transaction metadata
    const txResponse = await fetch(`https://arweave.net/tx/${transactionId}`);
    const txData = await txResponse.json();
    
    const tags: Record<string, string> = {};
    txData.tags.forEach((tag: any) => {
      const name = atob(tag.name);
      const value = atob(tag.value);
      tags[name] = value;
    });
    
    return {
      id: transactionId,
      owner: txData.owner,
      data,
      tags,
      timestamp: parseInt(tags[TAGS.TIMESTAMP] || '0'),
    };
  } catch (error) {
    console.error('Failed to get Arweave data:', error);
    return null;
  }
}

// Profile management on Arweave
export async function saveProfileToArweave(profile: {
  username: string;
  displayName: string;
  bio?: string;
  avatar?: string;
  publicKey?: string;
}): Promise<string> {
  const walletAddress = await window.arweaveWallet.getActiveAddress();
  
  return uploadToArweave(
    profile,
    DataType.PROFILE,
    {
      [TAGS.USERNAME]: profile.username.toLowerCase(),
      [TAGS.ACTION]: 'create-profile',
    }
  );
}

export async function getLatestProfile(walletAddress: string): Promise<any | null> {
  const profiles = await queryArweaveData(
    DataType.PROFILE,
    walletAddress,
    undefined,
    1
  );
  
  return profiles.length > 0 ? profiles[0].data : null;
}

// Contract management on Arweave
export async function saveContractToArweave(contract: {
  id: string;
  name: string;
  content: any;
  participants: string[];
  encrypted?: boolean;
}): Promise<string> {
  return uploadToArweave(
    contract,
    DataType.CONTRACT,
    {
      'Contract-ID': contract.id,
      'Contract-Name': contract.name,
      [TAGS.ENCRYPTED]: contract.encrypted ? 'true' : 'false',
      'Participants': contract.participants.join(','),
    }
  );
}

// Document management
export async function saveDocumentToArweave(
  document: Buffer | Uint8Array,
  metadata: {
    name: string;
    mimeType: string;
    contractId?: string;
    encrypted?: boolean;
  }
): Promise<string> {
  if (!window.arweaveWallet) {
    throw new Error('Wallet not connected');
  }
  
  // Create transaction for binary data
  const transaction = await arweave.createTransaction({
    data: document,
  });
  
  // Add tags
  transaction.addTag(TAGS.APP_NAME, APP_NAME);
  transaction.addTag(TAGS.APP_VERSION, APP_VERSION);
  transaction.addTag(TAGS.TYPE, DataType.DOCUMENT);
  transaction.addTag(TAGS.TIMESTAMP, Date.now().toString());
  transaction.addTag(TAGS.CONTENT_TYPE, metadata.mimeType);
  transaction.addTag('Document-Name', metadata.name);
  
  if (metadata.contractId) {
    transaction.addTag('Contract-ID', metadata.contractId);
  }
  
  if (metadata.encrypted) {
    transaction.addTag(TAGS.ENCRYPTED, 'true');
  }
  
  const address = await window.arweaveWallet.getActiveAddress();
  transaction.addTag(TAGS.WALLET, address);
  
  // Sign and dispatch
  await window.arweaveWallet.sign(transaction);
  
  return transaction.id;
}

// Signature management
export async function saveSignatureToArweave(signature: {
  documentId: string;
  contractId: string;
  signature: string;
  signerAddress: string;
  timestamp: number;
}): Promise<string> {
  return uploadToArweave(
    signature,
    DataType.SIGNATURE,
    {
      'Document-ID': signature.documentId,
      'Contract-ID': signature.contractId,
      'Signer': signature.signerAddress,
      [TAGS.ACTION]: 'sign-document',
    }
  );
}

// Get all signatures for a document
export async function getDocumentSignatures(documentId: string): Promise<ArweaveData[]> {
  return queryArweaveData(
    DataType.SIGNATURE,
    undefined,
    { 'Document-ID': documentId }
  );
}

// Room/Tent management
export async function saveRoomToArweave(room: {
  id: string;
  name: string;
  creator: string;
  participants: string[];
  publicKey?: string;
}): Promise<string> {
  return uploadToArweave(
    room,
    DataType.ROOM,
    {
      'Room-ID': room.id,
      'Room-Name': room.name,
      'Creator': room.creator,
      'Participants': room.participants.join(','),
      [TAGS.ACTION]: 'create-room',
    }
  );
}

// Message management for rooms
export async function saveMessageToArweave(message: {
  roomId: string;
  content: string;
  encrypted: boolean;
  sender: string;
}): Promise<string> {
  return uploadToArweave(
    message,
    DataType.MESSAGE,
    {
      'Room-ID': message.roomId,
      [TAGS.ENCRYPTED]: message.encrypted ? 'true' : 'false',
      'Sender': message.sender,
      [TAGS.ACTION]: 'send-message',
    }
  );
}

// Get room messages
export async function getRoomMessages(roomId: string, limit: number = 50): Promise<ArweaveData[]> {
  return queryArweaveData(
    DataType.MESSAGE,
    undefined,
    { 'Room-ID': roomId },
    limit
  );
}

// Check if user has profile on Arweave
export async function hasArweaveProfile(walletAddress: string): Promise<boolean> {
  const profiles = await queryArweaveData(
    DataType.PROFILE,
    walletAddress,
    undefined,
    1
  );
  return profiles.length > 0;
}

// Get transaction status
export async function getTransactionStatus(txId: string): Promise<{
  confirmed: boolean;
  confirmations: number;
  block?: number;
}> {
  try {
    const response = await fetch(`https://arweave.net/tx/${txId}/status`);
    const status = await response.json();
    
    return {
      confirmed: status.number_of_confirmations > 0,
      confirmations: status.number_of_confirmations || 0,
      block: status.block_height,
    };
  } catch (error) {
    return {
      confirmed: false,
      confirmations: 0,
    };
  }
}

// Monitor transaction confirmation
export async function waitForConfirmation(
  txId: string,
  requiredConfirmations: number = 10,
  maxAttempts: number = 30,
  interval: number = 10000
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await getTransactionStatus(txId);
    
    if (status.confirmations >= requiredConfirmations) {
      return true;
    }
    
    if (i < maxAttempts - 1) {
      await new Promise(resolve => setTimeout(resolve, interval));
    }
  }
  
  return false;
}