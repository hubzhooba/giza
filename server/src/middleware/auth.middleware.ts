import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest } from '../types/index.js';
import { supabase } from '../services/supabase.service.js';

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Try to decode as JWT first
    try {
      const decoded = jwt.verify(token, jwtSecret) as any;
      
      // Handle wallet-based auth
      if (decoded.walletAddress) {
        (req as any).user = {
          id: decoded.userId,
          walletAddress: decoded.walletAddress,
          username: decoded.username
        };
      } else {
        // Legacy email-based auth
        (req as any).user = {
          id: decoded.id,
          email: decoded.email
        };
      }
      
      next();
    } catch (jwtError) {
      // If JWT fails, try session token validation
      const { data, error } = await supabase.rpc('validate_wallet_session', {
        p_session_token: token
      });
      
      if (error || !data || data.length === 0 || !data[0].is_valid) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      
      const session = data[0];
      (req as any).user = {
        id: session.user_id,
        walletAddress: session.wallet_address,
        username: session.username
      };
      
      next();
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Alias for compatibility
export const authenticateToken = authMiddleware;

// Middleware to require wallet authentication
export const requireWallet = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!(req as any).user?.walletAddress) {
    return res.status(403).json({ error: 'Wallet authentication required' });
  }
  next();
};

// Middleware to require username to be set
export const requireUsername = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!(req as any).user?.username) {
    return res.status(403).json({ error: 'Username must be set first' });
  }
  next();
};