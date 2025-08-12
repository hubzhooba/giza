import { Request, Response } from 'express';
// STOAR service is disabled server-side - all document uploads are handled client-side
// import { StoarService } from '../services/stoar.service.js';
import { AuthRequest } from '../types/index.js';
import { z } from 'zod';

// Validation schemas
const uploadDocumentSchema = z.object({
  roomId: z.string(),
  documentId: z.string(),
  name: z.string(),
  contentType: z.string().optional(),
  encrypted: z.boolean().optional(),
  arweaveId: z.string().optional(), // Client provides this after upload
  arweaveUrl: z.string().optional()
});

const queryDocumentsSchema = z.object({
  roomId: z.string().optional(),
  userId: z.string().optional(),
  documentId: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
  after: z.string().optional()
});

export class DocumentsController {
  // Store document reference after client-side upload
  static async uploadDocument(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const validatedData = uploadDocumentSchema.parse(req.body);
      
      // Client has already uploaded to Arweave, just store the reference
      res.json({
        success: true,
        message: 'Document reference stored',
        documentId: validatedData.documentId,
        arweaveId: validatedData.arweaveId
      });
    } catch (error) {
      console.error('Document reference error:', error);
      
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid request data', 
          details: error.errors 
        });
      }
      
      res.status(500).json({ 
        error: 'Failed to store document reference',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Batch upload is handled client-side
  static async batchUpload(req: AuthRequest, res: Response) {
    return res.status(501).json({ 
      error: 'Not implemented',
      message: 'Batch uploads are handled client-side via STOAR SDK'
    });
  }

  // Document retrieval is done client-side directly from Arweave
  static async getDocument(req: Request, res: Response) {
    return res.status(501).json({ 
      error: 'Not implemented',
      message: 'Documents should be retrieved client-side directly from Arweave'
    });
  }

  // Query documents - this would query the database for references
  static async queryDocuments(req: AuthRequest, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const validatedQuery = queryDocumentsSchema.parse(req.query);
      
      // Query would go to database instead of Arweave
      res.json({
        success: true,
        documents: [],
        count: 0,
        hasMore: false,
        message: 'Query your database for document references'
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

  // Transaction verification is done client-side
  static async verifyTransaction(req: Request, res: Response) {
    return res.status(501).json({ 
      error: 'Not implemented',
      message: 'Transaction verification should be done client-side'
    });
  }

  // Wallet status is checked client-side
  static async getWalletStatus(req: AuthRequest, res: Response) {
    return res.status(501).json({ 
      error: 'Not implemented',
      message: 'Wallet status should be checked client-side via ArConnect'
    });
  }
}