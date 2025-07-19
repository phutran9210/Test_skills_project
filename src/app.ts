import dotenv from 'dotenv';
import express from 'express';
import 'reflect-metadata';
import { DatabaseConnection, RedisConnection } from './config';

// Load environment variables
dotenv.config();
import productRoutes from './routes/product.routes';
import userRoutes from './routes/user.routes';

const app = express();
app.use(express.json());

app.use('/users', userRoutes);
app.use('/products', productRoutes);

const startServer = async () => {
  try {
    // Initialize database using DatabaseConnection
    const databaseConnection = DatabaseConnection.getInstance();
    await databaseConnection.initializeTypeORM();

    // Initialize Redis using RedisConnection
    const redisConnection = RedisConnection.getInstance();
    await redisConnection.connect();

    // Start server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
  console.log(`\n Received ${signal}. Shutting down gracefully...`);

  try {
    const databaseConnection = DatabaseConnection.getInstance();
    const redisConnection = RedisConnection.getInstance();

    await Promise.all([databaseConnection.closeConnections(), redisConnection.disconnect()]);

    console.log(' Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error(' Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start the server
startServer();
