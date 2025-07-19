import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('product')
export class Product {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column('decimal')
  price!: number;

  @Column()
  category!: string;
}
