import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase-client';
import { useStore } from '@/store/useStore';

interface ArweaveWalletContextType {
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

const ArweaveWalletContext = createContext<ArweaveWalletContextType | undefined>(undefined);

export function ArweaveWalletProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { setUser } = useStore();
  
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [username, setUsernameState] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [isUsernameSet, setIsUsernameSet] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // Check session on mount
  useEffect(() => {
    checkSession();
  }, []);

  // Listen for wallet events
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleWalletSwitch = () => {
      if (isConnected && !isDisconnecting) {
        disconnect();
      }
    };

    window.addEventListener('walletSwitch', handleWalletSwitch);
    
    return () => {
      window.removeEventListener('walletSwitch', handleWalletSwitch);
    };
  }, [isConnected, isDisconnecting]);

  // Check for active session
  const checkSession = async () => {
    try {
      const storedWallet = localStorage.getItem('arweave_wallet_address');
      
      if (storedWallet && typeof window !== 'undefined' && window.arweaveWallet) {
        try {
          const address = await window.arweaveWallet.getActiveAddress();
          if (address === storedWallet) {
            const storedUsername = localStorage.getItem('arweave_username');
            
            // Load profile from database
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('wallet_address', storedWallet)
              .maybeSingle() as {
                data: {
                  username?: string;
                  display_name?: string;
                  [key: string]: any;
                } | null;
                error: any;
              };
            
            setWalletAddress(storedWallet);
            setUsernameState(profile?.username || storedUsername || null);
            setDisplayName(profile?.display_name || profile?.username || storedUsername || null);
            setIsUsernameSet(!!profile?.username);
            setIsConnected(true);
            
            // Set user in global store
            const publicKey = await window.arweaveWallet.getActivePublicKey();
            setUser({
              id: storedWallet,
              email: profile?.email || `${storedWallet.substring(0, 8)}...${storedWallet.slice(-6)}@arweave`,
              name: profile?.display_name || profile?.username || `${storedWallet.substring(0, 8)}...${storedWallet.slice(-6)}`,
              publicKey: publicKey || '',
              createdAt: profile?.created_at ? new Date(profile.created_at) : new Date(),
              updatedAt: new Date(),
            });
            
            await refreshBalanceInternal(storedWallet);
          } else {
            clearSession();
          }
        } catch (e) {
          clearSession();
        }
      }
    } catch (error) {
      console.error('Session check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearSession = () => {
    localStorage.removeItem('arweave_wallet_address');
    localStorage.removeItem('arweave_username');
    setIsConnected(false);
    setWalletAddress(null);
    setUsernameState(null);
    setDisplayName(null);
    setIsUsernameSet(false);
  };

  // Connect wallet
  const connect = async () => {
    try {
      setIsLoading(true);
      
      if (typeof window === 'undefined' || !window.arweaveWallet) {
        toast.error('Please install ArConnect, Wander or another Arweave wallet extension');
        window.open('https://www.arconnect.io/download', '_blank');
        return;
      }
      
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
      
      const walletAddress = await window.arweaveWallet.getActiveAddress();
      const publicKey = await window.arweaveWallet.getActivePublicKey();
      
      // Store in localStorage for persistence
      localStorage.setItem('arweave_wallet_address', walletAddress);
      
      // Check if user exists in database
      const { data: profile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('wallet_address', walletAddress)
        .maybeSingle() as { 
          data: { 
            username?: string; 
            display_name?: string; 
            wallet_balance?: number;
            [key: string]: any;
          } | null; 
          error: any 
        };
      
      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching profile:', fetchError);
      }
      
      if (profile) {
        // Existing user
        setWalletAddress(walletAddress);
        setUsernameState(profile.username || null);
        setDisplayName(profile.display_name || profile.username || null);
        setIsUsernameSet(!!profile.username);
        setIsConnected(true);
        
        // Set user in global store
        setUser({
          id: walletAddress,
          email: profile.email || `${walletAddress.substring(0, 8)}...${walletAddress.slice(-6)}@arweave`,
          name: profile.display_name || profile.username || `${walletAddress.substring(0, 8)}...${walletAddress.slice(-6)}`,
          publicKey: publicKey || '',
          createdAt: profile.created_at ? new Date(profile.created_at) : new Date(),
          updatedAt: new Date(),
        });
        
        if (profile.username) {
          localStorage.setItem('arweave_username', profile.username);
        }
        
        // Get balance
        await refreshBalanceInternal(walletAddress);
        
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
            wallet_address: walletAddress,
          })
          .select()
          .single() as {
            data: {
              id?: string;
              email?: string;
              username?: string;
              display_name?: string;
              created_at?: string;
              [key: string]: any;
            } | null;
            error: any;
          };
        
        if (!insertError && newProfile) {
          setWalletAddress(walletAddress);
          setIsConnected(true);
          
          // Set user in global store
          setUser({
            id: walletAddress,
            email: newProfile.email || `${walletAddress.substring(0, 8)}...${walletAddress.slice(-6)}@arweave`,
            name: newProfile.display_name || newProfile.username || `${walletAddress.substring(0, 8)}...${walletAddress.slice(-6)}`,
            publicKey: publicKey || '',
            createdAt: newProfile.created_at ? new Date(newProfile.created_at) : new Date(),
            updatedAt: new Date(),
          });
          
          toast.success('Welcome! Please set your username.');
          router.push('/onboarding');
        } else {
          console.error('Profile creation error:', insertError);
          // Even if profile creation fails, set user with wallet info
          setWalletAddress(walletAddress);
          setIsConnected(true);
          
          setUser({
            id: walletAddress,
            email: `${walletAddress.substring(0, 8)}...${walletAddress.slice(-6)}@arweave`,
            name: `${walletAddress.substring(0, 8)}...${walletAddress.slice(-6)}`,
            publicKey: publicKey || '',
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          
          toast.success('Connected with wallet!');
          router.push('/dashboard');
        }
      }
      
      // Get balance
      await refreshBalanceInternal(walletAddress);
      
    } catch (error: any) {
      console.error('Wallet connection failed:', error);
      toast.error(error.message || 'Failed to connect wallet');
      clearSession();
    } finally {
      setIsLoading(false);
    }
  };

  // Disconnect wallet
  const disconnect = () => {
    if (isDisconnecting || !isConnected) return;
    
    setIsDisconnecting(true);
    
    // Clear session
    clearSession();
    
    // Clear user from global store
    setUser(null);
    
    // Disconnect from wallet
    if (typeof window !== 'undefined' && window.arweaveWallet?.disconnect) {
      try {
        window.arweaveWallet.disconnect();
      } catch (error) {
        console.error('Error disconnecting wallet:', error);
      }
    }
    
    toast.success('Disconnected successfully');
    
    setTimeout(() => {
      setIsDisconnecting(false);
    }, 1000);
    
    router.push('/');
  };

  // Refresh balance
  const refreshBalanceInternal = async (walletAddress: string) => {
    try {
      // Fetch balance directly from Arweave
      const response = await fetch(`https://arweave.net/wallet/${walletAddress}/balance`);
      const balanceWinston = await response.text();
      
      const balanceInAR = (parseInt(balanceWinston) / 1e12).toFixed(4);
      setBalance(balanceInAR);
      
      // Update balance in database
      await supabase
        .from('profiles')
        .update({ 
          wallet_balance: balanceInAR,
          last_balance_check: new Date().toISOString()
        })
        .eq('wallet_address', walletAddress);
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
      if (!walletAddress) {
        throw new Error('Not connected');
      }

      // Check if username is taken
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', newUsername.toLowerCase())
        .maybeSingle();
      
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
    if (!isConnected || typeof window === 'undefined' || !window.arweaveWallet) {
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
    if (!isConnected || typeof window === 'undefined' || !window.arweaveWallet) {
      throw new Error('Wallet not connected');
    }

    try {
      // Use the wallet's signature method
      const encoder = new TextEncoder();
      const data = encoder.encode(message);
      const signature = await window.arweaveWallet.signature(
        data,
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
    if (!isConnected || typeof window === 'undefined' || !window.arweaveWallet) {
      throw new Error('Wallet not connected');
    }

    try {
      // Use the wallet's dispatch method for data items
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
    <ArweaveWalletContext.Provider value={{
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
    </ArweaveWalletContext.Provider>
  );
}

// Export the hook
export function useArweaveWallet() {
  const context = useContext(ArweaveWalletContext);
  if (context === undefined) {
    throw new Error('useArweaveWallet must be used within an ArweaveWalletProvider');
  }
  return context;
}

// HOC for protected pages
export function withArweaveAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const { isConnected, isLoading } = useArweaveWallet();
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