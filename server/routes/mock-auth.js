 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }/**
 * Mock Auth Routes for Development/Testing
 * Uses in-memory storage instead of database
 * Enable by setting USE_MOCK_AUTH=true in .env
 */

import { Router, } from 'express';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

const router = Router();

// In-memory user storage










const mockUsers = new Map();

// JWT Secret for mock auth
const JWT_SECRET = process.env.JWT_SECRET || 'mock-secret-key-for-dev';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'mock-refresh-secret-for-dev';

// Helper to generate tokens
function generateTokens(userId, email) {
    const accessToken = jwt.sign(
        { sub: userId, email, type: 'access' },
        JWT_SECRET,
        { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
        { sub: userId, email, type: 'refresh' },
        JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
    );

    return { accessToken, refreshToken, expiresIn: 900 }; // 15 minutes
}

// Helper to format user response (without password)
function formatUserResponse(user) {
    return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt.toISOString(),
    };
}

/**
 * @route POST /api/auth/register
 * @desc Register a new user (mock)
 */
router.post('/register', async (req, res) => {
    try {
        const { email, password, firstName, lastName } = req.body;

        // Validate required fields
        if (!email || !password || !firstName || !lastName) {
            return res.status(400).json({
                success: false,
                error: {
                    type: 'VALIDATION_ERROR',
                    message: 'All fields are required: email, password, firstName, lastName',
                    code: 'MISSING_FIELDS',
                    timestamp: new Date().toISOString(),
                },
            });
        }

        // Check if user already exists
        const existingUser = Array.from(mockUsers.values()).find(u => u.email === email);
        if (existingUser) {
            return res.status(409).json({
                success: false,
                error: {
                    type: 'CONFLICT_ERROR',
                    message: 'User with this email already exists',
                    code: 'EMAIL_EXISTS',
                    timestamp: new Date().toISOString(),
                },
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const userId = `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newUser = {
            id: userId,
            email,
            password: hashedPassword,
            firstName,
            lastName,
            emailVerified: true, // Auto-verify for mock
            createdAt: new Date(),
        };

        mockUsers.set(userId, newUser);
        console.log(`[MOCK AUTH] User registered: ${email} (ID: ${userId})`);

        // Generate tokens
        const tokens = generateTokens(userId, email);

        res.status(201).json({
            success: true,
            message: 'User registered successfully (MOCK MODE)',
            data: {
                user: formatUserResponse(newUser),
                tokens,
            },
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[MOCK AUTH] Registration error:', error);
        res.status(500).json({
            success: false,
            error: {
                type: 'INTERNAL_SERVER_ERROR',
                message: 'Registration failed',
                code: 'REGISTRATION_FAILED',
                timestamp: new Date().toISOString(),
            },
        });
    }
});

/**
 * @route POST /api/auth/login
 * @desc Login user (mock)
 */
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: {
                    type: 'VALIDATION_ERROR',
                    message: 'Email and password are required',
                    code: 'MISSING_CREDENTIALS',
                    timestamp: new Date().toISOString(),
                },
            });
        }

        // Find user
        const user = Array.from(mockUsers.values()).find(u => u.email === email);
        if (!user) {
            return res.status(401).json({
                success: false,
                error: {
                    type: 'AUTHENTICATION_ERROR',
                    message: 'Invalid email or password',
                    code: 'INVALID_CREDENTIALS',
                    timestamp: new Date().toISOString(),
                },
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                error: {
                    type: 'AUTHENTICATION_ERROR',
                    message: 'Invalid email or password',
                    code: 'INVALID_CREDENTIALS',
                    timestamp: new Date().toISOString(),
                },
            });
        }

        console.log(`[MOCK AUTH] User logged in: ${email}`);

        // Generate tokens
        const tokens = generateTokens(user.id, email);

        res.json({
            success: true,
            message: 'Login successful (MOCK MODE)',
            data: {
                user: formatUserResponse(user),
                tokens,
            },
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[MOCK AUTH] Login error:', error);
        res.status(500).json({
            success: false,
            error: {
                type: 'INTERNAL_SERVER_ERROR',
                message: 'Login failed',
                code: 'LOGIN_FAILED',
                timestamp: new Date().toISOString(),
            },
        });
    }
});

/**
 * @route POST /api/auth/logout
 * @desc Logout user (mock)
 */
router.post('/logout', (req, res) => {
    console.log('[MOCK AUTH] User logged out');
    res.json({
        success: true,
        message: 'Logout successful',
        timestamp: new Date().toISOString(),
    });
});

/**
 * @route POST /api/auth/refresh-token
 * @desc Refresh access token (mock)
 */
router.post('/refresh-token', (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                error: {
                    type: 'VALIDATION_ERROR',
                    message: 'Refresh token is required',
                    code: 'MISSING_REFRESH_TOKEN',
                    timestamp: new Date().toISOString(),
                },
            });
        }

        // Verify refresh token
        const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) ;

        // Generate new tokens
        const tokens = generateTokens(decoded.sub, decoded.email);

        res.json({
            success: true,
            message: 'Token refreshed successfully',
            data: { tokens },
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        res.status(401).json({
            success: false,
            error: {
                type: 'AUTHENTICATION_ERROR',
                message: 'Invalid or expired refresh token',
                code: 'INVALID_REFRESH_TOKEN',
                timestamp: new Date().toISOString(),
            },
        });
    }
});

/**
 * @route GET /api/auth/me
 * @desc Get current user profile (mock)
 */
router.get('/me', (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!_optionalChain([authHeader, 'optionalAccess', _ => _.startsWith, 'call', _2 => _2('Bearer ')])) {
            return res.status(401).json({
                success: false,
                error: {
                    type: 'AUTHENTICATION_ERROR',
                    message: 'Authorization token required',
                    code: 'MISSING_TOKEN',
                    timestamp: new Date().toISOString(),
                },
            });
        }

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET) ;

        const user = mockUsers.get(decoded.sub);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: {
                    type: 'NOT_FOUND',
                    message: 'User not found',
                    code: 'USER_NOT_FOUND',
                    timestamp: new Date().toISOString(),
                },
            });
        }

        res.json({
            success: true,
            data: { user: formatUserResponse(user) },
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        res.status(401).json({
            success: false,
            error: {
                type: 'AUTHENTICATION_ERROR',
                message: 'Invalid or expired token',
                code: 'INVALID_TOKEN',
                timestamp: new Date().toISOString(),
            },
        });
    }
});

// Catch-all for other auth endpoints (return mock responses)
router.use((req, res) => {
    console.log(`[MOCK AUTH] Unhandled route: ${req.method} ${req.path}`);
    res.json({
        success: true,
        message: 'Mock auth endpoint - operation simulated',
        timestamp: new Date().toISOString(),
    });
});

export default router;
