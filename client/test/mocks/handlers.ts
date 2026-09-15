import { http, HttpResponse } from 'msw';
import { mockApiResponses } from './api';

// MSW handlers for API mocking
export const handlers = [
  // Auth endpoints
  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json() as { email: string; password: string };
    
    // Simulate different responses based on input
    if (body.email === 'invalid@example.com') {
      return HttpResponse.json(mockApiResponses.login.error, { status: 401 });
    }
    
    if (body.email === 'network-error@example.com') {
      return HttpResponse.error();
    }
    
    return HttpResponse.json(mockApiResponses.login.success);
  }),

  http.post('/api/auth/register', async ({ request }) => {
    const body = await request.json() as {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
    };
    
    // Simulate different responses based on input
    if (body.email === 'existing@example.com') {
      return HttpResponse.json(mockApiResponses.register.error, { status: 400 });
    }
    
    return HttpResponse.json(mockApiResponses.register.success);
  }),

  http.post('/api/auth/refresh-token', async ({ request }) => {
    const body = await request.json() as { refreshToken: string };
    
    // Simulate different responses based on input
    if (body.refreshToken === 'invalid-token') {
      return HttpResponse.json(mockApiResponses.refreshToken.error, { status: 401 });
    }
    
    return HttpResponse.json(mockApiResponses.refreshToken.success);
  }),

  // Critical endpoint for task 1.2.1
  http.post('/api/auth/refresh', async ({ request }) => {
    const body = await request.json() as { refreshToken: string };
    
    if (body.refreshToken === 'invalid-token') {
      return HttpResponse.json(mockApiResponses.refreshToken.error, { status: 401 });
    }
    
    return HttpResponse.json({
      accessToken: 'new-mock-access-token',
    });
  }),

  http.get('/api/auth/validate', () => {
    return HttpResponse.json({ valid: true });
  }),

  http.post('/api/auth/forgot-password', async ({ request }) => {
    const body = await request.json() as { email: string };
    
    return HttpResponse.json({ 
      message: 'Password reset email sent',
      success: true 
    });
  }),

  http.post('/api/auth/reset-password', async ({ request }) => {
    const body = await request.json() as { 
      token: string; 
      password: string; 
    };
    
    if (body.token === 'invalid-token') {
      return HttpResponse.json({
        error: {
          message: 'Invalid or expired reset token',
          type: 'VALIDATION_ERROR',
          code: '400',
        }
      }, { status: 400 });
    }
    
    return HttpResponse.json({ 
      message: 'Password reset successful',
      success: true 
    });
  }),

  http.post('/api/auth/validate-reset-token', async ({ request }) => {
    const body = await request.json() as { token: string };
    
    if (body.token === 'invalid-token') {
      return HttpResponse.json({
        error: {
          message: 'Invalid or expired reset token',
          type: 'VALIDATION_ERROR',
          code: '400',
        }
      }, { status: 400 });
    }
    
    return HttpResponse.json({ 
      valid: true,
      success: true 
    });
  }),

  http.post('/api/auth/verify-email', async ({ request }) => {
    const body = await request.json() as { token: string };
    
    if (body.token === 'invalid-token') {
      return HttpResponse.json({
        error: {
          message: 'Invalid verification token',
          type: 'VALIDATION_ERROR',
          code: '400',
        }
      }, { status: 400 });
    }
    
    return HttpResponse.json({ 
      message: 'Email verified successfully',
      success: true 
    });
  }),

  http.post('/api/auth/resend-verification', () => {
    return HttpResponse.json({ 
      message: 'Verification email sent',
      success: true 
    });
  }),

  // User profile endpoints
  http.get('/api/users/profile', () => {
    return HttpResponse.json(mockApiResponses.profile.success);
  }),

  http.put('/api/users/profile', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    
    return HttpResponse.json({
      user: {
        ...mockApiResponses.profile.success.user,
        ...body,
      }
    });
  }),

  http.post('/api/users/upload-avatar', () => {
    return HttpResponse.json({
      profileImageUrl: 'https://example.com/avatar.jpg',
      success: true
    });
  }),

  // World Model endpoints - Task 1.2.1
  http.get('/api/world-model/projects', () => {
    return HttpResponse.json({
      projects: [
        {
          id: 'proj-1',
          name: 'FEEX Core',
          description: 'Core platform infrastructure'
        },
        {
          id: 'proj-2',
          name: 'World Model Service',
          description: 'Graph topology and evidence fabric'
        }
      ]
    });
  }),

  http.get('/api/world-model/graph', () => {
    return HttpResponse.json({
      nodes: [
        {
          id: 'n1',
          label: 'FEEX Core',
          type: 'project',
          data: { name: 'FEEX Core' }
        },
        {
          id: 'n2',
          label: 'World Model Service',
          type: 'service',
          data: { name: 'World Model Service' }
        }
      ],
      edges: [
        {
          id: 'e1',
          source: 'n1',
          target: 'n2',
          type: 'depends_on'
        }
      ]
    });
  }),
];

// Error handlers for testing error scenarios
export const errorHandlers = {
  // Legacy error handlers array for compatibility
  array: [
    http.post('/api/auth/login', () => {
      return HttpResponse.json(mockApiResponses.login.error, { status: 401 });
    }),

    http.post('/api/auth/register', () => {
      return HttpResponse.json(mockApiResponses.register.error, { status: 400 });
    }),

    http.post('/api/auth/refresh-token', () => {
      return HttpResponse.json(mockApiResponses.refreshToken.error, { status: 401 });
    }),
  ],

  // Task 1.2.1: Error scenario handlers
  auth401: http.get('/api/protected', () => {
    return HttpResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }),

  auth403: http.get('/api/protected', () => {
    return HttpResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }),

  server500: http.get('/api/data', () => {
    return HttpResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }),

  timeout: http.get('/api/slow', async () => {
    // Simulate request timeout (>30s)
    await new Promise(resolve => setTimeout(resolve, 35000));
    return HttpResponse.json({ data: 'never reached' });
  }),
};