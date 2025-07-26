// Get the base URL based on the environment
const getBaseUrl = () => {
  // In the browser, use the current origin
  if (typeof window !== 'undefined') return '';
  // In server-side code, use the environment variable
  return process.env.NEXT_PUBLIC_APP_URL || 'https://app.seloraa.com';
};

const API_BASE_URL = getBaseUrl();

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  // Remove any leading slashes from the endpoint
  const normalizedEndpoint = endpoint.replace(/^\/+/, '');
  
  // Construct the full URL
  let url: string;
  if (API_BASE_URL) {
    // If we have a base URL, use it and ensure proper path joining
    const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
    url = `${base}/${normalizedEndpoint}`;
  } else {
    // If no base URL (client-side), use relative URL
    url = `/${normalizedEndpoint}`;
  }
  
  console.log('[API] Making request to:', url);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include',
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return {
        error: data.message || 'An error occurred',
        status: response.status,
      };
    }

    return { data, status: response.status };
  } catch (error) {
    console.error('API request failed:', error);
    return {
      error: error instanceof Error ? error.message : 'Network error',
      status: 500,
    };
  }
}

// Example usage:
// const { data, error } = await apiFetch('/api/users/count?companyCode=123');
