import type { NextRequest } from 'next/server';

/**
 * Generate an absolute URL using the current request's host
 * @param pathname The path to append to the base URL
 * @param request Optional NextRequest object to get the current host
 * @returns The full absolute URL
 */
export const absoluteUrl = (pathname: string, request?: NextRequest): string => {
  // In production, use the host from the request headers if available
  if (process.env.NODE_ENV === 'production' && request) {
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
    const proto = request.headers.get('x-forwarded-proto') || 'https';
    if (host) {
      const baseUrl = `${proto}://${host}`;
      const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
      return `${baseUrl.replace(/\/+$/, '')}${normalizedPath}`;
    }
  }
  
  // Fallback to environment variable or default
  const baseUrl = process.env.BASE_URL || 
    (process.env.NODE_ENV === 'production' 
      ? 'https://app.seloraa.com' 
      : 'http://localhost:3000');
  
  // Ensure pathname starts with a slash
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  // Remove any duplicate slashes that might occur from joining
  return `${baseUrl.replace(/\/+$/, '')}${normalizedPath}`;
};

/**
 * @deprecated Use absoluteUrl instead
 */
export const getFullUrl = absoluteUrl;

/**
 * Generate an absolute URL for API routes
 * @param pathname The API path to append to the base URL
 * @returns The full absolute API URL
 */
export const getApiUrl = (pathname: string): string => {
  return absoluteUrl(`/api${pathname.startsWith('/') ? '' : '/'}${pathname}`);
};
