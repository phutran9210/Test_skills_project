import { Repository } from 'typeorm';
import { UserService } from '../../../src/services/user.service';
import { User } from '../../../src/models/user.entity';
import { AppDataSource } from '../../../src/config';

// Mock dependencies
jest.mock('../../../src/config', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

describe('UserService', () => {
  let userService: UserService;
  let mockUserRepository: jest.Mocked<Repository<User>>;

  const mockUser = {
    id: 1,
    email: 'test@example.com',
    password: 'hashedPassword123',
    firstName: 'John',
    lastName: 'Doe',
    role: 'user',
    isActive: true,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
    hashPassword: jest.fn(),
    comparePassword: jest.fn(),
    get fullName() { return `${this.firstName} ${this.lastName}`; }
  } as User;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock repository
    mockUserRepository = {
      findOne: jest.fn(),
    } as any;

    // Setup mocks
    (AppDataSource.getRepository as jest.Mock).mockReturnValue(mockUserRepository);

    // Create service instance
    userService = new UserService();

    // Mock console methods to avoid noise in tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('findById', () => {
    const userId = 1;

    it('should find and return user by ID', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await userService.findById(userId);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
        select: [
          'id',
          'email',
          'firstName',
          'lastName',
          'role',
          'isActive',
          'createdAt',
          'updatedAt',
        ],
      });
      expect(result).toBe(mockUser);
    });

    it('should return null if user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await userService.findById(userId);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: userId },
        select: [
          'id',
          'email',
          'firstName',
          'lastName',
          'role',
          'isActive',
          'createdAt',
          'updatedAt',
        ],
      });
      expect(result).toBeNull();
    });

    it('should return null and log error when database error occurs', async () => {
      const dbError = new Error('Database connection failed');
      mockUserRepository.findOne.mockRejectedValue(dbError);

      const result = await userService.findById(userId);

      expect(console.error).toHaveBeenCalledWith('Error finding user by ID:', dbError);
      expect(result).toBeNull();
    });

    it('should use correct select fields excluding password', async () => {
      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await userService.findById(userId);

      const selectFields = mockUserRepository.findOne.mock.calls[0][0].select;
      expect(selectFields).toContain('id');
      expect(selectFields).toContain('email');
      expect(selectFields).toContain('firstName');
      expect(selectFields).toContain('lastName');
      expect(selectFields).toContain('role');
      expect(selectFields).toContain('isActive');
      expect(selectFields).toContain('createdAt');
      expect(selectFields).toContain('updatedAt');
      expect(selectFields).not.toContain('password');
    });

    it('should handle different user IDs', async () => {
      const differentUserId = 999;
      mockUserRepository.findOne.mockResolvedValue(null);

      await userService.findById(differentUserId);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: differentUserId },
        select: expect.any(Array),
      });
    });

    it('should handle edge case with zero ID', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await userService.findById(0);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: 0 },
        select: expect.any(Array),
      });
      expect(result).toBeNull();
    });

    it('should handle negative ID', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await userService.findById(-1);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: -1 },
        select: expect.any(Array),
      });
      expect(result).toBeNull();
    });

    it('should return proper user data structure', async () => {
      const expectedUser = {
        id: 42,
        email: 'jane@example.com',
        password: 'hashedPassword456',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'admin',
        isActive: false,
        createdAt: new Date('2023-06-15'),
        updatedAt: new Date('2023-06-16'),
        hashPassword: jest.fn(),
        comparePassword: jest.fn(),
        get fullName() { return `${this.firstName} ${this.lastName}`; }
      } as User;
      mockUserRepository.findOne.mockResolvedValue(expectedUser);

      const result = await userService.findById(42);

      expect(result).toEqual(expectedUser);
      expect(result?.id).toBe(42);
      expect(result?.email).toBe('jane@example.com');
      expect(result?.firstName).toBe('Jane');
      expect(result?.lastName).toBe('Smith');
      expect(result?.role).toBe('admin');
      expect(result?.isActive).toBe(false);
      expect(result?.createdAt).toBeInstanceOf(Date);
      expect(result?.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('service initialization', () => {
    it('should initialize with correct repository', () => {
      expect(AppDataSource.getRepository).toHaveBeenCalledWith(User);
    });

    it('should create repository instance only once per service instance', () => {
      // Create additional service instances to test repository creation
      const service2 = new UserService();
      const service3 = new UserService();
      
      // Each service should get its own repository instance
      expect(AppDataSource.getRepository).toHaveBeenCalledTimes(3); // 1 from beforeEach + 2 from new instances
    });
  });

  describe('error handling', () => {
    it('should handle timeout errors gracefully', async () => {
      const timeoutError = new Error('Query timeout');
      timeoutError.name = 'QueryTimeoutError';
      mockUserRepository.findOne.mockRejectedValue(timeoutError);

      const result = await userService.findById(1);

      expect(console.error).toHaveBeenCalledWith('Error finding user by ID:', timeoutError);
      expect(result).toBeNull();
    });

    it('should handle connection errors gracefully', async () => {
      const connectionError = new Error('Connection lost');
      connectionError.name = 'ConnectionError';
      mockUserRepository.findOne.mockRejectedValue(connectionError);

      const result = await userService.findById(1);

      expect(console.error).toHaveBeenCalledWith('Error finding user by ID:', connectionError);
      expect(result).toBeNull();
    });

    it('should handle unknown errors gracefully', async () => {
      const unknownError = 'Some unknown error';
      mockUserRepository.findOne.mockRejectedValue(unknownError);

      const result = await userService.findById(1);

      expect(console.error).toHaveBeenCalledWith('Error finding user by ID:', unknownError);
      expect(result).toBeNull();
    });
  });
});