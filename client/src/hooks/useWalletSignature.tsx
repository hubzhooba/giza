import React, { useState, useCallback } from 'react';
import { useWeb3Auth } from '@/contexts/Web3AuthContext';
import toast from 'react-hot-toast';

interface SignatureOptions {
  title?: string;
  description?: string;
  actionType: 'upload' | 'sign' | 'create' | 'delete' | 'update' | 'payment';
  metadata?: Record<string, any>;
}

interface SignatureResult {
  signature: string;
  message: string;
  timestamp: number;
  nonce: string;
}

export function useWalletSignature() {
  const { walletAddress, signMessage, isConnected } = useWeb3Auth();
  const [isSigningInProgress, setIsSigningInProgress] = useState(false);

  const requestSignature = useCallback(async (
    options: SignatureOptions
  ): Promise<SignatureResult | null> => {
    if (!isConnected || !walletAddress) {
      toast.error('Please connect your wallet first');
      return null;
    }

    setIsSigningInProgress(true);

    try {
      // Generate nonce
      const nonce = Math.random().toString(36).substring(2) + Date.now().toString(36);
      const timestamp = Date.now();

      // Create message based on action type
      const messageComponents = [
        '🔐 Giza Signature Request',
        '',
        `Action: ${options.title || getActionTitle(options.actionType)}`,
      ];

      if (options.description) {
        messageComponents.push(`Details: ${options.description}`);
      }

      messageComponents.push(
        '',
        `Wallet: ${walletAddress}`,
        `Timestamp: ${new Date(timestamp).toISOString()}`,
        `Nonce: ${nonce}`,
      );

      if (options.metadata) {
        messageComponents.push('', 'Metadata:');
        Object.entries(options.metadata).forEach(([key, value]) => {
          messageComponents.push(`- ${key}: ${value}`);
        });
      }

      messageComponents.push(
        '',
        'By signing this message, you authorize this action on the Giza platform.',
        '',
        '⚠️  Only sign this if you initiated this action.'
      );

      const message = messageComponents.join('\n');

      // Show toast with action info
      toast.loading(
        <div>
          <p className="font-semibold">Signature Required</p>
          <p className="text-sm">{options.title || getActionTitle(options.actionType)}</p>
        </div>,
        { id: 'signature-request' }
      );

      // Request signature
      const signature = await signMessage(message);

      toast.success('Signature confirmed!', { id: 'signature-request' });

      return {
        signature,
        message,
        timestamp,
        nonce
      };
    } catch (error: any) {
      console.error('Signature request failed:', error);
      toast.error(error.message || 'Signature request cancelled', { id: 'signature-request' });
      return null;
    } finally {
      setIsSigningInProgress(false);
    }
  }, [isConnected, walletAddress, signMessage]);

  const executeSignedAction = useCallback(async <T,>(
    action: (signature: SignatureResult) => Promise<T>,
    options: SignatureOptions
  ): Promise<T | null> => {
    const signature = await requestSignature(options);
    
    if (!signature) {
      return null;
    }

    try {
      return await action(signature);
    } catch (error: any) {
      console.error('Signed action failed:', error);
      toast.error(error.message || 'Action failed after signing');
      return null;
    }
  }, [requestSignature]);

  return {
    requestSignature,
    executeSignedAction,
    isSigningInProgress
  };
}

// Helper to get action titles
function getActionTitle(actionType: SignatureOptions['actionType']): string {
  const titles = {
    upload: 'Upload Document',
    sign: 'Sign Contract',
    create: 'Create Resource',
    delete: 'Delete Resource',
    update: 'Update Resource',
    payment: 'Process Payment'
  };
  return titles[actionType] || 'Perform Action';
}

// Specific hooks for common actions
export function useSignedUpload() {
  const { executeSignedAction, isSigningInProgress } = useWalletSignature();

  const uploadWithSignature = useCallback(async (
    file: File,
    description?: string
  ) => {
    return executeSignedAction(
      async (signature) => {
        // Your upload logic here
        // Include signature in the upload headers or metadata
        return { signature, file };
      },
      {
        actionType: 'upload',
        title: `Upload ${file.name}`,
        description: description || `Upload file to Arweave`,
        metadata: {
          fileName: file.name,
          fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
          fileType: file.type
        }
      }
    );
  }, [executeSignedAction]);

  return { uploadWithSignature, isSigningInProgress };
}

export function useSignedContractAction() {
  const { executeSignedAction, isSigningInProgress } = useWalletSignature();

  const signContract = useCallback(async (
    contractId: string,
    contractName: string
  ) => {
    return executeSignedAction(
      async (signature) => {
        // Contract signing logic
        return { signature, contractId };
      },
      {
        actionType: 'sign',
        title: 'Sign Contract',
        description: `Digitally sign contract: ${contractName}`,
        metadata: {
          contractId,
          contractName
        }
      }
    );
  }, [executeSignedAction]);

  const declineContract = useCallback(async (
    contractId: string,
    contractName: string,
    reason?: string
  ) => {
    return executeSignedAction(
      async (signature) => {
        // Contract declining logic
        return { signature, contractId, declined: true };
      },
      {
        actionType: 'update',
        title: 'Decline Contract',
        description: `Decline contract: ${contractName}`,
        metadata: {
          contractId,
          contractName,
          action: 'decline',
          ...(reason && { reason })
        }
      }
    );
  }, [executeSignedAction]);

  return { signContract, declineContract, isSigningInProgress };
}