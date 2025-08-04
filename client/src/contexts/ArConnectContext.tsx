import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';

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
      const token = localStorage.getItem('arweave_session_token');
      if (!token) {
        setIsLoading(false);
        return;
      }

      // Validate session with backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/validate-session`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.isValid) {
          setWalletAddress(data.walletAddress);
          setUsernameState(data.username);
          setDisplayName(data.displayName);
          setIsUsernameSet(data.isUsernameSet);
          setIsConnected(true);
          
          // Refresh balance
          await refreshBalanceInternal(data.walletAddress);
        } else {
          // Session expired
          localStorage.removeItem('arweave_session_token');
        }
      }
    } catch (error) {
      console.error('Session check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Connect wallet
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
      
      // Sign a message to verify ownership
      const nonce = generateNonce();
      const message = `Sign this message to authenticate with Giza.\nNonce: ${nonce}`;
      const signature = await window.arweaveWallet.signature(
        new TextEncoder().encode(message),
        {
          name: "RSA-PSS",
          saltLength: 32,
        }
      );
      
      // Authenticate with backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/wallet-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          walletAddress: address,
          permissions: ['ACCESS_ADDRESS', 'ACCESS_PUBLIC_KEY', 'SIGN_TRANSACTION', 'ENCRYPT', 'DECRYPT', 'SIGNATURE', 'ACCESS_ARWEAVE_CONFIG', 'DISPATCH'],
          nonce,
          signature: Array.from(new Uint8Array(signature))
        })
      });

      if (!response.ok) {
        throw new Error('Authentication failed');
      }

      const data = await response.json();
      
      // Store session
      localStorage.setItem('arweave_session_token', data.sessionToken);
      
      // Update state
      setWalletAddress(address);
      setUsernameState(data.username);
      setDisplayName(data.displayName || data.username);
      setIsUsernameSet(data.isUsernameSet);
      setIsConnected(true);
      
      // Get balance
      await refreshBalanceInternal(address);
      
      // Show success message
      if (data.isNewUser) {
        toast.success('Welcome! Please set your username.');
        router.push('/onboarding');
      } else {
        toast.success(`Welcome back${data.username ? ', ' + data.username : ''}!`);
        if (!data.isUsernameSet) {
          router.push('/onboarding');
        } else {
          router.push('/dashboard');
        }
      }
    } catch (error: any) {
      console.error('Wallet connection failed:', error);
      toast.error(error.message || 'Failed to connect wallet');
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect wallet
  const disconnect = () => {
    // Clear session
    localStorage.removeItem('arweave_session_token');
    
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
      
      // Update balance in backend
      const token = localStorage.getItem('arweave_session_token');
      if (token) {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/update-balance`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ balance: balanceInAR })
        });
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

  // Set username
  const setUsername = async (newUsername: string): Promise<boolean> => {
    try {
      const token = localStorage.getItem('arweave_session_token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/set-username`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: newUsername })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Username update failed');
      }

      const data = await response.json();
      if (data.success) {
        setUsernameState(newUsername);
        setDisplayName(newUsername);
        setIsUsernameSet(true);
        toast.success('Username set successfully!');
        return true;
      }
      
      return false;
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

  // Sign message
  const signMessage = async (message: string): Promise<string> => {
    if (!isConnected || !window.arweaveWallet) {
      throw new Error('Wallet not connected');
    }

    try {
      const signature = await window.arweaveWallet.signature(
        new TextEncoder().encode(message),
        {
          name: "RSA-PSS",
          saltLength: 32,
        }
      );
      return btoa(Array.from(new Uint8Array(signature), b => String.fromCharCode(b)).join(''));
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