import React from 'react';
import { ConnectButton } from '@arweave-wallet-kit/react';
import { useArweaveWallet } from '@/contexts/ArweaveWalletProvider';

interface ArweaveConnectButtonProps {
  className?: string;
  showBalance?: boolean;
  showProfilePicture?: boolean;
}

export function ArweaveConnectButton({ 
  className = '',
  showBalance = true,
  showProfilePicture = true 
}: ArweaveConnectButtonProps) {
  const { username, displayName } = useArweaveWallet();
  
  return (
    <div className={className}>
      <ConnectButton
        accent="rgb(59, 130, 246)"
        profileModal={true}
        showBalance={showBalance}
        showProfilePicture={showProfilePicture}
        useAns={true}
      />
      {displayName && (
        <span className="ml-2 text-sm text-gray-600">
          {displayName}
        </span>
      )}
    </div>
  );
}

// Alternative custom button if needed
export function CustomArweaveButton({ className = '' }: { className?: string }) {
  const { 
    isConnected, 
    walletAddress, 
    balance, 
    connect, 
    disconnect,
    displayName 
  } = useArweaveWallet();
  
  if (!isConnected) {
    return (
      <button
        onClick={connect}
        className={`px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors ${className}`}
      >
        Connect Arweave Wallet
      </button>
    );
  }
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex flex-col items-end">
        <span className="text-sm font-medium">
          {displayName || `${walletAddress?.substring(0, 6)}...${walletAddress?.slice(-4)}`}
        </span>
        {balance && (
          <span className="text-xs text-gray-500">{balance} AR</span>
        )}
      </div>
      <button
        onClick={disconnect}
        className="px-3 py-1 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
      >
        Disconnect
      </button>
    </div>
  );
}