import { useArConnect } from '@/contexts/ArConnectContext';
import toast from 'react-hot-toast';

interface SignedActionOptions {
  action: string;
  description?: string;
  requireConfirmation?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useSignedAction() {
  const { signMessage, isConnected } = useArConnect();

  const executeSignedAction = async <T>(
    actionFn: () => Promise<T>,
    options: SignedActionOptions
  ): Promise<T | null> => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return null;
    }

    try {
      // Show confirmation dialog if required
      if (options.requireConfirmation) {
        const confirmed = window.confirm(
          options.description || `Do you want to ${options.action}?`
        );
        if (!confirmed) return null;
      }

      // Generate action message with timestamp
      const timestamp = Date.now();
      const nonce = Math.random().toString(36).substring(2);
      const message = `Action: ${options.action}\nTimestamp: ${timestamp}\nNonce: ${nonce}`;

      // Show signing toast
      const signingToast = toast.loading(`Please sign to ${options.action}...`);

      try {
        // Request signature
        await signMessage(message);
        toast.dismiss(signingToast);
        toast.success('Signature confirmed');

        // Execute the action
        const result = await actionFn();
        
        options.onSuccess?.();
        toast.success(`${options.action} completed successfully`);
        
        return result;
      } catch (signError: any) {
        toast.dismiss(signingToast);
        if (signError.message?.includes('User rejected')) {
          toast.error('Signature rejected');
        } else {
          toast.error('Failed to sign action');
        }
        return null;
      }
    } catch (error: any) {
      console.error('Signed action failed:', error);
      options.onError?.(error);
      toast.error(error.message || `Failed to ${options.action}`);
      return null;
    }
  };

  const signDocument = async (
    documentId: string,
    documentName: string,
    signFn: () => Promise<any>
  ) => {
    return executeSignedAction(signFn, {
      action: 'sign document',
      description: `Sign the document "${documentName}"?\n\nThis action is permanent and legally binding.`,
      requireConfirmation: true
    });
  };

  const uploadDocument = async (
    fileName: string,
    uploadFn: () => Promise<any>
  ) => {
    return executeSignedAction(uploadFn, {
      action: 'upload to Arweave',
      description: `Upload "${fileName}" to Arweave?\n\nThis will permanently store the document on the blockchain.`,
      requireConfirmation: false // Signing is confirmation enough
    });
  };

  const declineDocument = async (
    documentName: string,
    declineFn: () => Promise<any>
  ) => {
    return executeSignedAction(declineFn, {
      action: 'decline document',
      description: `Decline the document "${documentName}"?\n\nYou can provide feedback for revisions.`,
      requireConfirmation: true
    });
  };

  const createContract = async (
    contractName: string,
    createFn: () => Promise<any>
  ) => {
    return executeSignedAction(createFn, {
      action: 'create contract',
      description: `Create contract "${contractName}"?`,
      requireConfirmation: false
    });
  };

  return {
    executeSignedAction,
    signDocument,
    uploadDocument,
    declineDocument,
    createContract
  };
}