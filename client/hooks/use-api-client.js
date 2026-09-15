import { useEffect } from 'react';
import { useAuthStore } from '@/lib/auth-store';
import { apiClient, } from '@/lib/api-client';

export function useApiClient() {
  const { logout } = useAuthStore();

  useEffect(() => {
    // Add a 401 interceptor
    const originalInterceptor = apiClient.onError;
    apiClient.onError = (err) => {
      if (err.status === 401) {
        logout();
      }
      if (originalInterceptor) {
        originalInterceptor(err);
      }
    };
    return () => {
      apiClient.onError = originalInterceptor;
    };
  }, [logout]);

  return apiClient;
}