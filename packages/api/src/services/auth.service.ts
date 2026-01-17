import { query } from '../config/database';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { User, UserResponse, RegisterData, LoginCredentials } from '../types';
import { v4 as uuidv4 } from 'uuid';

export class AuthService {
  async register(data: RegisterData): Promise<{ user: UserResponse; token: string }> {
    const { email, password, first_name, last_name } = data;

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      throw new Error('User with this email already exists');
    }

    // Hash password
    const password_hash = await hashPassword(password);

    // Create user
    const userId = uuidv4();
    const result = await query(
      `INSERT INTO users (id, email, password_hash, first_name, last_name)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, first_name, last_name, created_at`,
      [userId, email, password_hash, first_name, last_name]
    );

    const user = result.rows[0];

    // Generate JWT token
    const token = generateToken({ id: user.id, email: user.email });

    return { user, token };
  }

  async login(credentials: LoginCredentials): Promise<{ user: UserResponse; token: string }> {
    const { email, password } = credentials;

    // Find user
    const result = await query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid email or password');
    }

    const user: User = result.rows[0];

    // Verify password
    const isValidPassword = await comparePassword(password, user.password_hash);

    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    // Generate JWT token
    const token = generateToken({ id: user.id, email: user.email });

    // Return user without password
    const { password_hash, ...userResponse } = user;

    return { user: userResponse as UserResponse, token };
  }

  async getUserById(userId: string): Promise<UserResponse | null> {
    const result = await query(
      'SELECT id, email, first_name, last_name, created_at FROM users WHERE id = $1',
      [userId]
    );

    return result.rows[0] || null;
  }
}

export default new AuthService();