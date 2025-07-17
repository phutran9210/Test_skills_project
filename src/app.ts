import express from 'express';
import 'reflect-metadata';
import { AppDataSource } from './database';
import productRoutes from './routes/product.routes';

const app = express();
app.use(express.json());

app.use('/products', productRoutes);

AppDataSource.initialize().then(() => {
  app.listen(3000, () => console.log('✅ Server running on http://localhost:3000'));
}).catch(err => console.error('DB connection error: ', err));

export default app;
