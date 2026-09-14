import { http, HttpResponse } from 'msw';
import { mockApiResponses } from './api';

// MSW handlers for API mocking
export const handlers = [
  // Auth endpoints
  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json() ;
    
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
    const body = await request.json() 




;
    
    // Simulate different responses based on input
    if (body.email === 'existing@example.com') {
      return HttpResponse.json(mockApiResponses.register.error, { status: 400 });
    }
    
    return HttpResponse.json(mockApiResponses.register.success);
  }),

  http.post('/api/auth/refresh-token', async ({ request }) => {
    const body = await request.json() ;
    
    // Simulate different responses based on input
    if (body.refreshToken === 'invalid-token') {
      return HttpResponse.json(mockApiResponses.refreshToken.error, { status: 401 });
    }
    
    return HttpResponse.json(mockApiResponses.refreshToken.success);
  }),

  http.get('/api/auth/validate', () => {
    return HttpResponse.json({ valid: true });
  }),

  http.post('/api/auth/forgot-password', async ({ request }) => {
    const body = await request.json() ;
    
    return HttpResponse.json({ 
      message: 'Password reset email sent',
      success: true 
    });
  }),

  http.post('/api/auth/reset-password', async ({ request }) => {
    const body = await request.json() 


;
    
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
    const body = await request.json() ;
    
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
    const body = await request.json() ;
    
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
    const body = await request.json();
    
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
];

// Error handlers for testing error scenarios
export const errorHandlers = [
  http.post('/api/auth/login', () => {
    return HttpResponse.json(mockApiResponses.login.error, { status: 401 });
  }),

  http.post('/api/auth/register', () => {
    return HttpResponse.json(mockApiResponses.register.error, { status: 400 });
  }),

  http.post('/api/auth/refresh-token', () => {
    return HttpResponse.json(mockApiResponses.refreshToken.error, { status: 401 });
  }),
];