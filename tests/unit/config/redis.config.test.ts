import RedisConnection from '../../../src/config/redis.config';

// Mock the entire 'redis' module
jest.mock('redis', () => ({
  createClient: jest.fn().mockImplementation(() => {
    const mockClient = {
      on: jest.fn(),
      connect: jest.fn(),
      disconnect: jest.fn(),
    };
    // Simulate event emission for testing event handlers
    (mockClient.on as jest.Mock).mockImplementation((event, handler) => {
      if (event === 'connect') mockClient.connect.mockImplementation(async () => { handler(); });
      if (event === 'ready') mockClient.connect.mockImplementation(async () => { handler(); });
      if (event === 'error') mockClient.connect.mockImplementation(async () => { handler(new Error('Test error')); });
      if (event === 'end') mockClient.disconnect.mockImplementation(async () => { handler(); });
    });
    return mockClient;
  }),
}));

describe('RedisConnection', () => {
  let redisConnection: RedisConnection;
  let mockCreateClient: jest.Mock;
  let mockRedisClient: any;

  beforeEach(() => {
    // Reset the singleton instance before each test
    (RedisConnection as any).instance = undefined;

    // Clear all mocks before creating a new instance
    jest.clearAllMocks();

    // Mock console.log and console.error to prevent actual logging during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});

    redisConnection = RedisConnection.getInstance();
    mockCreateClient = require('redis').createClient;
    mockRedisClient = mockCreateClient.mock.results[0].value;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be a singleton instance', () => {
    const instance1 = RedisConnection.getInstance();
    const instance2 = RedisConnection.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should create a Redis client with correct configuration', () => {
    expect(mockCreateClient).toHaveBeenCalledTimes(1);
    expect(mockCreateClient).toHaveBeenCalledWith({
      socket: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
      password: process.env.REDIS_PASSWORD || undefined,
      database: parseInt(process.env.REDIS_DB || '0'),
    });
  });

  it('should set up event handlers', () => {
    expect(mockRedisClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
    expect(mockRedisClient.on).toHaveBeenCalledWith('ready', expect.any(Function));
    expect(mockRedisClient.on).toHaveBeenCalledWith('error', expect.any(Function));
    expect(mockRedisClient.on).toHaveBeenCalledWith('end', expect.any(Function));
  });

  describe('connect', () => {
    it('should connect the Redis client if not already connected', async () => {
      (redisConnection as any).isConnected = false;
      await redisConnection.connect();
      expect(mockRedisClient.connect).toHaveBeenCalledTimes(1);
      // Simulate ready event to update isConnected status
      mockRedisClient.on.mock.calls.find((call: unknown[]) => call[0] === 'ready')![1]();
      expect(redisConnection.isClientConnected()).toBe(true);
      expect(console.log).toHaveBeenCalledWith('Redis client ready!');
    });

    it('should not connect the Redis client if already connected', async () => {
      (redisConnection as any).isConnected = true;
      await redisConnection.connect();
      expect(mockRedisClient.connect).not.toHaveBeenCalled();
    });

    it('should log error if connection fails', async () => {
      const error = new Error('Connection failed');
      mockRedisClient.connect.mockRejectedValueOnce(error);

      await expect(redisConnection.connect()).rejects.toThrow(error);
      expect(console.error).toHaveBeenCalledWith('Could not connect to Redis:', error);
      expect(redisConnection.isClientConnected()).toBe(false);
    });
  });

  describe('disconnect', () => {
    it('should disconnect the Redis client if connected', async () => {
      (redisConnection as any).isConnected = true;
      await redisConnection.disconnect();
      expect(mockRedisClient.disconnect).toHaveBeenCalledTimes(1);
      // Simulate end event to update isConnected status
      mockRedisClient.on.mock.calls.find((call: unknown[]) => call[0] === 'end')![1]();
      expect(redisConnection.isClientConnected()).toBe(false);
      expect(console.log).toHaveBeenCalledWith('Redis client disconnected');
    });

    it('should not disconnect the Redis client if not connected', async () => {
      (redisConnection as any).isConnected = false;
      await redisConnection.disconnect();
      expect(mockRedisClient.disconnect).not.toHaveBeenCalled();
    });

    it('should log error if disconnection fails', async () => {
      (redisConnection as any).isConnected = true;
      const error = new Error('Disconnection failed');
      mockRedisClient.disconnect.mockRejectedValueOnce(error);

      await redisConnection.disconnect();
      expect(console.error).toHaveBeenCalledWith('Error disconnecting Redis:', error);
    });
  });

  it('should return the Redis client instance', () => {
    const client = redisConnection.getClient();
    expect(client).toBe(mockRedisClient);
  });

  it('should return the correct connection status', async () => {
    (redisConnection as any).isConnected = false;
    expect(redisConnection.isClientConnected()).toBe(false);

    // Simulate ready event
    mockRedisClient.on.mock.calls.find((call: unknown[]) => call[0] === 'ready')![1]();
    expect(redisConnection.isClientConnected()).toBe(true);

    // Simulate end event
    mockRedisClient.on.mock.calls.find((call: unknown[]) => call[0] === 'end')![1]();
    expect(redisConnection.isClientConnected()).toBe(false);
  });
});
