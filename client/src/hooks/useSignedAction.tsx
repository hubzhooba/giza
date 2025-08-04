import React, { useState } from 'react';
import { useArConnect } from '@/contexts/ArConnectContext';
import toast from 'react-hot-toast';

interface SignedActionOptions {
  action: string;
  description?: string;
  requireConfirmation?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  metadata?: Record<string, any>;
}

export function useSignedAction() {
  const { signMessage, isConnected, walletAddress } = useArConnect();
  const [isSigningInProgress, setIsSigningInProgress] = useState(false);

  const executeSignedAction = async <T,>(
    actionFn: () => Promise<T>,
    options: SignedActionOptions
  ): Promise<T | null> => {
    if (!isConnected || !walletAddress) {
      toast.error('Please connect your wallet first');
      return null;
    }

    try {
      setIsSigningInProgress(true);
      
      // Show confirmation dialog if required
      if (options.requireConfirmation) {
        const confirmed = window.confirm(
          options.description || `Do you want to ${options.action}?`
        );
        if (!confirmed) {
          setIsSigningInProgress(false);
          return null;
        }
      }

      // Generate action message with timestamp and metadata
      const timestamp = Date.now();
      const nonce = Math.random().toString(36).substring(2) + Date.now().toString(36);
      
      // Create a structured message
      const messageComponents = [
        '🔐 Giza Action Request',
        '',
        `Action: ${options.action}`,
        `Wallet: ${walletAddress}`,
        `Timestamp: ${new Date(timestamp).toISOString()}`,
        `Nonce: ${nonce}`,
      ];

      if (options.metadata) {
        messageComponents.push('', 'Details:');
        Object.entries(options.metadata).forEach(([key, value]) => {
          messageComponents.push(`- ${key}: ${value}`);
        });
      }

      messageComponents.push(
        '',
        'By signing this message, you authorize this action.',
        '',
        '⚠️  Only sign if you initiated this action.'
      );

      const message = messageComponents.join('\n');

      // Show signing toast with better UI
      const signingToast = toast.loading(
        <div>
          <p className="font-semibold">Signature Required</p>
          <p className="text-sm text-gray-600">{options.action}</p>
        </div>,
        { duration: Infinity }
      );

      try {
        // Request signature
        const signature = await signMessage(message);
        toast.dismiss(signingToast);
        toast.success('✅ Signature confirmed');

        // Execute the action with signature metadata
        const result = await actionFn();
        
        options.onSuccess?.();
        toast.success(`${options.action} completed successfully`);
        
        return result;
      } catch (signError: any) {
        toast.dismiss(signingToast);
        
        // Better error handling for different rejection types
        if (signError.message?.includes('User rejected') || 
            signError.message?.includes('user cancelled') ||
            signError.message?.includes('User cancelled')) {
          toast.error('Signature request cancelled');
        } else if (signError.message?.includes('not connected')) {
          toast.error('Wallet disconnected. Please reconnect.');
        } else {
          console.error('Signing error:', signError);
          toast.error('Failed to sign action. Please try again.');
        }
        return null;
      }
    } catch (error: any) {
      console.error('Signed action failed:', error);
      options.onError?.(error);
      toast.error(error.message || `Failed to ${options.action}`);
      return null;
    } finally {
      setIsSigningInProgress(false);
    }
  };

  const signDocument = async (
    documentId: string,
    documentName: string,
    signFn: () => Promise<any>
  ) => {
    return executeSignedAction(signFn, {
      action: 'Sign Contract',
      description: `Sign the contract "${documentName}"?\n\nThis action is permanent and legally binding.`,
      requireConfirmation: true,
      metadata: {
        'Document ID': documentId,
        'Document Name': documentName,
        'Action Type': 'Legal Signature'
      }
    });
  };

  const uploadDocument = async (
    fileName: string,
    uploadFn: () => Promise<any>,
    fileSize?: number
  ) => {
    const metadata: Record<string, any> = {
      'File Name': fileName,
      'Storage': 'Arweave (Permanent)'
    };
    
    if (fileSize) {
      metadata['File Size'] = `${(fileSize / 1024 / 1024).toFixed(2)} MB`;
    }
    
    return executeSignedAction(uploadFn, {
      action: 'Upload to Arweave',
      description: `Upload "${fileName}" to Arweave?\n\nThis will permanently store the document on the blockchain.`,
      requireConfirmation: false, // Signing is confirmation enough
      metadata
    });
  };

  const declineDocument = async (
    documentName: string,
    declineFn: () => Promise<any>,
    reason?: string
  ) => {
    const metadata: Record<string, any> = {
      'Document Name': documentName,
      'Action': 'Decline'
    };
    
    if (reason) {
      metadata['Reason'] = reason;
    }
    
    return executeSignedAction(declineFn, {
      action: 'Decline Contract',
      description: `Decline the contract "${documentName}"?\n\nYou can provide feedback for revisions.`,
      requireConfirmation: true,
      metadata
    });
  };

  const createContract = async (
    contractName: string,
    createFn: () => Promise<any>,
    contractType?: string
  ) => {
    const metadata: Record<string, any> = {
      'Contract Name': contractName
    };
    
    if (contractType) {
      metadata['Contract Type'] = contractType;
    }
    
    return executeSignedAction(createFn, {
      action: 'Create Contract',
      description: `Create contract "${contractName}"?`,
      requireConfirmation: false,
      metadata
    });
  };

  const deleteResource = async (
    resourceType: string,
    resourceName: string,
    deleteFn: () => Promise<any>
  ) => {
    return executeSignedAction(deleteFn, {
      action: `Delete ${resourceType}`,
      description: `Are you sure you want to delete "${resourceName}"?\n\nThis action cannot be undone.`,
      requireConfirmation: true,
      metadata: {
        'Resource Type': resourceType,
        'Resource Name': resourceName,
        'Action': 'Permanent Deletion'
      }
    });
  };

  const updateResource = async (
    resourceType: string,
    resourceName: string,
    updateFn: () => Promise<any>,
    changes?: string[]
  ) => {
    const metadata: Record<string, any> = {
      'Resource Type': resourceType,
      'Resource Name': resourceName
    };
    
    if (changes && changes.length > 0) {
      metadata['Changes'] = changes.join(', ');
    }
    
    return executeSignedAction(updateFn, {
      action: `Update ${resourceType}`,
      requireConfirmation: false,
      metadata
    });
  };

  return {
    executeSignedAction,
    signDocument,
    uploadDocument,
    declineDocument,
    createContract,
    deleteResource,
    updateResource,
    isSigningInProgress
  };
}