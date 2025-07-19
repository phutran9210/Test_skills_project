import { Request, Response } from 'express';
import { AppDataSource } from '../config';
import { User } from '../models/user.entity';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

export class UserController {
  private userRepository = AppDataSource.getRepository(User);

  /**
   * Generates a JWT token for a user
   */
  private generateToken(user: User): string {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    return jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: '24h',
    });
  }

  /**
   * Registers a new user
   */
  public register = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, firstName, lastName, role = 'user' } = req.body;

      // Check if user already exists
      const existingUser = await this.userRepository.findOne({
        where: { email },
      });

      if (existingUser) {
        res.status(409).json({
          success: false,
          message: 'Email is already in use',
        });
        return;
      }

      // Create new user
      const newUser = this.userRepository.create({
        email,
        password,
        firstName,
        lastName,
        role,
      });

      const savedUser = await this.userRepository.save(newUser);

      // Generate token
      const token = this.generateToken(savedUser);

      // Return success response with token
      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: {
          user: {
            id: savedUser.id,
            email: savedUser.email,
            firstName: savedUser.firstName,
            lastName: savedUser.lastName,
            fullName: savedUser.fullName,
            role: savedUser.role,
            isActive: savedUser.isActive,
            createdAt: savedUser.createdAt,
          },
          token,
        },
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during registration',
      });
    }
  };

  /**
   * Logs in a user
   */
  public login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      // Find user by email
      const user = await this.userRepository.findOne({
        where: { email },
      });

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
        return;
      }

      // Check if user is active
      if (!user.isActive) {
        res.status(401).json({
          success: false,
          message: 'Account has been disabled',
        });
        return;
      }

      // Compare password
      const isPasswordValid = await user.comparePassword(password);

      if (!isPasswordValid) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
        return;
      }

      // Generate token
      const token = this.generateToken(user);

      // Return success response with token
      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: user.fullName,
            role: user.role,
            isActive: user.isActive,
            createdAt: user.createdAt,
          },
          token,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during login',
      });
    }
  };
}
