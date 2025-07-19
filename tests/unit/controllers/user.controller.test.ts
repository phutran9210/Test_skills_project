import { Request, Response } from 'express';
import { AppDataSource } from '../../../src/config';
import { User } from '../../../src/models/user.entity';
import jwt from 'jsonwebtoken';
import { UserController } from '../../../src/controllers/user.controller';

// Mock external modules
jest.mock('../../../src/config', () => ({
  AppDataSource: {
    getRepository: jest.fn().mockReturnValue({
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    }),
  },
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
}));

jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

describe('UserController', () => {
  let userController: UserController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockUserRepository: any;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    password: 'hashedpassword',
    firstName: 'John',
    lastName: 'Doe',
    fullName: 'John Doe',
    role: 'user',
    isActive: true,
    createdAt: new Date(),
    comparePassword: jest.fn(),
  };

  beforeEach(() => {
    userController = new UserController();
    mockUserRepository = AppDataSource.getRepository(User);

    // Reset mocks for each test
    jest.clearAllMocks();

    // Mock console.error to prevent actual logging during tests
    jest.spyOn(console, 'error').mockImplementation(() => {});

    mockRequest = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    // Default mock implementations
    mockUserRepository.findOne.mockResolvedValue(null);
    mockUserRepository.create.mockImplementation((data: any) => ({
      ...data,
      id: 1,
      fullName: `${data.firstName} ${data.lastName}`,
      isActive: true,
      createdAt: new Date(),
      comparePassword: jest.fn(),
    }));
    mockUserRepository.save.mockResolvedValue(mockUser);
    (jwt.sign as jest.Mock).mockReturnValue('mocked_jwt_token');
    mockUser.comparePassword.mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('register', () => {
    it('should register a new user and return 201 with token', async () => {
      mockRequest.body = {
        email: 'newuser@example.com',
        password: 'password123',
        firstName: 'New',
        lastName: 'User',
      };

      await userController.register(mockRequest as Request, mockResponse as Response);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { email: 'newuser@example.com' } });
      expect(mockUserRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        email: 'newuser@example.com',
        password: 'password123',
      }));
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'test@example.com' }),
        process.env.JWT_SECRET!,
        { expiresIn: '24h' }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Registration successful',
        data: expect.objectContaining({
          user: expect.objectContaining({ email: 'test@example.com' }),
          token: 'mocked_jwt_token',
        }),
      }));
    });

    it('should return 409 if email already in use', async () => {
      mockRequest.body = {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'Existing',
        lastName: 'User',
      };
      mockUserRepository.findOne.mockResolvedValueOnce(mockUser);

      await userController.register(mockRequest as Request, mockResponse as Response);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { email: 'existing@example.com' } });
      expect(mockUserRepository.create).not.toHaveBeenCalled();
      expect(mockUserRepository.save).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Email is already in use',
      });
    });

    it('should handle generic errors during registration', async () => {
      mockRequest.body = {
        email: 'error@example.com',
        password: 'password123',
        firstName: 'Error',
        lastName: 'User',
      };
      const error = new Error('DB error during save');
      mockUserRepository.save.mockRejectedValueOnce(error);

      await userController.register(mockRequest as Request, mockResponse as Response);

      expect(console.error).toHaveBeenCalledWith('Register error:', error);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Server error during registration',
      });
    });

    });

  describe('login', () => {
    it('should log in a user and return 200 with token', async () => {
      mockRequest.body = { email: 'test@example.com', password: 'password123' };
      mockUserRepository.findOne.mockResolvedValueOnce(mockUser);

      await userController.login(mockRequest as Request, mockResponse as Response);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { email: 'test@example.com' } });
      expect(mockUser.comparePassword).toHaveBeenCalledWith('password123');
      expect(jwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ email: 'test@example.com' }),
        process.env.JWT_SECRET!,
        { expiresIn: '24h' }
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: 'Login successful',
        data: expect.objectContaining({
          user: expect.objectContaining({ email: 'test@example.com' }),
          token: 'mocked_jwt_token',
        }),
      }));
    });

    it('should return 401 if user not found', async () => {
      mockRequest.body = { email: 'nonexistent@example.com', password: 'password123' };
      mockUserRepository.findOne.mockResolvedValueOnce(null);

      await userController.login(mockRequest as Request, mockResponse as Response);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({ where: { email: 'nonexistent@example.com' } });
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid email or password',
      });
    });

    it('should return 401 if user account is disabled', async () => {
      mockRequest.body = { email: 'inactive@example.com', password: 'password123' };
      mockUserRepository.findOne.mockResolvedValueOnce({ ...mockUser, isActive: false });

      await userController.login(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Account has been disabled',
      });
    });

    it('should return 401 if password is invalid', async () => {
      mockRequest.body = { email: 'test@example.com', password: 'wrongpassword' };
      mockUserRepository.findOne.mockResolvedValueOnce(mockUser);
      mockUser.comparePassword.mockResolvedValueOnce(false);

      await userController.login(mockRequest as Request, mockResponse as Response);

      expect(mockUser.comparePassword).toHaveBeenCalledWith('wrongpassword');
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid email or password',
      });
    });

    it('should handle generic errors during login', async () => {
      mockRequest.body = { email: 'test@example.com', password: 'password123' };
      const error = new Error('DB error during find');
      mockUserRepository.findOne.mockRejectedValueOnce(error);

      await userController.login(mockRequest as Request, mockResponse as Response);

      expect(console.error).toHaveBeenCalledWith('Login error:', error);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Server error during login',
      });
    });

    });
});
