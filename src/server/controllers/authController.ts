import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/User';
import { JWT_SECRET } from '../middleware/authMiddleware';

export class AuthController {
  public static async register(req: Request, res: Response) {
    try {
      const { name, email, password, confirmPassword } = req.body;

      // 1. Validation: Required fields
      if (!name || !email || !password || !confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'All fields are required (name, email, password, confirmPassword).',
        });
      }

      // 2. Validation: Email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return res.status(400).json({
          success: false,
          message: 'Please enter a valid email address.',
        });
      }

      // 3. Validation: Minimum password length
      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message: 'Password must be at least 6 characters long.',
        });
      }

      // 4. Validation: Password match
      if (password !== confirmPassword) {
        return res.status(400).json({
          success: false,
          message: 'Password and confirm password do not match.',
        });
      }

      // 5. Check duplicate email
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists.',
        });
      }

      // 6. Create user in database with hashed password
      const user = await UserModel.create({
        name,
        email,
        password,
      });

      // 7. Generate JWT
      const token = jwt.sign(
        { id: user._id, email: user.email },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      const publicUser = UserModel.toPublicJSON(user);

      return res.status(201).json({
        success: true,
        message: 'Registration successful.',
        token,
        user: publicUser,
      });
    } catch (err: any) {
      console.error('Registration error:', err);
      return res.status(500).json({
        success: false,
        message: err.message || 'An error occurred during registration.',
      });
    }
  }

  public static async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required.',
        });
      }

      const user = await UserModel.findByEmail(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }

      const isMatch = await UserModel.comparePassword(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
      }

      const token = jwt.sign(
        { id: user._id, email: user.email },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      const publicUser = UserModel.toPublicJSON(user);

      return res.json({
        success: true,
        message: 'Login successful.',
        token,
        user: publicUser,
      });
    } catch (err: any) {
      console.error('Login error:', err);
      return res.status(500).json({
        success: false,
        message: 'An error occurred during login.',
      });
    }
  }

  public static async getCurrentUser(req: Request, res: Response) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Not authenticated.',
        });
      }

      return res.json({
        success: true,
        user: {
          id: req.user.id,
          name: req.user.name,
          email: req.user.email,
        },
      });
    } catch (err: any) {
      console.error('Get current user error:', err);
      return res.status(500).json({
        success: false,
        message: 'An error occurred fetching user details.',
      });
    }
  }

  public static async logout(_req: Request, res: Response) {
    return res.json({
      success: true,
      message: 'Logged out successfully.',
    });
  }
}
