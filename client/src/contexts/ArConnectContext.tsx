import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase-client';

interface ArConnectContextType {
  isConnected: boolean;
  walletAddress: string | null;
  username: string | null;
  displayName: string | null;
  isUsernameSet: boolean;
  balance: string | null;
  isLoading: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  setUsername: (username: string) => Promise<boolean>;
  signTransaction: (transaction: any) => Promise<string>;
  signMessage: (message: string) => Promise<string>;
  signDataItem: (dataItem: any) => Promise<any>;
}

const ArConnectContext = createContext<ArConnectContextType | undefined>(undefined);

// Helper to check if ArConnect is installed
const isArConnectInstalled = () => {
  return typeof window !== 'undefined' && window.arweaveWallet;
};

// Helper to generate nonce
const generateNonce = () => {
  return Date.now().toString() + Math.random().toString(36).substring(2);
};

export function ArConnectProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [username, setUsernameState] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isUsernameSet, setIsUsernameSet] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check session on mount
  useEffect(() => {
    checkSession();
  }, []);

  // Listen for wallet disconnect events
  useEffect(() => {
    if (!window.arweaveWallet) return;

    const handleDisconnect = () => {
      disconnect();
    };

    // Listen for ArConnect events
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
      const storedWallet = localStorage.getItem('arweave_wallet_address');
      const storedUsername = localStorage.getItem('arweave_username');
      
      if (storedWallet) {
        // Check if wallet is still connected
        if (window.arweaveWallet) {
          try {
            const address = await window.arweaveWallet.getActiveAddress();
            if (address === storedWallet) {
              setWalletAddress(storedWallet);
              setUsernameState(storedUsername);
              setDisplayName(storedUsername);
              setIsUsernameSet(!!storedUsername);
              setIsConnected(true);
              await refreshBalanceInternal(storedWallet);
            } else {
              // Different wallet connected, clear session
              localStorage.removeItem('arweave_wallet_address');
              localStorage.removeItem('arweave_username');
            }
          } catch (e) {
            // Wallet not connected
            localStorage.removeItem('arweave_wallet_address');
            localStorage.removeItem('arweave_username');
          }
        }
      }
    } catch (error) {
      console.error('Session check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Connect wallet - simplified version that works without backend
  const connect = async () => {
    if (!isArConnectInstalled()) {
      toast.error('Please install ArConnect extension first');
      window.open('https://www.arconnect.io', '_blank');
      return;
    }

    try {
      setIsLoading(true);
      
      // Request permissions - updated for latest ArConnect
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

      // Get wallet address
      const address = await window.arweaveWallet.getActiveAddress();
      
      // Store in localStorage for persistence
      localStorage.setItem('arweave_wallet_address', address);
      
      // Check if user exists in database
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('wallet_address', address)
        .maybeSingle();
      
      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching profile:', fetchError);
      }
      
      if (profile) {
        // Existing user
        setWalletAddress(address);
        setUsernameState(profile.username);
        setDisplayName(profile.display_name || profile.username);
        setIsUsernameSet(!!profile.username);
        setIsConnected(true);
        
        if (profile.username) {
          localStorage.setItem('arweave_username', profile.username);
        }
        
        // Get balance
        await refreshBalanceInternal(address);
        
        toast.success(`Welcome back${profile.username ? ', ' + profile.username : ''}!`);
        
        if (!profile.username) {
          router.push('/onboarding');
        } else {
          router.push('/dashboard');
        }
      } else {
        // New user - create profile
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            wallet_address: address,
            name: `User ${address.substring(0, 8)}`,
            // Don't set email as it's not required for wallet users
          })
          .select()
          .single();
        
        if (!insertError && newProfile) {
          setWalletAddress(address);
          setIsConnected(true);
          toast.success('Welcome! Please set your username.');
          router.push('/onboarding');
        } else {
          console.error('Profile creation error:', insertError);
          throw new Error('Failed to create profile');
        }
      }
      
      // Get balance
      await refreshBalanceInternal(address);
      
    } catch (error: any) {
      console.error('Wallet connection failed:', error);
      toast.error(error.message || 'Failed to connect wallet');
      // Clear any stored data
      localStorage.removeItem('arweave_wallet_address');
      localStorage.removeItem('arweave_username');
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect wallet
  const disconnect = () => {
    // Clear session
    localStorage.removeItem('arweave_wallet_address');
    localStorage.removeItem('arweave_username');
    
    // Reset state
    setIsConnected(false);
    setWalletAddress(null);
    setUsernameState(null);
    setDisplayName(null);
    setIsUsernameSet(false);
    setBalance(null);
    
    // Disconnect from ArConnect
    if (window.arweaveWallet) {
      window.arweaveWallet.disconnect();
    }
    
    // Redirect to home
    router.push('/');
    toast.success('Disconnected successfully');
  };

  // Refresh balance
  const refreshBalanceInternal = async (address: string) => {
    try {
      const response = await fetch(`https://arweave.net/wallet/${address}/balance`);
      const balanceInWinston = await response.text();
      const balanceInAR = (parseInt(balanceInWinston) / 1e12).toFixed(4);
      setBalance(balanceInAR);
      
      // Update balance in database
      await supabase
        .from('profiles')
        .update({ 
          wallet_balance: balanceInAR,
          last_balance_check: new Date().toISOString()
        })
        .eq('wallet_address', address);
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    }
  };

  const refreshBalance = async () => {
    if (walletAddress) {
      await refreshBalanceInternal(walletAddress);
    }
  };

  // Set username - works directly with Supabase
  const setUsername = async (newUsername: string): Promise<boolean> => {
    try {
      if (!walletAddress) {
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

      // Update username
      const { error } = await supabase
        .from('profiles')
        .update({
          username: newUsername.toLowerCase(),
          display_name: newUsername,
          is_username_set: true,
          updated_at: new Date().toISOString()
        })
        .eq('wallet_address', walletAddress);

      if (error) {
        throw error;
      }

      setUsernameState(newUsername);
      setDisplayName(newUsername);
      setIsUsernameSet(true);
      localStorage.setItem('arweave_username', newUsername);
      toast.success('Username set successfully!');
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Failed to set username');
      return false;
    }
  };

  // Sign transaction
  const signTransaction = async (transaction: any): Promise<string> => {
    if (!isConnected || !window.arweaveWallet) {
      throw new Error('Wallet not connected');
    }

    try {
      const signedTx = await window.arweaveWallet.sign(transaction);
      return signedTx.id;
    } catch (error: any) {
      console.error('Transaction signing failed:', error);
      throw new Error(error.message || 'Failed to sign transaction');
    }
  };

  // Sign message - using the new API
  const signMessage = async (message: string): Promise<string> => {
    if (!isConnected || !window.arweaveWallet) {
      throw new Error('Wallet not connected');
    }

    try {
      // Use the new signMessage API if available
      if (window.arweaveWallet.signMessage) {
        const signature = await window.arweaveWallet.signMessage(message);
        return signature;
      } else {
        // Fallback to old API
        console.warn('Using deprecated signature API');
        const signature = await window.arweaveWallet.signature(
          new TextEncoder().encode(message),
          {
            name: "RSA-PSS",
            saltLength: 32,
          }
        );
        return btoa(Array.from(new Uint8Array(signature), b => String.fromCharCode(b)).join(''));
      }
    } catch (error: any) {
      console.error('Message signing failed:', error);
      throw new Error(error.message || 'Failed to sign message');
    }
  };

  // Sign data item (for STOAR)
  const signDataItem = async (dataItem: any): Promise<any> => {
    if (!isConnected || !window.arweaveWallet) {
      throw new Error('Wallet not connected');
    }

    try {
      // For STOAR data items, we need to dispatch the signing
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

  return (
    <ArConnectContext.Provider value={{
      isConnected,
      walletAddress,
      username,
      displayName,
      isUsernameSet,
      balance,
      isLoading,
      connect,
      disconnect,
      refreshBalance,
      setUsername,
      signTransaction,
      signMessage,
      signDataItem
    }}>
      {children}
    </ArConnectContext.Provider>
  );
}

export function useArConnect() {
  const context = useContext(ArConnectContext);
  if (context === undefined) {
    throw new Error('useArConnect must be used within an ArConnectProvider');
  }
  return context;
}

// HOC for protected pages
export function withArConnectAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const { isConnected, isLoading } = useArConnect();
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