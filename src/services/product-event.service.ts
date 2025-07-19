import { EventEmitter } from 'events';
import { Product } from '../models/product.entity';
import productConfig from '../config/product.config';

export interface ProductEventData {
  productId: number;
  product?: Product;
  timestamp: Date;
  userId?: string;
}

export class ProductEventService extends EventEmitter {
  private static instance: ProductEventService;

  private constructor() {
    super();
    this.setMaxListeners(100); // Prevent memory leak warnings
  }

  public static getInstance(): ProductEventService {
    if (!ProductEventService.instance) {
      ProductEventService.instance = new ProductEventService();
    }
    return ProductEventService.instance;
  }

  /**
   * Emit product created event
   */
  emitProductCreated(product: Product, userId?: string): void {
    if (!productConfig.enableEventEmission) {
      return;
    }

    const eventData: ProductEventData = {
      productId: product.id,
      product,
      timestamp: new Date(),
      userId,
    };

    this.emit('product.created', eventData);
    console.log(`Event emitted: product.created for ID ${product.id}`);
  }

  /**
   * Emit product updated event
   */
  emitProductUpdated(product: Product, userId?: string): void {
    if (!productConfig.enableEventEmission) {
      return;
    }

    const eventData: ProductEventData = {
      productId: product.id,
      product,
      timestamp: new Date(),
      userId,
    };

    this.emit('product.updated', eventData);
    console.log(`Event emitted: product.updated for ID ${product.id}`);
  }

  /**
   * Emit product deleted event
   */
  emitProductDeleted(productId: number, userId?: string): void {
    if (!productConfig.enableEventEmission) {
      return;
    }

    const eventData: ProductEventData = {
      productId,
      timestamp: new Date(),
      userId,
    };

    this.emit('product.deleted', eventData);
    console.log(`Event emitted: product.deleted for ID ${productId}`);
  }

  /**
   * Emit product viewed event
   */
  emitProductViewed(productId: number, userId?: string): void {
    if (!productConfig.enableEventEmission) {
      return;
    }

    const eventData: ProductEventData = {
      productId,
      timestamp: new Date(),
      userId,
    };

    this.emit('product.viewed', eventData);
    console.log(`Event emitted: product.viewed for ID ${productId}`);
  }

  /**
   * Register event listeners
   */
  setupEventListeners(): void {
    this.on('product.created', (data: ProductEventData) => {
      // Handle product created event
      console.log(`Product created: ${data.productId} at ${data.timestamp}`);
    });

    this.on('product.updated', (data: ProductEventData) => {
      // Handle product updated event
      console.log(`Product updated: ${data.productId} at ${data.timestamp}`);
    });

    this.on('product.deleted', (data: ProductEventData) => {
      // Handle product deleted event
      console.log(`Product deleted: ${data.productId} at ${data.timestamp}`);
    });

    this.on('product.viewed', (data: ProductEventData) => {
      // Handle product viewed event (for analytics)
      console.log(`Product viewed: ${data.productId} at ${data.timestamp}`);
    });
  }
}

export default ProductEventService;
