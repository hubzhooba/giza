import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { supabase } from '../services/supabase.service.js';
import jwt from 'jsonwebtoken';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = Router();

// Validation schemas
const walletLoginSchema = z.object({
  walletAddress: z.string().min(43).max(43),
  permissions: z.array(z.string()).optional()
});

const setUsernameSchema = z.object({
  username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_-]+$/)
});

// Wallet login/register
router.post('/wallet-login', async (req: Request, res: Response) => {
  try {
    const { walletAddress, permissions } = walletLoginSchema.parse(req.body);
    
    // Call the database function to handle login/register
    const { data, error } = await supabase.rpc('handle_wallet_auth', {
      p_wallet_address: walletAddress,
      p_permissions: permissions || []
    });
    
    if (error) {
      console.error('Wallet auth error:', error);
      return res.status(500).json({ error: 'Authentication failed' });
    }
    
    const result = data[0];
    
    // Generate JWT token with wallet info
    const token = jwt.sign(
      { 
        walletAddress,
        userId: result.user_id,
        username: result.username
      },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );
    
    res.json({
      sessionToken: result.session_token,
      token, // JWT for API calls
      userId: result.user_id,
      username: result.username,
      displayName: result.username,
      isUsernameSet: result.is_username_set,
      isNewUser: result.is_new_user
    });
  } catch (error) {
    console.error('Wallet login error:', error);
    res.status(400).json({ error: 'Invalid request' });
  }
});

// Validate session
router.get('/validate-session', authenticateToken, async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ isValid: false });
    }
    
    // Get session from database
    const { data, error } = await supabase.rpc('validate_wallet_session', {
      p_session_token: token
    });
    
    if (error || !data || data.length === 0) {
      return res.status(401).json({ isValid: false });
    }
    
    const session = data[0];
    
    res.json({
      isValid: session.is_valid,
      walletAddress: session.wallet_address,
      userId: session.user_id,
      username: session.username,
      displayName: session.display_name,
      isUsernameSet: !!session.username
    });
  } catch (error) {
    console.error('Session validation error:', error);
    res.status(500).json({ isValid: false });
  }
});

// Check username availability
router.get('/check-username', async (req: Request, res: Response) => {
  try {
    const username = req.query.username as string;
    
    if (!username || username.length < 3) {
      return res.json({ available: false });
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', username.toLowerCase())
      .single();
    
    res.json({ available: !data && !error });
  } catch (error) {
    console.error('Username check error:', error);
    res.status(500).json({ available: false });
  }
});

// Set username
router.post('/set-username', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { username } = setUsernameSchema.parse(req.body);
    const walletAddress = (req as any).user.walletAddress;
    
    const { data, error } = await supabase.rpc('set_username', {
      p_wallet_address: walletAddress,
      p_username: username
    });
    
    if (error) {
      console.error('Set username error:', error);
      return res.status(400).json({ 
        success: false, 
        message: 'Username already taken' 
      });
    }
    
    res.json({ 
      success: data,
      message: data ? 'Username set successfully' : 'Username already taken'
    });
  } catch (error) {
    console.error('Set username error:', error);
    res.status(400).json({ 
      success: false, 
      message: 'Invalid username format' 
    });
  }
});

// Update wallet balance
router.post('/update-balance', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { balance } = req.body;
    const walletAddress = (req as any).user.walletAddress;
    
    const { error } = await supabase.rpc('update_wallet_balance', {
      p_wallet_address: walletAddress,
      p_balance: balance
    });
    
    if (error) {
      console.error('Update balance error:', error);
      return res.status(500).json({ error: 'Failed to update balance' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Update balance error:', error);
    res.status(500).json({ error: 'Failed to update balance' });
  }
});

// Get user profile
router.get('/profile', authenticateToken, async (req: Request, res: Response) => {
  try {
    const walletAddress = (req as any).user.walletAddress;
    
    const { data, error } = await supabase
      .from('user_dashboard')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();
    
    if (error) {
      console.error('Get profile error:', error);
      return res.status(404).json({ error: 'Profile not found' });
    }
    
    res.json(data);
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
});

export default router;