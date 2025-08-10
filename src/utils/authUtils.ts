// Client-side authentication helpers
import { NextRouter } from 'next/router';

interface AuthState {
  authenticated: boolean;
  authorized: boolean;
  user: any | null;
}

/**
 * Checks if the user is authenticated and has the required role
 * @param requiredRoles - Array of roles that are allowed
 * @returns Promise with authentication state
 */
export async function checkUserAuth(requiredRoles: string[] = []): Promise<AuthState> {
  try {
    const token = localStorage.getItem('token');
    if (!token) {
      return { authenticated: false, authorized: false, user: null };
    }

    const response = await fetch('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (!response.ok) {
      console.error('Auth check failed:', response.status);
      return { authenticated: false, authorized: false, user: null };
    }

    const data = await response.json();

    // If API returned an error shape, treat as unauthenticated
    if ((data as any)?.error) {
      return { authenticated: false, authorized: false, user: null };
    }

    const user = data;

    // Basic presence check
    if (!user || !user.role) {
      return { authenticated: false, authorized: false, user: null };
    }

    // Check role authorization if roles are specified
    const isAuthorized = requiredRoles.length === 0 || requiredRoles.includes(user.role);

    return {
      authenticated: true,
      authorized: isAuthorized,
      user
    };
  } catch (error) {
    console.error('Error checking authentication:', error);
    return { authenticated: false, authorized: false, user: null };
  }
}

/**
 * Redirects user based on authentication status
 * @param router - Next.js router
 * @param authState - Result from checkUserAuth
 * @param redirectTo - Where to redirect if not authenticated
 * @returns Whether a redirect was performed
 */
export function handleAuthRedirect(router: any, authState: AuthState, redirectTo: string = '/login'): boolean {
  if (!authState.authenticated) {
    router.push(redirectTo);
    return true;
  }
  
  // Even if not authorized for specific role, still allow user to stay
  // (they'll be redirected to dashboard by the natural UI flow)
  return false;
}
