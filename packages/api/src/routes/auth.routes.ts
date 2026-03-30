import { Router, RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import { body } from 'express-validator';
import authController from '../controllers/auth.controller';
import { authenticateToken } from '../middleware/auth';

const router = Router();

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
}) as unknown as RequestHandler;

const registerValidation = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('first_name').trim().notEmpty().withMessage('First name required'),
    body('last_name').trim().notEmpty().withMessage('Last name required'),
];

const loginValidation = [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
];

// Public routes
router.post('/register', authLimiter, registerValidation, authController.register.bind(authController));
router.post('/login', authLimiter, loginValidation, authController.login.bind(authController));

// Protected routes
router.get('/profile', authenticateToken, authController.getProfile.bind(authController));

export default router;
