import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';

export const JWT_SECRET = process.env.JWT_SECRET || 'redactx_jwt_secret_key_2026_production';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name: string;
        email: string;
      };
    }
  }
}

export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  try {
    let token: string | undefined;

    // Check Authorization header: Bearer <token>
    const authHeader = req.headers.authorization || (req.headers.Authorization as string | undefined);
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (req.query && typeof req.query.token === 'string') {
      // Allow token in query parameter for direct browser GET file downloads/previews
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No token provided.',
      });
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string };
    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or malformed authentication token.',
      });
    }

    // Fetch user from DB to verify user exists
    let user = await UserModel.findById(decoded.id);
    if (!user && decoded.email) {
      user = await UserModel.findByEmail(decoded.email);
    }

    const userName = user?.name || (decoded.email ? decoded.email.split('@')[0] : 'User');
    const userEmail = user?.email || decoded.email || 'user@redactx.io';
    const userId = user?._id || decoded.id;

    // Attach user information to req.user
    req.user = {
      id: userId,
      name: userName,
      email: userEmail,
    };

    next();
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Authentication token has expired. Please log in again.',
      });
    }
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token.',
    });
  }
}
