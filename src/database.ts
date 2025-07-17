import { DataSource } from 'typeorm';
import { Product } from './models/product.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USER || 'test',
  password: process.env.DB_PASSWORD || 'test',
  database: process.env.DB_NAME || 'smartcos',
  synchronize: true,
  logging: false,
  entities: [Product],
});
