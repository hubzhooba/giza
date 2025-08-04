import { 
  StoarError, 
  UploadError, 
  WalletError, 
  InsufficientBalanceError
} from '@stoar/sdk';
import toast from 'react-hot-toast';

interface ErrorContext {
  operation: 'upload' | 'download' | 'query' | 'batch' | 'init';
  fileName?: string;
  fileCount?: number;
}

export class StoarErrorHandler {
  static handle(error: unknown, context: ErrorContext): void {
    console.error(`STOAR Error during ${context.operation}:`, error);

    if (error instanceof InsufficientBalanceError) {
      this.handleInsufficientBalance(error);
    } else if (error instanceof WalletError) {
      this.handleWalletError(error, context);
    } else if (error instanceof UploadError) {
      this.handleUploadError(error, context);
    } else if (error instanceof Error && error.message.includes('bundle')) {
      this.handleBundleError(error, context);
    } else if (error instanceof StoarError) {
      this.handleGenericStoarError(error, context);
    } else {
      this.handleUnknownError(error, context);
    }
  }

  private static handleInsufficientBalance(error: InsufficientBalanceError): void {
    const message = `Insufficient Arweave balance. Required: ${error.required} AR, Available: ${error.available} AR`;
    
    toast.error(message, {
      duration: 6000,
      icon: '💰',
    });

    // Show additional help
    toast(
      'Please top up your Arweave wallet to continue uploading documents.',
      {
        duration: 8000,
        icon: 'ℹ️',
      }
    );
  }

  private static handleWalletError(error: WalletError, context: ErrorContext): void {
    let message = 'Wallet connection error';
    let helpText = '';

    if (context.operation === 'init') {
      message = 'Failed to connect to Arweave wallet';
      helpText = 'Please ensure ArConnect is installed or check your wallet configuration.';
    } else {
      message = `Wallet error during ${context.operation}`;
      helpText = 'Please check your wallet connection and try again.';
    }

    toast.error(message, {
      duration: 5000,
      icon: '🔐',
    });

    if (helpText) {
      toast(helpText, {
        duration: 6000,
        icon: 'ℹ️',
      });
    }
  }

  private static handleUploadError(error: UploadError, context: ErrorContext): void {
    let message = 'Upload failed';

    if (context.fileName) {
      message = `Failed to upload ${context.fileName}`;
    } else if (context.fileCount && context.fileCount > 1) {
      message = `Failed to upload ${context.fileCount} files`;
    }

    toast.error(message, {
      duration: 5000,
      icon: '❌',
    });

    // Check for specific upload issues
    if (error.message.includes('size')) {
      toast('File size may exceed limits. Try smaller files or use batch upload.', {
        duration: 6000,
        icon: 'ℹ️',
      });
    } else if (error.message.includes('network')) {
      toast('Network error. Please check your connection and try again.', {
        duration: 6000,
        icon: '🌐',
      });
    }
  }

  private static handleBundleError(error: Error, context: ErrorContext): void {
    const fileCount = context.fileCount || 'multiple';
    const message = `Failed to bundle ${fileCount} files`;

    toast.error(message, {
      duration: 5000,
      icon: '📦',
    });

    toast('Try uploading files individually or in smaller batches.', {
      duration: 6000,
      icon: 'ℹ️',
    });
  }

  private static handleGenericStoarError(error: StoarError, context: ErrorContext): void {
    const message = `STOAR error during ${context.operation}: ${error.message}`;
    
    toast.error(message, {
      duration: 5000,
      icon: '⚠️',
    });
  }

  private static handleUnknownError(error: unknown, context: ErrorContext): void {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const message = `Error during ${context.operation}: ${errorMessage}`;

    toast.error(message, {
      duration: 5000,
      icon: '❗',
    });

    // Log for debugging
    console.error('Unknown error details:', error);
  }

  // Helper method to retry operations with exponential backoff
  static async retryOperation<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // Don't retry on certain errors
        if (
          error instanceof InsufficientBalanceError ||
          error instanceof WalletError
        ) {
          throw error;
        }

        // Calculate delay with exponential backoff
        const delay = baseDelay * Math.pow(2, attempt);
        
        if (attempt < maxRetries - 1) {
          toast(`Retrying... (${attempt + 1}/${maxRetries})`, {
            duration: delay,
            icon: '🔄',
          });
          
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries failed
    this.handle(lastError, context);
    throw lastError;
  }

  // Helper to check if an error is recoverable
  static isRecoverable(error: unknown): boolean {
    if (error instanceof InsufficientBalanceError) return false;
    if (error instanceof WalletError) return false;
    if (error instanceof UploadError) {
      return !error.message.includes('size') && !error.message.includes('invalid');
    }
    return true;
  }

  // Helper to format error for display
  static formatError(error: unknown): string {
    if (error instanceof InsufficientBalanceError) {
      return `Insufficient balance: ${error.available} AR available, ${error.required} AR required`;
    }
    if (error instanceof StoarError) {
      return error.message;
    }
    if (error instanceof Error) {
      return error.message;
    }
    return 'An unknown error occurred';
  }
}

// Export a convenience function for components
export const handleStoarError = (error: unknown, context: ErrorContext): void => {
  StoarErrorHandler.handle(error, context);
};