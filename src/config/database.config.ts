import dotenv from 'dotenv';
import { DataSource, DataSourceOptions } from 'typeorm';
import { Pool, PoolConfig } from 'pg';
import path from 'path';

dotenv.config();

// PostgreSQL Database Configuration Interface
export interface PostgreSQLConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl: boolean;
  maxConnections: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
}

// Get PostgreSQL config from environment variables
const getPostgreSQLConfig = (): PostgreSQLConfig => ({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'smartcos',
  ssl: process.env.DB_SSL === 'true',
  maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '10'),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '2000'),
});

// Get PostgreSQL configuration
const config = getPostgreSQLConfig();

// TypeORM DataSource Configuration
const typeOrmConfig: DataSourceOptions = {
  type: 'postgres',
  host: config.host,
  port: config.port,
  username: config.username,
  password: config.password,
  database: config.database,
  ssl: config.ssl ? { rejectUnauthorized: false } : false,
  extra: {
    max: config.maxConnections,
    idleTimeoutMillis: config.idleTimeoutMillis,
    connectionTimeoutMillis: config.connectionTimeoutMillis,
  },
  entities: [path.join(__dirname, '../models/*.entity.{ts,js}')],
  synchronize: process.env.NODE_ENV === 'development',
  logging: process.env.NODE_ENV === 'development' ? ['error', 'warn', 'info', 'log'] : ['error'],
  migrations: ['src/migrations/*.ts'],
  migrationsRun: false,
};

// TypeORM DataSource instance
export const AppDataSource = new DataSource(typeOrmConfig);

// Raw PostgreSQL Pool configuration
const pgPoolConfig: PoolConfig = {
  host: config.host,
  port: config.port,
  user: config.username,
  password: config.password,
  database: config.database,
  ssl: config.ssl ? { rejectUnauthorized: false } : false,
  max: config.maxConnections,
  idleTimeoutMillis: config.idleTimeoutMillis,
  connectionTimeoutMillis: config.connectionTimeoutMillis,
};

// Raw PostgreSQL Pool instance (for custom queries)
export const pgPool = new Pool(pgPoolConfig);

// Database Connection Manager
class DatabaseConnection {
  private static instance: DatabaseConnection;
  private isTypeOrmConnected: boolean = false;
  private isPgPoolConnected: boolean = false;

  private constructor() {}

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  /**
   * Initializes the TypeORM connection
   */
  public async initializeTypeORM(): Promise<void> {
    try {
      if (!this.isTypeOrmConnected) {
        await AppDataSource.initialize();
        this.isTypeOrmConnected = true;
        console.log('TypeORM has connected successfully!');

        // Display database information
        const dbOptions = AppDataSource.options;
        console.log(`Database: ${dbOptions.database} on postgres at ${config.host}:${config.port}`);
      }
    } catch (error) {
      console.error('Error connecting TypeORM:', error);
      throw error;
    }
  }

  /**
   * Initializes the PostgreSQL Pool connection
   */
  public async initializePgPool(): Promise<void> {
    try {
      if (!this.isPgPoolConnected) {
        // Test connection
        const client = await pgPool.connect();
        const result = await client.query('SELECT NOW()');
        client.release();

        this.isPgPoolConnected = true;
        console.log('PostgreSQL Pool has connected successfully!');
        console.log(`Server time: ${result.rows[0].now}`);

        // Setup event handlers
        this.setupPgPoolEventHandlers();
      }
    } catch (error) {
      console.error('Error connecting PostgreSQL Pool:', error);
      throw error;
    }
  }

  /**
   * Sets up event handlers for the PostgreSQL Pool
   */
  private setupPgPoolEventHandlers(): void {
    pgPool.on('connect', (_client) => {
      console.log('PostgreSQL client connected');
    });

    pgPool.on('acquire', (_client) => {
      console.log('PostgreSQL client acquired from pool');
    });

    pgPool.on('remove', (_client) => {
      console.log('PostgreSQL client removed from pool');
    });

    pgPool.on('error', (err, _client) => {
      console.error('PostgreSQL client error:', err);
    });
  }

  /**
   * Closes all database connections
   */
  public async closeConnections(): Promise<void> {
    try {
      if (this.isTypeOrmConnected) {
        await AppDataSource.destroy();
        this.isTypeOrmConnected = false;
        console.log('TypeORM connection closed');
      }

      if (this.isPgPoolConnected) {
        await pgPool.end();
        this.isPgPoolConnected = false;
        console.log('PostgreSQL Pool connection closed');
      }
    } catch (error) {
      console.error('Error closing database connections:', error);
    }
  }
}

export default DatabaseConnection;
