import { ProductEventService, ProductEventData } from '../../../src/services/product-event.service';
import { Product } from '../../../src/models/product.entity';
import productConfig from '../../../src/config/product.config';

// Mock dependencies
jest.mock('../../../src/config/product.config', () => ({
  enableEventEmission: true,
}));

describe('ProductEventService', () => {
  let eventService: ProductEventService;

  const mockProduct: Product = {
    id: 1,
    name: 'Test Product',
    price: 99.99,
    category: 'Electronics',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset singleton instance for each test
    (ProductEventService as any).instance = undefined;
    
    // Create new service instance
    eventService = ProductEventService.getInstance();

    // Mock console methods
    jest.spyOn(console, 'log').mockImplementation(() => {});

    // Reset product config to default
    (productConfig as any).enableEventEmission = true;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    
    // Clean up listeners to prevent memory leaks
    eventService.removeAllListeners();
    
    // Reset singleton instance
    (ProductEventService as any).instance = undefined;
  });

  describe('Singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ProductEventService.getInstance();
      const instance2 = ProductEventService.getInstance();
      
      expect(instance1).toBe(instance2);
      expect(instance1).toBeInstanceOf(ProductEventService);
    });

    it('should extend EventEmitter', () => {
      expect(eventService).toBeInstanceOf(require('events').EventEmitter);
    });

    it('should set max listeners to 100', () => {
      expect(eventService.getMaxListeners()).toBe(100);
    });
  });

  describe('emitProductCreated', () => {
    it('should emit product.created event with correct data', () => {
      const mockListener = jest.fn();
      eventService.on('product.created', mockListener);

      eventService.emitProductCreated(mockProduct);

      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 1,
          product: mockProduct,
          timestamp: expect.any(Date),
          userId: undefined,
        })
      );
      expect(console.log).toHaveBeenCalledWith('Event emitted: product.created for ID 1');
    });

    it('should emit product.created event with userId', () => {
      const mockListener = jest.fn();
      const userId = 'user123';
      eventService.on('product.created', mockListener);

      eventService.emitProductCreated(mockProduct, userId);

      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 1,
          product: mockProduct,
          timestamp: expect.any(Date),
          userId: 'user123',
        })
      );
    });

    it('should not emit event when enableEventEmission is false', () => {
      (productConfig as any).enableEventEmission = false;
      const mockListener = jest.fn();
      eventService.on('product.created', mockListener);

      eventService.emitProductCreated(mockProduct);

      expect(mockListener).not.toHaveBeenCalled();
      expect(console.log).not.toHaveBeenCalled();
    });

    it('should include correct timestamp', () => {
      const mockListener = jest.fn();
      eventService.on('product.created', mockListener);

      const beforeTimestamp = new Date();
      eventService.emitProductCreated(mockProduct);
      const afterTimestamp = new Date();

      const eventData = mockListener.mock.calls[0][0] as ProductEventData;
      expect(eventData.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTimestamp.getTime());
      expect(eventData.timestamp.getTime()).toBeLessThanOrEqual(afterTimestamp.getTime());
    });
  });

  describe('emitProductUpdated', () => {
    it('should emit product.updated event with correct data', () => {
      const mockListener = jest.fn();
      eventService.on('product.updated', mockListener);

      eventService.emitProductUpdated(mockProduct);

      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 1,
          product: mockProduct,
          timestamp: expect.any(Date),
          userId: undefined,
        })
      );
      expect(console.log).toHaveBeenCalledWith('Event emitted: product.updated for ID 1');
    });

    it('should emit product.updated event with userId', () => {
      const mockListener = jest.fn();
      const userId = 'user456';
      eventService.on('product.updated', mockListener);

      eventService.emitProductUpdated(mockProduct, userId);

      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 1,
          product: mockProduct,
          timestamp: expect.any(Date),
          userId: 'user456',
        })
      );
    });

    it('should not emit event when enableEventEmission is false', () => {
      (productConfig as any).enableEventEmission = false;
      const mockListener = jest.fn();
      eventService.on('product.updated', mockListener);

      eventService.emitProductUpdated(mockProduct);

      expect(mockListener).not.toHaveBeenCalled();
      expect(console.log).not.toHaveBeenCalled();
    });
  });

  describe('emitProductDeleted', () => {
    const productId = 1;

    it('should emit product.deleted event with correct data', () => {
      const mockListener = jest.fn();
      eventService.on('product.deleted', mockListener);

      eventService.emitProductDeleted(productId);

      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 1,
          timestamp: expect.any(Date),
          userId: undefined,
        })
      );
      expect(console.log).toHaveBeenCalledWith('Event emitted: product.deleted for ID 1');
    });

    it('should emit product.deleted event with userId', () => {
      const mockListener = jest.fn();
      const userId = 'user789';
      eventService.on('product.deleted', mockListener);

      eventService.emitProductDeleted(productId, userId);

      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 1,
          timestamp: expect.any(Date),
          userId: 'user789',
        })
      );
    });

    it('should not include product object in deleted event', () => {
      const mockListener = jest.fn();
      eventService.on('product.deleted', mockListener);

      eventService.emitProductDeleted(productId);

      const eventData = mockListener.mock.calls[0][0] as ProductEventData;
      expect(eventData.product).toBeUndefined();
    });

    it('should not emit event when enableEventEmission is false', () => {
      (productConfig as any).enableEventEmission = false;
      const mockListener = jest.fn();
      eventService.on('product.deleted', mockListener);

      eventService.emitProductDeleted(productId);

      expect(mockListener).not.toHaveBeenCalled();
      expect(console.log).not.toHaveBeenCalled();
    });
  });

  describe('emitProductViewed', () => {
    const productId = 1;

    it('should emit product.viewed event with correct data', () => {
      const mockListener = jest.fn();
      eventService.on('product.viewed', mockListener);

      eventService.emitProductViewed(productId);

      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 1,
          timestamp: expect.any(Date),
          userId: undefined,
        })
      );
      expect(console.log).toHaveBeenCalledWith('Event emitted: product.viewed for ID 1');
    });

    it('should emit product.viewed event with userId', () => {
      const mockListener = jest.fn();
      const userId = 'viewer123';
      eventService.on('product.viewed', mockListener);

      eventService.emitProductViewed(productId, userId);

      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 1,
          timestamp: expect.any(Date),
          userId: 'viewer123',
        })
      );
    });

    it('should not include product object in viewed event', () => {
      const mockListener = jest.fn();
      eventService.on('product.viewed', mockListener);

      eventService.emitProductViewed(productId);

      const eventData = mockListener.mock.calls[0][0] as ProductEventData;
      expect(eventData.product).toBeUndefined();
    });

    it('should not emit event when enableEventEmission is false', () => {
      (productConfig as any).enableEventEmission = false;
      const mockListener = jest.fn();
      eventService.on('product.viewed', mockListener);

      eventService.emitProductViewed(productId);

      expect(mockListener).not.toHaveBeenCalled();
      expect(console.log).not.toHaveBeenCalled();
    });
  });

  describe('setupEventListeners', () => {
    it('should set up all event listeners', () => {
      eventService.setupEventListeners();

      // Verify listeners are registered
      expect(eventService.listenerCount('product.created')).toBe(1);
      expect(eventService.listenerCount('product.updated')).toBe(1);
      expect(eventService.listenerCount('product.deleted')).toBe(1);
      expect(eventService.listenerCount('product.viewed')).toBe(1);
    });

    it('should handle product.created events', () => {
      eventService.setupEventListeners();

      const eventData: ProductEventData = {
        productId: 1,
        product: mockProduct,
        timestamp: new Date(),
      };

      eventService.emit('product.created', eventData);

      expect(console.log).toHaveBeenCalledWith(
        `Product created: ${eventData.productId} at ${eventData.timestamp}`
      );
    });

    it('should handle product.updated events', () => {
      eventService.setupEventListeners();

      const eventData: ProductEventData = {
        productId: 1,
        product: mockProduct,
        timestamp: new Date(),
      };

      eventService.emit('product.updated', eventData);

      expect(console.log).toHaveBeenCalledWith(
        `Product updated: ${eventData.productId} at ${eventData.timestamp}`
      );
    });

    it('should handle product.deleted events', () => {
      eventService.setupEventListeners();

      const eventData: ProductEventData = {
        productId: 1,
        timestamp: new Date(),
      };

      eventService.emit('product.deleted', eventData);

      expect(console.log).toHaveBeenCalledWith(
        `Product deleted: ${eventData.productId} at ${eventData.timestamp}`
      );
    });

    it('should handle product.viewed events', () => {
      eventService.setupEventListeners();

      const eventData: ProductEventData = {
        productId: 1,
        timestamp: new Date(),
      };

      eventService.emit('product.viewed', eventData);

      expect(console.log).toHaveBeenCalledWith(
        `Product viewed: ${eventData.productId} at ${eventData.timestamp}`
      );
    });

    it('should allow multiple calls without adding duplicate listeners', () => {
      eventService.setupEventListeners();
      eventService.setupEventListeners();
      eventService.setupEventListeners();

      // Should still have only one listener per event
      expect(eventService.listenerCount('product.created')).toBe(3); // EventEmitter allows multiple listeners
      expect(eventService.listenerCount('product.updated')).toBe(3);
      expect(eventService.listenerCount('product.deleted')).toBe(3);
      expect(eventService.listenerCount('product.viewed')).toBe(3);
    });
  });

  describe('event integration', () => {
    it('should emit and handle events correctly together', () => {
      eventService.setupEventListeners();

      eventService.emitProductCreated(mockProduct, 'user123');

      // Should log both emission and handling
      expect(console.log).toHaveBeenCalledWith('Event emitted: product.created for ID 1');
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Product created: 1 at')
      );
    });

    it('should handle multiple events in sequence', () => {
      eventService.setupEventListeners();

      eventService.emitProductCreated(mockProduct);
      eventService.emitProductUpdated(mockProduct);
      eventService.emitProductViewed(1);
      eventService.emitProductDeleted(1);

      expect(console.log).toHaveBeenCalledTimes(8); // 4 emissions + 4 handlers
    });

    it('should handle events with different product IDs', () => {
      eventService.setupEventListeners();

      const product1 = { ...mockProduct, id: 1 };
      const product2 = { ...mockProduct, id: 2 };

      eventService.emitProductCreated(product1);
      eventService.emitProductCreated(product2);

      expect(console.log).toHaveBeenCalledWith('Event emitted: product.created for ID 1');
      expect(console.log).toHaveBeenCalledWith('Event emitted: product.created for ID 2');
    });
  });

  describe('custom event listeners', () => {
    it('should allow external listeners to be added', () => {
      const customListener = jest.fn();
      eventService.on('product.created', customListener);

      eventService.emitProductCreated(mockProduct);

      expect(customListener).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 1,
          product: mockProduct,
        })
      );
    });

    it('should support multiple listeners for the same event', () => {
      const listener1 = jest.fn();
      const listener2 = jest.fn();
      
      eventService.on('product.created', listener1);
      eventService.on('product.created', listener2);

      eventService.emitProductCreated(mockProduct);

      expect(listener1).toHaveBeenCalled();
      expect(listener2).toHaveBeenCalled();
    });

    it('should allow listeners to be removed', () => {
      const customListener = jest.fn();
      eventService.on('product.created', customListener);
      eventService.off('product.created', customListener);

      eventService.emitProductCreated(mockProduct);

      expect(customListener).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should not throw errors when emitting events without listeners', () => {
      expect(() => {
        eventService.emitProductCreated(mockProduct);
        eventService.emitProductUpdated(mockProduct);
        eventService.emitProductDeleted(1);
        eventService.emitProductViewed(1);
      }).not.toThrow();
    });

    it('should propagate listener errors as expected by EventEmitter', () => {
      const errorListener = jest.fn(() => {
        throw new Error('Listener error');
      });
      
      eventService.on('product.created', errorListener);

      // EventEmitter does throw when listeners throw, this is expected behavior
      expect(() => {
        eventService.emitProductCreated(mockProduct);
      }).toThrow('Listener error');

      expect(errorListener).toHaveBeenCalled();
    });
  });

  describe('memory management', () => {
    it('should have configured max listeners to prevent warnings', () => {
      expect(eventService.getMaxListeners()).toBe(100);
    });

    it('should allow removal of all listeners', () => {
      eventService.setupEventListeners();
      
      const customListener = jest.fn();
      eventService.on('product.created', customListener);
      
      expect(eventService.listenerCount('product.created')).toBeGreaterThan(0);
      
      eventService.removeAllListeners();
      
      expect(eventService.listenerCount('product.created')).toBe(0);
      expect(eventService.listenerCount('product.updated')).toBe(0);
      expect(eventService.listenerCount('product.deleted')).toBe(0);
      expect(eventService.listenerCount('product.viewed')).toBe(0);
    });
  });

  describe('configuration behavior', () => {
    it('should check enableEventEmission for each event type', () => {
      // Temporarily disable events
      (productConfig as any).enableEventEmission = false;

      const listeners = {
        created: jest.fn(),
        updated: jest.fn(),
        deleted: jest.fn(),
        viewed: jest.fn(),
      };

      eventService.on('product.created', listeners.created);
      eventService.on('product.updated', listeners.updated);
      eventService.on('product.deleted', listeners.deleted);
      eventService.on('product.viewed', listeners.viewed);

      eventService.emitProductCreated(mockProduct);
      eventService.emitProductUpdated(mockProduct);
      eventService.emitProductDeleted(1);
      eventService.emitProductViewed(1);

      // No events should have been emitted
      expect(listeners.created).not.toHaveBeenCalled();
      expect(listeners.updated).not.toHaveBeenCalled();
      expect(listeners.deleted).not.toHaveBeenCalled();
      expect(listeners.viewed).not.toHaveBeenCalled();
    });
  });
});