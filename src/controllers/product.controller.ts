import { Request, Response } from 'express';
import { AppDataSource } from '../database';
import { Product } from '../models/product.entity';

const productRepo = AppDataSource.getRepository(Product);

export const createProduct = async (req: Request, res: Response) => {
  const { name, price, category } = req.body;
  if (!name || !price) return res.status(400).json({ message: 'Invalid data' });

  const product = productRepo.create({ name, price, category });
  await productRepo.save(product);
  return res.status(201).json(product);
};

export const getProducts = async (req: Request, res: Response) => {
  const products = await productRepo.find();
  return res.json(products);
};
