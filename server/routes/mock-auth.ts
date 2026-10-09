/**
 * Mock Auth Routes for Development/Testing
 * Uses in-memory storage instead of database
 * Enable by setting USE_MOCK_AUTH=true in .env
 */

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';

const router = Router();

// In-memory user storage
export interface MockUser {
    id: string;
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: 'USER' | 'ADMIN' | 'SUPER_ADMIN';
    emailVerified: boolean;
    createdAt: Date;
    subscription?: {
        tier: string;
        status: string;
    };
}

export const mockUsers: Map<string, MockUser> = new Map();

// Canonical full-access test credentials pre-seeded on startup
const CANONICAL_ADMIN_ID = 'seed-admin-user-001';
const CANONICAL_ADMIN_EMAIL = 'admin@feexsystems.com';
const CANONICAL_ADMIN_HASH = '$2a$10$W4IJ1pGTTaiDwj0z4zI9Q.MYDBrHTkEtAHhdenTEOjvbdkPlab7Jm';

mockUsers.set(CANONICAL_ADMIN_ID, {
    id: CANONICAL_ADMIN_ID,
    email: CANONICAL_ADMIN_EMAIL,
    password: CANONICAL_ADMIN_HASH,
    firstName: 'Super',
    lastName: 'Admin',
    role: 'SUPER_ADMIN',
    emailVerified: true,
    createdAt: new Date(),
    subscription: {
        tier: 'ENTERPRISE',
        status: 'ACTIVE',
    },
});

// ─────────────────────────────────────────────────────────────────
// Mock-auth token secrets
//
// SECURITY: these are deliberately SEPARATE from JWT_SECRET/JWT_REFRESH_SECRET
// so a token minted for the in-memory mock user store can never be accepted as
// a real credential by anything that verifies the production secrets.
//
// There is intentionally NO hardcoded fallback. A missing secret must throw
// rather than silently defaulting to a value that is checked into this
// repository — a published fallback secret means anyone can forge tokens.
//
// NOTE: enablement is resolved lazily (a function, not a module-level const).
// A const captured at import time is racy: test setup files and `beforeAll`
// hooks that populate process.env can run after this module is first imported,
// which previously made mock auth look permanently disabled.
// ─────────────────────────────────────────────────────────────────
export function isMockAuthEnabled(): boolean {
    return process.env.USE_MOCK_AUTH === 'true';
}

function requireSecret(name: string): string {
    const value = process.env[name];
    if (!value || value.length < 16) {
        throw new Error(
            `FATAL: ${name} is required (min 16 chars) when USE_MOCK_AUTH=true. ` +
            `Generate one with: openssl rand -hex 32`
        );
    }
    return value;
}

export function getMockJwtSecret(): string {
    if (!isMockAuthEnabled()) {
        throw new Error('Mock auth is disabled: refusing to resolve mock JWT secret');
    }
    return requireSecret('MOCK_JWT_SECRET');
}

export function getMockJwtRefreshSecret(): string {
    if (!isMockAuthEnabled()) {
        throw new Error('Mock auth is disabled: refusing to resolve mock JWT refresh secret');
    }
    return requireSecret('MOCK_JWT_REFRESH_SECRET');
}

// Helper to generate tokens
export function generateTokens(userId: string, email: string, role = 'USER') {
    const accessToken = jwt.sign(
        { sub: userId, email, role, type: 'access' },
        getMockJwtSecret(),
        { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
        { sub: userId, email, role, type: 'refresh' },
        getMockJwtRefreshSecret(),
        { expiresIn: '7d' }
    );

    return { accessToken, refreshToken, expiresIn: 900 }; // 15 minutes
}

// Helper to format user response (without password)
export function formatUserResponse(user: MockUser) {
    return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt.toISOString(),
        subscription: user.subscription || {
            tier: 'ENTERPRISE',
            status: 'ACTIVE',
        },
    };
}

/**
 * @route POST /api/auth/register
 * @desc Register a new user (mock)
 */
router.post('/register', async (req: Request, res: Response) => {
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
        const newUser: MockUser = {
            id: userId,
            email,
            password: hashedPassword,
            firstName,
            lastName,
            role: 'USER',
            emailVerified: true, // Auto-verify for mock
            createdAt: new Date(),
        };

        mockUsers.set(userId, newUser);
        console.log(`[MOCK AUTH] User registered: ${email} (ID: ${userId})`);

        // Generate tokens
        const tokens = generateTokens(userId, email, newUser.role);

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
router.post('/login', async (req: Request, res: Response) => {
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

        // Find user (case-insensitive)
        const user = Array.from(mockUsers.values()).find(
            u => u.email.toLowerCase() === email.toLowerCase()
        );
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

        console.log(`[MOCK AUTH] User logged in: ${email} (Role: ${user.role})`);

        // Generate tokens
        const tokens = generateTokens(user.id, user.email, user.role);

        res.json({
            success: true,
            message: 'Login successful (MOCK MODE)',
            data: {
                user: formatUserResponse(user),
                tokens,
            },
            tokens,
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
 * @route POST /api/auth/google
 * @desc Google OAuth login/session resolution (mock/dev fallback)
 */
router.post('/google', async (req: Request, res: Response) => {
    try {
        const email = req.body?.email || 'admin@feexsystems.com';
        const firstName = req.body?.firstName || 'Feex';
        const lastName = req.body?.lastName || 'Operator';
        const userId = req.body?.id || 'google_user_canonical_001';

        const existingUser = Array.from(mockUsers.values()).find(
            u => u.email.toLowerCase() === email.toLowerCase()
        );

        let userToReturn = existingUser;

        if (!userToReturn) {
            const newUser: MockUser = {
                id: userId,
                email,
                password: '',
                firstName,
                lastName,
                role: 'SUPER_ADMIN',
                emailVerified: true,
                createdAt: new Date(),
                subscription: {
                    tier: 'ENTERPRISE',
                    status: 'ACTIVE',
                },
            };
            mockUsers.set(userId, newUser);
            userToReturn = newUser;
        }

        console.log(`[MOCK AUTH] Google user authenticated: ${email} (Role: ${userToReturn.role})`);

        const tokens = generateTokens(userToReturn.id, userToReturn.email, userToReturn.role);

        res.json({
            success: true,
            message: 'Google authentication successful',
            data: {
                user: formatUserResponse(userToReturn),
                tokens,
            },
            tokens,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('[MOCK AUTH] Google auth error:', error);
        res.status(500).json({
            success: false,
            error: {
                type: 'INTERNAL_SERVER_ERROR',
                message: 'Google authentication failed',
                code: 'GOOGLE_AUTH_FAILED',
                timestamp: new Date().toISOString(),
            },
        });
    }
});

/**
 * @route POST /api/auth/logout
 * @desc Logout user (mock)
 */
router.post('/logout', (_req: Request, res: Response) => {
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
router.post('/refresh-token', (req: Request, res: Response) => {
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
        const decoded = jwt.verify(refreshToken, getMockJwtRefreshSecret()) as { sub: string; email: string };

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
router.get('/me', (req: Request, res: Response) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
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
        const decoded = jwt.verify(token, getMockJwtSecret()) as { sub: string; email: string };

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
router.use((req: Request, res: Response) => {
    console.log(`[MOCK AUTH] Unhandled route: ${req.method} ${req.path}`);
    res.json({
        success: true,
        message: 'Mock auth endpoint - operation simulated',
        timestamp: new Date().toISOString(),
    });
});

export default router;
