import { useAuth } from '../hooks/use-auth';

// This is a migration shim for the old AuthStore.
// It maps the new Firebase useAuth hook to the old useAuthStore interface
// to prevent breaking changes in dozens of components.

export const useAuthStore = () => {
  const auth = useAuth();
  
  return {
    ...auth,
    // Provide no-op fallbacks for legacy methods not fully supported
    setLoading: (loading: boolean) => { console.warn('setLoading is deprecated'); },
    updateUser: (userData: any) => { console.warn('updateUser is deprecated in favor of updateProfile'); auth.updateProfile(userData); },
  };
};

export type { AuthUser as User } from '../lib/firebase-auth';