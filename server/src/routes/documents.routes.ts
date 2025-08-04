import { Router } from 'express';
import { DocumentsController } from '../controllers/documents.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Upload a single document
router.post('/upload', DocumentsController.uploadDocument);

// Batch upload multiple documents
router.post('/batch-upload', DocumentsController.batchUpload);

// Query documents by various filters
router.get('/query', DocumentsController.queryDocuments);

// Get wallet status (admin endpoint)
router.get('/wallet-status', DocumentsController.getWalletStatus);

// Get a specific document
router.get('/:transactionId', DocumentsController.getDocument);

// Verify a transaction exists
router.get('/:transactionId/verify', DocumentsController.verifyTransaction);

export default router;