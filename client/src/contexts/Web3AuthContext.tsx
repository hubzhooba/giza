import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase-client';
import { StoarService } from '@/lib/stoar';

interface Web3AuthContextType {
  isConnected: boolean;
  walletAddress: string | null;
  username: string | null;
  displayName: string | null;
  isUsernameSet: boolean;
  balance: string | null;
  isLoading: boolean;
  authToken: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  setUsername: (username: string) => Promise<boolean>;
  signTransaction: (transaction: any) => Promise<string>;
  signMessage: (message: string) => Promise<string>;
  signDataItem: (dataItem: any) => Promise<any>;
  verifySignature: (message: string, signature: string, address?: string) => Promise<boolean>;
}

const Web3AuthContext = createContext<Web3AuthContextType | undefined>(undefined);

// Auth message format
const AUTH_MESSAGE_PREFIX = 'Giza Authentication\n\nSign this message to authenticate with Giza.\n\nNonce: ';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Helper to check if ArConnect is installed
const isArConnectInstalled = () => {
  return typeof window !== 'undefined' && window.arweaveWallet;
};

// Generate auth message
const generateAuthMessage = (nonce: string): string => {
  return `${AUTH_MESSAGE_PREFIX}${nonce}\n\nTimestamp: ${new Date().toISOString()}\n\nThis signature will be used to authenticate your session.`;
};

// Verify signature using Arweave crypto
const verifyArweaveSignature = async (
  message: string,
  signature: string,
  publicKey: string
): Promise<boolean> => {
  try {
    // Import Arweave crypto utilities
    const Arweave = (await import('arweave')).default;
    const arweave = Arweave.init({});
    
    // Convert message to Uint8Array
    const messageBuffer = new TextEncoder().encode(message);
    
    // Decode base64 signature
    const signatureBuffer = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
    
    // Verify signature
    const valid = await arweave.crypto.verify(
      publicKey,
      messageBuffer,
      signatureBuffer
    );
    
    return valid;
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
};

export function Web3AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [username, setUsernameState] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isUsernameSet, setIsUsernameSet] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // Check session on mount
  useEffect(() => {
    checkSession();
  }, []);

  // Listen for wallet events
  useEffect(() => {
    if (!window.arweaveWallet) return;

    const handleDisconnect = () => {
      disconnect();
    };

    window.addEventListener('arweaveWalletLoaded', checkSession);
    window.addEventListener('walletSwitch', handleDisconnect);
    
    return () => {
      window.removeEventListener('arweaveWalletLoaded', checkSession);
      window.removeEventListener('walletSwitch', handleDisconnect);
    };
  }, []);

  // Check for active session
  const checkSession = async () => {
    try {
      const storedSession = localStorage.getItem('giza_session');
      
      if (storedSession) {
        const session = JSON.parse(storedSession);
        
        // Check if session is still valid
        if (Date.now() - session.timestamp > SESSION_DURATION) {
          localStorage.removeItem('giza_session');
          return;
        }
        
        // Verify wallet is still connected
        if (window.arweaveWallet) {
          try {
            const address = await window.arweaveWallet.getActiveAddress();
            
            if (address === session.walletAddress) {
              // Restore session
              setWalletAddress(session.walletAddress);
              setUsernameState(session.username);
              setDisplayName(session.displayName);
              setIsUsernameSet(session.isUsernameSet);
              setAuthToken(session.authToken);
              setIsConnected(true);
              
              // Refresh balance
              await refreshBalanceInternal(session.walletAddress);
              
              // Initialize STOAR with wallet
              const stoar = StoarService.getInstance();
              await stoar.init('use_wallet');
            } else {
              // Different wallet, clear session
              localStorage.removeItem('giza_session');
            }
          } catch (e) {
            // Wallet not connected
            localStorage.removeItem('giza_session');
          }
        }
      }
    } catch (error) {
      console.error('Session check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Connect wallet - Web3 native approach
  const connect = async () => {
    if (!isArConnectInstalled()) {
      toast.error('Please install ArConnect extension first');
      window.open('https://www.arconnect.io', '_blank');
      return;
    }

    try {
      setIsLoading(true);
      
      // Request permissions
      await window.arweaveWallet.connect([
        'ACCESS_ADDRESS',
        'ACCESS_PUBLIC_KEY',
        'SIGN_TRANSACTION',
        'ENCRYPT',
        'DECRYPT',
        'SIGNATURE',
        'ACCESS_ARWEAVE_CONFIG',
        'DISPATCH'
      ]);

      // Get wallet details
      const address = await window.arweaveWallet.getActiveAddress();
      const publicKey = await window.arweaveWallet.getActivePublicKey();
      
      // Generate nonce for signature
      const nonce = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const authMessage = generateAuthMessage(nonce);
      
      // Sign authentication message
      let signature: string;
      try {
        // TEMPORARY: Force use of legacy API
        const encoder = new TextEncoder();
        const data = encoder.encode(authMessage);
        const sig = await window.arweaveWallet.signature(
          data,
          {
            name: "RSA-PSS",
            saltLength: 32,
          }
        );
        signature = btoa(Array.from(new Uint8Array(sig), b => String.fromCharCode(b)).join(''));
      } catch (error) {
        throw new Error('Failed to sign authentication message');
      }
      
      // Create auth token (in production, this would be verified server-side)
      const authToken = btoa(JSON.stringify({
        address,
        signature,
        nonce,
        timestamp: Date.now()
      }));
      
      // Check if user exists in database
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('wallet_address', address)
        .maybeSingle() as {
          data: {
            username?: string;
            display_name?: string;
            [key: string]: any;
          } | null;
          error: any;
        };
      
      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching profile:', fetchError);
      }
      
      if (profile) {
        // Existing user
        setWalletAddress(address);
        setUsernameState(profile.username || null);
        setDisplayName(profile.display_name || profile.username || null);
        setIsUsernameSet(!!profile.username);
        setAuthToken(authToken);
        setIsConnected(true);
        
        // Save session
        const session = {
          walletAddress: address,
          username: profile.username,
          displayName: profile.display_name || profile.username,
          isUsernameSet: !!profile.username,
          authToken,
          timestamp: Date.now()
        };
        localStorage.setItem('giza_session', JSON.stringify(session));
        
        // Initialize STOAR with wallet
        const stoar = StoarService.getInstance();
        await stoar.init('use_wallet');
        
        // Get balance
        await refreshBalanceInternal(address);
        
        toast.success(`Welcome back${profile.username ? ', ' + profile.username : ''}!`);
        
        if (!profile.username) {
          router.push('/onboarding');
        } else {
          router.push('/dashboard');
        }
      } else {
        // New user - create profile with public key
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            wallet_address: address,
            public_key: publicKey,
            // Don't set name or email - they might not exist in the table
            auth_signature: signature,
            auth_nonce: nonce,
            last_login: new Date().toISOString()
          })
          .select()
          .single();
        
        if (!insertError && newProfile) {
          setWalletAddress(address);
          setAuthToken(authToken);
          setIsConnected(true);
          
          // Save minimal session for new user
          const session = {
            walletAddress: address,
            username: null,
            displayName: null,
            isUsernameSet: false,
            authToken,
            timestamp: Date.now()
          };
          localStorage.setItem('giza_session', JSON.stringify(session));
          
          // Initialize STOAR
          const stoar = StoarService.getInstance();
          await stoar.init('use_wallet');
          
          toast.success('Welcome! Please set your username.');
          router.push('/onboarding');
        } else {
          console.error('Profile creation error:', insertError);
          throw new Error('Failed to create profile');
        }
      }
      
    } catch (error: any) {
      console.error('Wallet connection failed:', error);
      toast.error(error.message || 'Failed to connect wallet');
      localStorage.removeItem('giza_session');
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect wallet
  const disconnect = () => {
    // Clear session
    localStorage.removeItem('giza_session');
    
    // Reset state
    setIsConnected(false);
    setWalletAddress(null);
    setUsernameState(null);
    setDisplayName(null);
    setIsUsernameSet(false);
    setBalance(null);
    setAuthToken(null);
    
    // Disconnect from ArConnect
    if (window.arweaveWallet) {
      window.arweaveWallet.disconnect();
    }
    
    // Redirect to home
    router.push('/');
    toast.success('Disconnected successfully');
  };

  // Refresh balance using Arweave gateway
  const refreshBalanceInternal = async (address: string) => {
    try {
      const response = await fetch(`https://arweave.net/wallet/${address}/balance`);
      const balanceInWinston = await response.text();
      const balanceInAR = (parseInt(balanceInWinston) / 1e12).toFixed(4);
      setBalance(balanceInAR);
      
      // Update balance in database with signature
      if (window.arweaveWallet) {
        const updateMessage = `Update balance: ${balanceInAR} AR at ${new Date().toISOString()}`;
        let signature: string;
        
        try {
          // TEMPORARY: Force use of legacy API
          const encoder = new TextEncoder();
          const data = encoder.encode(updateMessage);
          const sig = await window.arweaveWallet.signature(
            data,
            { name: "RSA-PSS", saltLength: 32 }
          );
          signature = btoa(Array.from(new Uint8Array(sig), b => String.fromCharCode(b)).join(''));
          
          await supabase
            .from('profiles')
            .update({ 
              wallet_balance: balanceInAR,
              last_balance_check: new Date().toISOString(),
              balance_signature: signature
            })
            .eq('wallet_address', address);
        } catch (e) {
          // Update without signature if signing fails
          await supabase
            .from('profiles')
            .update({ 
              wallet_balance: balanceInAR,
              last_balance_check: new Date().toISOString()
            })
            .eq('wallet_address', address);
        }
      }
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    }
  };

  const refreshBalance = async () => {
    if (walletAddress) {
      await refreshBalanceInternal(walletAddress);
    }
  };

  // Set username with signature
  const setUsername = async (newUsername: string): Promise<boolean> => {
    try {
      if (!walletAddress || !window.arweaveWallet) {
        throw new Error('Not connected');
      }

      // Check if username is taken
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', newUsername.toLowerCase())
        .single();
      
      if (existing) {
        toast.error('Username already taken');
        return false;
      }

      // Sign username change
      const message = `Set username to: ${newUsername}\nWallet: ${walletAddress}\nTimestamp: ${new Date().toISOString()}`;
      let signature: string;
      
      try {
        // TEMPORARY: Force use of legacy API
        const encoder = new TextEncoder();
        const data = encoder.encode(message);
        const sig = await window.arweaveWallet.signature(
          data,
          { name: "RSA-PSS", saltLength: 32 }
        );
        signature = btoa(Array.from(new Uint8Array(sig), b => String.fromCharCode(b)).join(''));
      } catch (error) {
        throw new Error('Failed to sign username change');
      }

      // Update username with signature
      const { error } = await supabase
        .from('profiles')
        .update({
          username: newUsername.toLowerCase(),
          display_name: newUsername,
          is_username_set: true,
          username_signature: signature,
          updated_at: new Date().toISOString()
        })
        .eq('wallet_address', walletAddress);

      if (error) {
        throw error;
      }

      // Update local state
      setUsernameState(newUsername);
      setDisplayName(newUsername);
      setIsUsernameSet(true);
      
      // Update session
      const session = JSON.parse(localStorage.getItem('giza_session') || '{}');
      session.username = newUsername;
      session.displayName = newUsername;
      session.isUsernameSet = true;
      localStorage.setItem('giza_session', JSON.stringify(session));
      
      toast.success('Username set successfully!');
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Failed to set username');
      return false;
    }
  };

  // Sign transaction for Arweave
  const signTransaction = async (transaction: any): Promise<string> => {
    if (!isConnected || !window.arweaveWallet) {
      throw new Error('Wallet not connected');
    }

    try {
      const signedTx = await window.arweaveWallet.sign(transaction);
      
      // Log transaction for audit
      await supabase
        .from('transaction_logs')
        .insert({
          wallet_address: walletAddress,
          transaction_id: signedTx.id,
          transaction_type: 'arweave',
          timestamp: new Date().toISOString()
        });
      
      return signedTx.id;
    } catch (error: any) {
      console.error('Transaction signing failed:', error);
      throw new Error(error.message || 'Failed to sign transaction');
    }
  };

  // Sign message with better error handling
  const signMessage = async (message: string): Promise<string> => {
    if (!isConnected || !window.arweaveWallet) {
      throw new Error('Wallet not connected');
    }

    try {
      let signature: string;
      
      // TEMPORARY: Force use of legacy API
      const encoder = new TextEncoder();
      const data = encoder.encode(message);
      const sig = await window.arweaveWallet.signature(
        data,
        {
          name: "RSA-PSS",
          saltLength: 32,
        }
      );
      signature = btoa(Array.from(new Uint8Array(sig), b => String.fromCharCode(b)).join(''));
      
      return signature;
    } catch (error: any) {
      console.error('Message signing failed:', error);
      throw new Error(error.message || 'Failed to sign message');
    }
  };

  // Sign data item for STOAR
  const signDataItem = async (dataItem: any): Promise<any> => {
    if (!isConnected || !window.arweaveWallet) {
      throw new Error('Wallet not connected');
    }

    try {
      const result = await window.arweaveWallet.dispatch({
        type: 'sign_data_item',
        data: dataItem
      });
      return result;
    } catch (error: any) {
      console.error('Data item signing failed:', error);
      throw new Error(error.message || 'Failed to sign data item');
    }
  };

  // Verify signature
  const verifySignature = async (
    message: string,
    signature: string,
    address?: string
  ): Promise<boolean> => {
    try {
      const targetAddress = address || walletAddress;
      if (!targetAddress) return false;
      
      // Get public key for address
      const { data: profile } = await supabase
        .from('profiles')
        .select('public_key')
        .eq('wallet_address', targetAddress)
        .single() as {
          data: {
            public_key?: string;
          } | null;
        };
      
      if (!profile?.public_key) return false;
      
      return await verifyArweaveSignature(message, signature, profile.public_key);
    } catch (error) {
      console.error('Signature verification failed:', error);
      return false;
    }
  };

  return (
    <Web3AuthContext.Provider value={{
      isConnected,
      walletAddress,
      username,
      displayName,
      isUsernameSet,
      balance,
      isLoading,
      authToken,
      connect,
      disconnect,
      refreshBalance,
      setUsername,
      signTransaction,
      signMessage,
      signDataItem,
      verifySignature
    }}>
      {children}
    </Web3AuthContext.Provider>
  );
}

export function useWeb3Auth() {
  const context = useContext(Web3AuthContext);
  if (context === undefined) {
    throw new Error('useWeb3Auth must be used within a Web3AuthProvider');
  }
  return context;
}

// HOC for protected pages
export function withWeb3Auth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const { isConnected, isLoading } = useWeb3Auth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading && !isConnected) {
        router.push('/');
      }
    }, [isConnected, isLoading, router]);

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      );
    }

    if (!isConnected) {
      return null;
    }

    return <Component {...props} />;
  };
}