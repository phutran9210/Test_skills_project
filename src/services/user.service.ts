import { Repository } from 'typeorm';
import { User } from '../models/user.entity';
import { AppDataSource } from '../config';

export class UserService {
  private userRepository: Repository<User>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
  }

  /**
   * Find user by ID
   */
  async findById(id: number): Promise<User | null> {
    try {
      return await this.userRepository.findOne({
        where: { id },
        select: [
          'id',
          'email',
          'firstName',
          'lastName',
          'role',
          'isActive',
          'createdAt',
          'updatedAt',
        ],
      });
    } catch (error) {
      console.error('Error finding user by ID:', error);
      return null;
    }
  }
}
