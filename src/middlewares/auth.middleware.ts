import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserService } from '../services/user.service';
import dotenv from 'dotenv';
dotenv.config();

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

const userService = new UserService();

export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    res.status(401).json({
      success: false,
      message: 'No token provided',
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as jwt.JwtPayload;

    if (!decoded || !decoded.id) {
      res.status(401).json({
        success: false,
        message: 'Invalid token payload',
      });
      return;
    }

    // Check if user exists in database and is active
    const user = await userService.findById(decoded.id);

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User not found',
      });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({
        success: false,
        message: 'User account is deactivated',
      });
      return;
    }

    // Add user info to request object for use in routes
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token',
    });
  }
};
