import { AppDataSource, pgPool, default as DatabaseConnection } from '../../../src/config/database.config';

// Mock external modules
jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

jest.mock('typeorm', () => ({
  DataSource: jest.fn().mockImplementation(() => ({
    initialize: jest.fn(),
    destroy: jest.fn(),
    options: {
      database: 'test_db',
    },
  })),
}));

jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue({
      query: jest.fn().mockResolvedValue({ rows: [{ now: '2025-07-19T12:00:00.000Z' }] }),
      release: jest.fn(),
    }),
    end: jest.fn(),
    on: jest.fn(),
  })),
}));

describe('DatabaseConnection', () => {
  let dbConnection: DatabaseConnection;
  let mockAppDataSource: any;
  let mockPgPool: any;

  beforeEach(() => {
    // Reset the singleton instance before each test
    (DatabaseConnection as any).instance = undefined;
    dbConnection = DatabaseConnection.getInstance();

    // Get the mocked instances
    mockAppDataSource = (AppDataSource as any);
    mockPgPool = (pgPool as any);

    // Clear all mocks
    jest.clearAllMocks();

    // Mock console.log and console.error to prevent actual logging during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be a singleton instance', () => {
    const instance1 = DatabaseConnection.getInstance();
    const instance2 = DatabaseConnection.getInstance();
    expect(instance1).toBe(instance2);
  });

  describe('initializeTypeORM', () => {
    it('should initialize TypeORM connection successfully', async () => {
      await dbConnection.initializeTypeORM();
      expect(mockAppDataSource.initialize).toHaveBeenCalledTimes(1);
      expect((dbConnection as any).isTypeOrmConnected).toBe(true);
      expect(console.log).toHaveBeenCalledWith('TypeORM has connected successfully!');
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Database: test_db'));
    });

    it('should not re-initialize TypeORM if already connected', async () => {
      await dbConnection.initializeTypeORM();
      await dbConnection.initializeTypeORM();
      expect(mockAppDataSource.initialize).toHaveBeenCalledTimes(1);
    });

    it('should log error if TypeORM initialization fails', async () => {
      const error = new Error('TypeORM connection failed');
      mockAppDataSource.initialize.mockRejectedValueOnce(error);

      await expect(dbConnection.initializeTypeORM()).rejects.toThrow(error);
      expect(console.error).toHaveBeenCalledWith('Error connecting TypeORM:', error);
      expect((dbConnection as any).isTypeOrmConnected).toBe(false);
    });
  });

  describe('initializePgPool', () => {
    it('should initialize PostgreSQL Pool connection successfully', async () => {
      await dbConnection.initializePgPool();
      expect(mockPgPool.connect).toHaveBeenCalledTimes(1);
      expect(mockPgPool.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockPgPool.on).toHaveBeenCalledWith('acquire', expect.any(Function));
      expect(mockPgPool.on).toHaveBeenCalledWith('remove', expect.any(Function));
      expect(mockPgPool.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect((dbConnection as any).isPgPoolConnected).toBe(true);
      expect(console.log).toHaveBeenCalledWith('PostgreSQL Pool has connected successfully!');
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Server time:'));
    });

    it('should not re-initialize PgPool if already connected', async () => {
      await dbConnection.initializePgPool();
      await dbConnection.initializePgPool();
      expect(mockPgPool.connect).toHaveBeenCalledTimes(1);
    });

    it('should log error if PgPool initialization fails', async () => {
      const error = new Error('PgPool connection failed');
      mockPgPool.connect.mockRejectedValueOnce(error);

      await expect(dbConnection.initializePgPool()).rejects.toThrow(error);
      expect(console.error).toHaveBeenCalledWith('Error connecting PostgreSQL Pool:', error);
      expect((dbConnection as any).isPgPoolConnected).toBe(false);
    });
  });

  describe('closeConnections', () => {
    it('should close TypeORM connection if connected', async () => {
      await dbConnection.initializeTypeORM(); // Ensure connected
      await dbConnection.closeConnections();
      expect(mockAppDataSource.destroy).toHaveBeenCalledTimes(1);
      expect((dbConnection as any).isTypeOrmConnected).toBe(false);
      expect(console.log).toHaveBeenCalledWith('TypeORM connection closed');
    });

    it('should close PostgreSQL Pool connection if connected', async () => {
      await dbConnection.initializePgPool(); // Ensure connected
      await dbConnection.closeConnections();
      expect(mockPgPool.end).toHaveBeenCalledTimes(1);
      expect((dbConnection as any).isPgPoolConnected).toBe(false);
      expect(console.log).toHaveBeenCalledWith('PostgreSQL Pool connection closed');
    });

    it('should log error if closing TypeORM connection fails', async () => {
      await dbConnection.initializeTypeORM();
      const error = new Error('TypeORM disconnect failed');
      mockAppDataSource.destroy.mockRejectedValueOnce(error);

      await dbConnection.closeConnections();
      expect(console.error).toHaveBeenCalledWith('Error closing database connections:', error);
    });

    it('should log error if closing PgPool connection fails', async () => {
      await dbConnection.initializePgPool();
      const error = new Error('PgPool disconnect failed');
      mockPgPool.end.mockRejectedValueOnce(error);

      await dbConnection.closeConnections();
      expect(console.error).toHaveBeenCalledWith('Error closing database connections:', error);
    });
  });
});
