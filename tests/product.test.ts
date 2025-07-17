import request from 'supertest';
import app from '../src/app';

describe('SmartCos API', () => {
  it('sanity check - app should be defined', () => {
    expect(app).toBeDefined();
  });
});
