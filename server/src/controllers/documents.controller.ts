import { Request, Response } from 'express';
import { StoarService } from '../services/stoar.service.js';
import { AuthRequest } from '../types/index.js';
import { z } from 'zod';

const stoarService = StoarService.getInstance();

// Track initialization state
let stoarInitialized = false;
let initializationError: Error | null = null;

// Initialize STOAR on server start with retry
const initializeStoar = async (retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      await stoarService.init();
      stoarInitialized = true;
      initializationError = null;
      console.log('STOAR service initialized successfully');
      return;
    } catch (error) {
      console.error(`STOAR initialization attempt ${i + 1} failed:`, error);
      initializationError = error as Error;
      if (i < retries - 1) {
        // Wait before retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }
  }
  console.error('Failed to initialize STOAR service after all retries');
};

// Start initialization
initializeStoar();

// Helper to ensure STOAR is initialized before use
const ensureStoarInitialized = async (res: Response): Promise<boolean> => {
  if (stoarInitialized) return true;
  
  // Try to initialize one more time
  if (!stoarInitialized && !initializationError) {
    await initializeStoar(1);
  }
  
  if (!stoarInitialized) {
    res.status(503).json({ 
      error: 'STOAR service unavailable',
      message: 'The document storage service is temporarily unavailable. Please try again later.',
      details: initializationError?.message
    });
    return false;
  }
  
  return true;
};

// Validation schemas
const uploadDocumentSchema = z.object({
  roomId: z.string(),
  documentId: z.string(),
  name: z.string(),
  contentType: z.string().optional(),
  encrypted: z.boolean().optional(),
  data: z.string() // Base64 encoded data
});

const batchUploadSchema = z.object({
  files: z.array(z.object({
    roomId: z.string(),
    documentId: z.string(),
    name: z.string(),
    contentType: z.string().optional(),
    encrypted: z.boolean().optional(),
    data: z.string() // Base64 encoded data
  }))
});

const queryDocumentsSchema = z.object({
  roomId: z.string().optional(),
  userId: z.string().optional(),
  documentId: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
  after: z.string().optional()
});

export class DocumentsController {
  // Upload a single document to Arweave
  static async uploadDocument(req: AuthRequest, res: Response) {
    try {
      // Ensure STOAR is initialized
      if (!await ensureStoarInitialized(res)) return;

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const validatedData = uploadDocumentSchema.parse(req.body);
      
      // Convert base64 to buffer
      const buffer = Buffer.from(validatedData.data, 'base64');
      
      const result = await stoarService.uploadDocument(buffer, {
        name: validatedData.name,
        contentType: validatedData.contentType,
        roomId: validatedData.roomId,
        documentId: validatedData.documentId,
        userId,
        encrypted: validatedData.encrypted
      });

      res.json({
        success: true,
        transactionId: result.id,
        url: result.url,
        timestamp: result.timestamp
      });
    } catch (error) {
      console.error('Document upload error:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid request data', 
          details: error.errors 
        });
      }
      
      if (error instanceof Error && error.message.includes('Insufficient balance')) {
        return res.status(402).json({ 
          error: 'Insufficient Arweave balance',
          message: error.message
        });
      }
      
      res.status(500).json({ 
        error: 'Failed to upload document',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Batch upload multiple documents
  static async batchUpload(req: AuthRequest, res: Response) {
    try {
      // Ensure STOAR is initialized
      if (!await ensureStoarInitialized(res)) return;

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const validatedData = batchUploadSchema.parse(req.body);
      
      // Convert files to proper format
      const files = validatedData.files.map(file => ({
        data: Buffer.from(file.data, 'base64'),
        metadata: {
          name: file.name,
          contentType: file.contentType,
          roomId: file.roomId,
          documentId: file.documentId,
          userId,
          encrypted: file.encrypted
        }
      }));

      const result = await stoarService.uploadBatch(files);

      res.json({
        success: true,
        bundleId: result.bundleId,
        bundleUrl: result.bundleUrl,
        files: result.files,
        savedTransactions: files.length - 1 // Cost savings
      });
    } catch (error) {
      console.error('Batch upload error:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid request data', 
          details: error.errors 
        });
      }
      
      res.status(500).json({ 
        error: 'Failed to batch upload documents',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get a document from Arweave
  static async getDocument(req: Request, res: Response) {
    try {
      // Ensure STOAR is initialized
      if (!await ensureStoarInitialized(res)) return;

      const { transactionId } = req.params;
      
      if (!transactionId) {
        return res.status(400).json({ error: 'Transaction ID required' });
      }

      const data = await stoarService.getDocument(transactionId);
      
      // Set appropriate headers
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('X-Arweave-Transaction-Id', transactionId);
      
      res.send(data);
    } catch (error) {
      console.error('Document retrieval error:', error);
      res.status(404).json({ 
        error: 'Document not found',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Query documents by tags
  static async queryDocuments(req: AuthRequest, res: Response) {
    try {
      // Ensure STOAR is initialized
      if (!await ensureStoarInitialized(res)) return;

      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const validatedQuery = queryDocumentsSchema.parse(req.query);
      
      const results = await stoarService.queryDocuments({
        ...validatedQuery,
        userId: validatedQuery.userId || userId // Default to current user
      });

      res.json({
        success: true,
        documents: results,
        count: results.length,
        hasMore: results.length === (validatedQuery.limit || 20)
      });
    } catch (error) {
      console.error('Document query error:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid query parameters', 
          details: error.errors 
        });
      }
      
      res.status(500).json({ 
        error: 'Failed to query documents',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Verify a transaction exists on Arweave
  static async verifyTransaction(req: Request, res: Response) {
    try {
      // Ensure STOAR is initialized
      if (!await ensureStoarInitialized(res)) return;

      const { transactionId } = req.params;
      
      if (!transactionId) {
        return res.status(400).json({ error: 'Transaction ID required' });
      }

      const exists = await stoarService.verifyTransaction(transactionId);
      
      res.json({
        success: true,
        transactionId,
        exists,
        verified: exists
      });
    } catch (error) {
      console.error('Transaction verification error:', error);
      res.status(500).json({ 
        error: 'Failed to verify transaction',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get wallet balance and status
  static async getWalletStatus(req: AuthRequest, res: Response) {
    try {
      // Ensure STOAR is initialized
      if (!await ensureStoarInitialized(res)) return;

      // Admin only endpoint
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { balance, sufficient } = await stoarService.getBalance();
      const address = stoarService.getAddress();

      res.json({
        success: true,
        wallet: {
          address,
          balance,
          sufficient,
          currency: 'AR'
        }
      });
    } catch (error) {
      console.error('Wallet status error:', error);
      res.status(500).json({ 
        error: 'Failed to get wallet status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}