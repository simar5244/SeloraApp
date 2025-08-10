import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Debug configuration
const DEBUG = {
  ENABLED: true,
  PREFIX: '🚀 [MIDDLEWARE]',
  COLORS: {
    info: '\x1b[36m',
    success: '\x1b[32m',
    warn: '\x1b[33m',
    error: '\x1b[31m',
    reset: '\x1b[0m'
  },
  log: (...args: any[]) => console.log('🚀 [MIDDLEWARE]', ...args),
  error: (...args: any[]) => console.error('❌ [MIDDLEWARE]', ...args),
  warn: (...args: any[]) => console.warn('⚠️ [MIDDLEWARE]', ...args),
  debug: (...args: any[]) => DEBUG.ENABLED && console.debug('🐛 [MIDDLEWARE]', ...args),
  cookie: (cookies: any[]) => {
    if (!DEBUG.ENABLED) return;
    console.log('\n🍪 COOKIES:');
    cookies.forEach(cookie => {
      console.log(`  🔹 ${cookie.name}: ${cookie.value?.length > 50 ? `${cookie.value.substring(0, 47)}...` : cookie.value}`);
      console.log('    Options:', {
        path: cookie.path,
        domain: cookie.domain,
        expires: cookie.expires,
        httpOnly: cookie.httpOnly,
        secure: cookie.secure,
        sameSite: cookie.sameSite,
        maxAge: cookie.maxAge
      });
    });
    console.log('\n');
  },
  headers: (headers: Headers) => {
    if (!DEBUG.ENABLED) return;
    console.log('\n📋 HEADERS:');
    const headersObj: Record<string, string> = {};
    headers.forEach((value, key) => {
      headersObj[key] = key.toLowerCase().includes('cookie') ? '***REDACTED***' : value;
    });
    console.log(JSON.stringify(headersObj, null, 2));
    console.log('\n');
  }
};

DEBUG.log('Middleware initialized');

// RAILWAY FIX: Get the correct domain
function getCorrectDomain(request: NextRequest): string {
  // Check multiple headers Railway might set
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('host');
  
  console.log('[RAILWAY_DEBUG] Headers:', {
    forwardedHost,
    forwardedProto,
    host,
    origin: request.headers.get('origin'),
    referer: request.headers.get('referer')
  });

  // Use forwarded host if available (Railway sets this)
  if (forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  
  // Fallback to host header
  if (host && !host.includes('localhost')) {
    return `${forwardedProto}://${host}`;
  }
  
  // Hard-coded fallback for Railway
  return 'https://app.seloraa.com';
}

// Webhook paths that should bypass all middleware checks
const WEBHOOK_PATHS = [
  '/webhook',
  '/api/webhook',
  '/api/webhooks',
  '/api/webhooks/stripe',
  '/api/webhooks/stripe/',
  '/api/stripe/webhook',
  '/stripe-webhook',
  '/stripe/webhook',
  '/api/webhooks/stripe/route',
  '/webhook-thin',
  '/webhook-snapshot',
  '/api/webhook-thin',
  '/api/webhook-snapshot'
];

// This middleware runs on the Edge Runtime
export async function middleware(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(2, 10);
  const startTime = Date.now();
  const path = request.nextUrl.pathname;
  const method = request.method.toUpperCase();
  
  // Debug log all requests
  console.log('🌐 REQUEST:', {
    method,
    path,
    url: request.url,
    headers: Object.fromEntries(request.headers.entries())
  });

  // Check if this is a webhook request
  const isWebhook = WEBHOOK_PATHS.some(webhookPath => 
    path === webhookPath || path.startsWith(webhookPath + '/')
  );
  
  // Special handling for Stripe webhook
  const isStripeWebhook = path.startsWith('/api/webhooks/stripe');

  if (isWebhook) {
    console.log('🔵 WEBHOOK REQUEST DETECTED:', {
      method,
      path,
      url: request.url,
      'stripe-signature': request.headers.get('stripe-signature') ? 'present' : 'missing',
      'user-agent': request.headers.get('user-agent'),
      'x-forwarded-proto': request.headers.get('x-forwarded-proto'),
      host: request.headers.get('host')
    });

    // For Stripe webhooks, we want to pass through to the API route
    if (isStripeWebhook) {
      console.log('🟢 Forwarding to Stripe webhook handler');
      return NextResponse.next();
    }

    // For other webhooks, return a simple response
    const response = new NextResponse(JSON.stringify({ received: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, stripe-signature, Authorization'
      }
    });
    
    // Handle OPTIONS request for CORS preflight
    if (method === 'OPTIONS') {
      return new NextResponse(null, { 
        status: 204, 
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, stripe-signature, Authorization',
          'Access-Control-Allow-Credentials': 'true'
        } 
      });
    }
    
    return response;
  }
  
  const debug = {
    ...globalThis.debug,
    log: (message: string, data?: any) => {
      if (!DEBUG.ENABLED) return;
      console.log(`${DEBUG.COLORS.info}${DEBUG.PREFIX} [${requestId}] ${message}${DEBUG.COLORS.reset}`, data || '');
    },
    success: (message: string, data?: any) => {
      if (!DEBUG.ENABLED) return;
      console.log(`${DEBUG.COLORS.success}✅ ${DEBUG.PREFIX} [${requestId}] ${message}${DEBUG.COLORS.reset}`, data || '');
    },
    warn: (message: string, data?: any) => {
      if (!DEBUG.ENABLED) return;
      console.warn(`${DEBUG.COLORS.warn}⚠️ ${DEBUG.PREFIX} [${requestId}] ${message}${DEBUG.COLORS.reset}`, data || '');
    },
    error: (message: string, error?: any) => {
      if (!DEBUG.ENABLED) return;
      console.error(`${DEBUG.COLORS.error}❌ ${DEBUG.PREFIX} [${requestId}] ${message}${DEBUG.COLORS.reset}`, error || '');
    },
  };

  debug.log('========== MIDDLEWARE START ==========');
  


  debug.log('Processing request:', {
    method,
    url: request.url,
    path,
    search: request.nextUrl.search,
  });
  
  const correctDomain = getCorrectDomain(request);
  
  debug.log('Processed request info:', {
    correctDomain,
    path,
    fullUrl: request.url,
    method,
    timestamp: new Date().toISOString(),
  });
  
  // Create the correct full URL
  const correctUrl = `${correctDomain}${path}${request.nextUrl.search}`;
  debug.log('Generated correct URL:', correctUrl);
  
    // ===== PUBLIC PATHS =====
  const publicPaths = [
    // Auth pages
    '/',
    '/login',
    '/signup',
    '/signup/company',
    '/signup/user',
    '/company-signup',
    '/reset-password',
    '/forgot-password',
    
    // API routes
    '/api/auth',
    '/api/stripe',
    '/api/webhook',
    '/api/webhooks',
    '/api/health',
    '/api/webhook-thin',
    '/api/webhook-snapshot',
    
    // Static assets
    '/_next',
    '/favicon.ico',
    '/images',
    '/fonts',
    '/robots.txt',
    '/sitemap.xml',
    
    // SEO
    '/sitemap',
    
    // Legal
    '/terms',
    '/privacy',
    '/cookies',
    
    // Status pages
    '/maintenance',
    '/500',
    '/404',
    
    // Webhooks (must be public)
    '/webhook',
    '/api/webhook',
    '/api/stripe/webhook',
    
    // Testing/debug
    '/debug',
    '/test',
    
    // Public API endpoints
    '/api/public',
  ];
  
  DEBUG.log('Public paths configured:', publicPaths);

  // ===== PATH CHECKING =====
  const isPathPublic = (() => {
    // Check exact matches first
    if (publicPaths.includes(path)) {
      DEBUG.log(`✅ Exact public path match: ${path}`);
      return true;
    }
    
    // Check path prefixes
    const isPublicByPrefix = publicPaths.some(publicPath => 
      path.startsWith(publicPath + '/') ||
      (publicPath.endsWith('*') && path.startsWith(publicPath.slice(0, -1)))
    );
    
    if (isPublicByPrefix) {
      DEBUG.log(`✅ Path matches public prefix: ${path}`);
      return true;
    }
    
    // Check file extensions
    const publicExtensions = [
      '.js', '.css', '.json', '.ico', '.png', 
      '.jpg', '.jpeg', '.svg', '.woff', '.woff2',
      '.ttf', '.eot', '.map', '.webp', '.avif'
    ];
    
    const hasPublicExtension = publicExtensions.some(ext => path.endsWith(ext));
    if (hasPublicExtension) {
      DEBUG.log(`✅ Path has public extension: ${path}`);
      return true;
    }
    
    DEBUG.log(`🔒 Path is not public: ${path}`);
    return false;
  })();
  
  if (isPathPublic) {
    DEBUG.log(`✅ Allowing access to public path: ${path}`);
    return NextResponse.next();
  }
  
  DEBUG.log(`🔐 Path requires authentication: ${path}`);

  // Additional paths that are allowed for specific user statuses
  const statusRestrictedPaths = {
    pending: ['/pending-approval', '/api/auth/logout'],
    inactive: ['/inactive-account', '/api/auth/logout'],
    rejected: ['/rejected-account', '/api/auth/logout'],
  };

  // Function to check if the path matches any public paths
  const isPublicPath = (path: string) => {
    // Check against the public paths
    const isPublic = publicPaths.some(publicPath => 
      path === publicPath || 
      path.startsWith(publicPath + '/') ||
      path.endsWith('.js') || 
      path.endsWith('.css') || 
      path.endsWith('.json') ||
      path.endsWith('.ico') ||
      path.endsWith('.png') ||
      path.endsWith('.jpg') ||
      path.endsWith('.jpeg') ||
      path.endsWith('.svg') ||
      path.endsWith('.woff2') ||
      path.endsWith('.map')
    );
    
    console.log('[EXTREME_DEBUG] Is public path?', { path, isPublic });
    return isPublic;
  };

  // Function to check if a path is allowed for a specific user status
  const isAllowedForStatus = (path: string, status: string): boolean => {
    const allowedPaths = statusRestrictedPaths[status as keyof typeof statusRestrictedPaths] || [];
    const isAllowed = allowedPaths.some(allowedPath => path === allowedPath);
    console.log('[EXTREME_DEBUG] Is path allowed for status?', { path, status, isAllowed, allowedPaths });
    return isAllowed;
  };

  // Skip middleware for API routes that don't require authentication
  if (path.startsWith('/api/')) {
    // Allow all /api/auth/* routes
    if (path.startsWith('/api/auth/')) {
      console.log('[EXTREME_DEBUG] Allowing API auth route:', path);
      return NextResponse.next();
    }
    
    // Allow specific API routes without authentication
    const allowedApiRoutes = [
      '/api/health',
      '/api/stripe',
      '/api/webhooks/stripe',
      '/api/users/count'
    ];
    
    if (allowedApiRoutes.some(route => path.startsWith(route))) {
      console.log('[EXTREME_DEBUG] Allowing public API route:', path);
      return NextResponse.next();
    }
  }

  // Allow access to public paths without authentication
  if (isPublicPath(path)) {
    console.log('[EXTREME_DEBUG] Public path access granted:', path);
    return NextResponse.next();
  }



  // ===== AUTH TOKEN EXTRACTION =====
  const authHeader = request.headers.get('Authorization') || '';
  const tokenFromCookie = request.cookies.get('token')?.value;
  const tokenFromHeader = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const finalToken = tokenFromCookie || tokenFromHeader;
  
  // Debug token extraction
  DEBUG.log('🔍 Auth token extraction:', {
    hasAuthHeader: !!authHeader,
    authHeaderPrefix: authHeader.substring(0, 20) + (authHeader.length > 20 ? '...' : ''),
    hasTokenCookie: !!tokenFromCookie,
    tokenFromHeaderExists: !!tokenFromHeader,
    finalTokenExists: !!finalToken,
    tokenLength: finalToken?.length || 0
  });
  
  // Debug all cookies
  const allCookies = request.cookies.getAll();
  DEBUG.cookie(allCookies);
  
  // Debug headers (excluding sensitive ones)
  DEBUG.headers(request.headers);
  
  // Log token details (safely)
  if (finalToken) {
    DEBUG.log('🔑 Token details:', {
      source: tokenFromCookie ? 'cookie' : 'header',
      length: finalToken.length,
      startsWith: finalToken.substring(0, 5) + '...',
      endsWith: '...' + finalToken.substring(finalToken.length - 5)
    });
  }
  
  if (!finalToken) {
    DEBUG.error('❌ NO AUTH TOKEN FOUND - REDIRECTING TO LOGIN');
    
    // Create login URL with callback
    const loginUrl = new URL('/login', correctDomain);
    const callbackUrl = request.nextUrl.pathname + request.nextUrl.search;
    
    if (callbackUrl && callbackUrl !== '/') {
      loginUrl.searchParams.set('callbackUrl', encodeURI(callbackUrl));
      DEBUG.log(`🔗 Setting callback URL: ${callbackUrl}`);
    }
    
    DEBUG.log(`🔄 Redirecting to: ${loginUrl.toString()}`);
    
    // Create response with debug headers
    const response = NextResponse.redirect(loginUrl);
    
    // Add debug headers
    response.headers.set('x-debug-auth', 'no-token');
    response.headers.set('x-debug-redirect', 'login');
    
    // Set a debug cookie to track the redirect
    response.cookies.set('debug_redirect', new Date().toISOString(), {
      path: '/',
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 // 1 minute
    });
    
    return response;
  }
  
  DEBUG.log('✅ TOKEN FOUND - VERIFYING');
  
  try {
    // ===== TOKEN VERIFICATION =====
    const encoder = new TextEncoder();
    const secretKey = encoder.encode(process.env.JWT_SECRET || 'organization-galaxy-secret-key');
    
    // Verify the token
    try {
      if (!finalToken) {
        throw new Error('No token provided for verification');
      }
      
      DEBUG.log('🔐 Starting JWT verification');
      DEBUG.log('🔑 JWT_SECRET:', process.env.JWT_SECRET ? '***SET***' : 'MISSING!');
      DEBUG.log('📏 Token length:', finalToken.length);
      
      const startTime = Date.now();
      const { payload } = await jwtVerify(finalToken, secretKey);
      const verifyTime = Date.now() - startTime;
      
      DEBUG.log(`✅ Token verified successfully in ${verifyTime}ms`);
      DEBUG.log('📋 Token payload:', {
        ...payload,
        // Don't log sensitive data
        email: payload.email ? '***@***.***' : undefined,
        sub: payload.sub ? '***' + payload.sub.slice(-4) : undefined
      });

      // Extract role and status from payload
      let userRole = String(payload.role || '').toLowerCase(); // Make role check case-insensitive
      let userStatus = String(payload.status || 'active'); // Default to active for backward compatibility
      const userId = String(payload.id || '');
      const companyCode = String(payload.companyCode || '');
      
      console.log('[EXTREME_DEBUG] 👤 Extracted user data:', {
        userId,
        userRole,
        userStatus,
        companyCode
      });

      // If token status is not active, fetch fresh status from /api/auth/check-status
      if (userStatus !== 'active') {
        console.log('[EXTREME_DEBUG] 🔄 User status is not active, fetching fresh status');
        try {
          const statusRes = await fetch(new URL('/api/auth/check-status', request.url), {
            headers: {
              Authorization: `Bearer ${finalToken}`,
              'Cache-Control': 'no-cache',
              Pragma: 'no-cache'
            },
            // Ensure we don't cache this fetch
            next: { revalidate: 0 }
          });
          
          console.log('[EXTREME_DEBUG] Status fetch response:', statusRes.status, statusRes.statusText);
          
          if (statusRes.ok) {
            const statusJson = await statusRes.json();
            console.log('[EXTREME_DEBUG] Status API response:', JSON.stringify(statusJson, null, 2));
            if (statusJson?.status) {
              const oldStatus = userStatus;
              userStatus = statusJson.status;
              console.log('[EXTREME_DEBUG] ✅ Updated status from', oldStatus, 'to', userStatus);
            }
          } else {
            console.warn('[EXTREME_DEBUG] ❌ Failed fresh status fetch:', statusRes.status);
          }
        } catch (err) {
          console.error('[EXTREME_DEBUG] ❌ Error fetching fresh status:', err);
        }
      }

      // Normalize role to handle inconsistent casing or formats
      const originalRole = userRole;
      if (userRole.includes('admin') || userRole.includes('superadmin')) {
        if (userRole.toLowerCase().includes('super')) {
          userRole = 'superadmin';
        } else {
          userRole = 'admin';
        }
      }
      
      console.log('[EXTREME_DEBUG] 🔄 Role normalization:', {
        originalRole,
        normalizedRole: userRole
      });
      
      // Special debug for dashboard access
      if (path.startsWith('/dashboard')) {
        console.log('[EXTREME_DEBUG] 🏠 Dashboard access attempt - Role:', userRole, 'Status:', userStatus);
      }
      
      // Debug output for admin routes
      if (path.startsWith('/dashboard/admin') || path.startsWith('/dashboard/superadmin')) {
        console.log('[EXTREME_DEBUG] 👑 Admin route access attempt:', path, '- Is user admin?', userRole === 'admin' || userRole === 'superadmin');
      }
      
      // Check if user is admin or superadmin - simplified check after normalization
      const isAdmin = userRole === 'admin' || userRole === 'superadmin';
                      
      console.log('[EXTREME_DEBUG] 👑 Admin status:', {
        isAdmin,
        userRole,
        isExactlyAdmin: userRole === 'admin',
        isExactlySuperAdmin: userRole === 'superadmin'
      });

      // ===== ONBOARDING CHECK =====
      // Check if user needs onboarding (only if not already on onboarding page)
      if (path !== '/onboarding' && path !== '/api/auth/logout' && !path.startsWith('/api/auth/')) {
        console.log('🔍 [MIDDLEWARE] Checking onboarding status for path:', path);
        
        try {
          // Fetch user's onboarding status from the database
          const host = request.headers.get('host') || '';
          const protocol = host.includes('localhost') ? 'http' : 'https';
          const baseUrl = `${protocol}://${host}`;
          const userUrl = new URL(`/api/users/profile`, baseUrl);
          
          console.log('🔍 [MIDDLEWARE] User URL:', userUrl.toString());
          console.log('🔍 [MIDDLEWARE] Token (first 20 chars):', finalToken?.substring(0, 20) + '...');
          
          const userRes = await fetch(userUrl, {
            headers: {
              Authorization: `Bearer ${finalToken}`,
              'Content-Type': 'application/json',
              'x-middleware-request': 'true'
            },
            next: { revalidate: 0 }
          });
          
          console.log('🔍 [MIDDLEWARE] User fetch response status:', userRes.status);
          
          if (userRes.ok) {
            const userData = await userRes.json();
            console.log('🔍 [MIDDLEWARE] User data retrieved:', JSON.stringify(userData, null, 2));
            console.log('🔍 [MIDDLEWARE] Onboarding field value:', userData.onboarding);
            console.log('🔍 [MIDDLEWARE] Onboarding field type:', typeof userData.onboarding);
            console.log('🔍 [MIDDLEWARE] Department field:', userData.department);
            console.log('🔍 [MIDDLEWARE] ReportsTo field:', userData.reportsTo);
            
            // Check if user needs onboarding (ONLY for active users)
            // Pending users should go to pending approval page, not onboarding
            const userStatus = userData.status;
            const onboardingField = userData.onboarding;
            const firstName = userData.firstName || '';
            const lastName = userData.lastName || '';
            
            console.log('🔍 [MIDDLEWARE] User status:', userStatus);
            
            if (userStatus === 'active') {
              // Only check onboarding for active users
              // 1. If onboarding field is false, redirect
              // 2. If onboarding field is missing/undefined, check firstName and lastName
              //    If both are empty, redirect to onboarding (user hasn't completed profile)
              const needsOnboarding = onboardingField === false || 
                                    (onboardingField === undefined && firstName === '' && lastName === '');
              
              if (needsOnboarding) {
                console.log('🚨 [MIDDLEWARE] Active user needs onboarding! Redirecting to /onboarding');
                console.log('🚨 [MIDDLEWARE] Reason: onboarding =', onboardingField, 'firstName =', firstName, 'lastName =', lastName);
                return NextResponse.redirect(new URL('/onboarding', request.url));
              } else {
                console.log('✅ [MIDDLEWARE] Active user has completed onboarding');
                console.log('✅ [MIDDLEWARE] onboarding =', onboardingField, 'firstName =', firstName, 'lastName =', lastName);
              }
            } else {
              console.log('🕰️ [MIDDLEWARE] User status is not active (' + userStatus + '), skipping onboarding check');
            }
          } else {
            const errorText = await userRes.text();
            console.log('❌ [MIDDLEWARE] Failed to fetch user data:', userRes.status, errorText);
          }
        } catch (onboardingError) {
          console.error('❌ [MIDDLEWARE] Error checking onboarding status:', onboardingError);
          // Don't block access if there's an error checking onboarding
        }
      } else {
        console.log('⏭️ [MIDDLEWARE] Skipping onboarding check for path:', path);
      }
      
      // Redirect non-admin users trying to access the main dashboard to employee dashboard
      if (path === '/dashboard' && !isAdmin) {
        console.log('[EXTREME_DEBUG] 🔄 Non-admin user trying to access main dashboard, redirecting to employee dashboard');
        return NextResponse.redirect(new URL('/dashboard/employeedashboard', request.url));
      }

      // Bypass control pages to prevent loops (account-inactive, subscription-required, upgrade-plan)
      const bypassPaths = ['/account-inactive', '/subscription-required', '/upgrade-plan'];
      if (bypassPaths.includes(path)) {
        console.log('[EXTREME_DEBUG] 🔄 On control page, skipping fetch and rules for:', path);
        return NextResponse.next();
      }

      // Fetch subscription and counts from your API with caching
      console.log('[EXTREME_DEBUG] 💳 Fetching subscription/count for company:', companyCode);
      const fetchStart = Date.now();
      
      // Use the request's host header or fallback to the current origin
      const host = request.headers.get('host') || '';
      const protocol = host.includes('localhost') ? 'http' : 'https';
      const baseUrl = `${protocol}://${host}`;
      
      const countUrl = new URL(`/api/users/count?companyCode=${companyCode}`, baseUrl);
      console.log('[EXTREME_DEBUG] 💳 Count API URL:', countUrl.toString());
      
      let subscriptionFromApi: any = null;
      let activeCount = 0;
      let planLimit = Infinity;
      let fetchError = null;
      
      try {
        console.log('[EXTREME_DEBUG] 💳 Starting fetch to:', countUrl.toString());
        console.log('[EXTREME_DEBUG] 💳 Request headers:', JSON.stringify(Object.fromEntries(request.headers.entries()), null, 2));
        
        const countRes = await fetch(countUrl, {
          headers: {
            ...Object.fromEntries(request.headers.entries()),
            'x-middleware-request': 'true' // Add a header to identify this as a middleware request
          },
          next: { revalidate: 60 }
        });
        
        const fetchDuration = Date.now() - fetchStart;
        console.log('[EXTREME_DEBUG] 💳 Fetch completed in', fetchDuration, 'ms with status:', countRes.status);
        
        if (countRes.ok) {
          try {
            const data = await countRes.json();
            console.log('[EXTREME_DEBUG] 💳 Count API response:', JSON.stringify(data, null, 2));
            activeCount = data.count || 0;
            subscriptionFromApi = data.subscription;
            planLimit = subscriptionFromApi?.userLimit ?? Infinity;
            console.log('[EXTREME_DEBUG] 💳 Parsed data:', { activeCount, planLimit, hasSubscription: !!subscriptionFromApi });
          } catch (parseError: unknown) {
            const responseText = await countRes.text();
            const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown error';
            console.error('[EXTREME_DEBUG] 💳 ❌ Failed to parse count API response:', parseError);
            console.error('[EXTREME_DEBUG] 💳 ❌ Response text:', responseText);
            fetchError = `Parse Error: ${errorMessage}`;
          }
        } else {
          const errorText = await countRes.text().catch(e => 'Failed to read error response');
          fetchError = `HTTP ${countRes.status} ${countRes.statusText}`;
          console.error('[EXTREME_DEBUG] 💳 ❌ Failed to fetch count API:', countRes.status, countRes.statusText);
          console.error('[EXTREME_DEBUG] 💳 ❌ Error response:', errorText);
        }
      } catch (err: unknown) {
        const error = err as NodeJS.ErrnoException;
        fetchError = error instanceof Error ? error.message : String(error);
        console.error('[EXTREME_DEBUG] 💳 ❌ Exception during count API fetch:', error);
        console.error('[EXTREME_DEBUG] 💳 ❌ Error details:', {
          name: error?.name,
          message: error?.message,
          stack: error?.stack,
          code: error?.code,
          errno: error?.errno,
          syscall: error?.syscall
        });
      }
      
      // Derive paid status: active or canceled within current period end
      const now = Date.now();
      let paid = false;
      const subscriptionStatus = subscriptionFromApi?.status;
      const periodEnd = subscriptionFromApi?.currentPeriodEnd ? new Date(subscriptionFromApi.currentPeriodEnd).getTime() : 0;
      
      console.log('[EXTREME_DEBUG] 💳 Subscription analysis:', {
        subscriptionStatus,
        currentPeriodEnd: subscriptionFromApi?.currentPeriodEnd,
        periodEndTimestamp: periodEnd,
        nowTimestamp: now,
        isInGracePeriod: subscriptionStatus === 'canceled' && subscriptionFromApi?.cancelAtPeriodEnd && periodEnd > now,
        hasSubscriptionData: !!subscriptionFromApi
      });
      
      if (subscriptionStatus === 'active') {
        paid = true;
        console.log('[EXTREME_DEBUG] 💳 ✅ Paid: Active subscription');
      } else if (subscriptionStatus === 'canceled' && subscriptionFromApi?.cancelAtPeriodEnd && periodEnd > now) {
        paid = true;
        console.log('[EXTREME_DEBUG] 💳 ✅ Paid: Canceled but in grace period until', subscriptionFromApi.currentPeriodEnd);
      } else {
        console.log('[EXTREME_DEBUG] 💳 ❌ Not paid:', { subscriptionStatus, periodEnd, now });
      }
      
      console.log('[EXTREME_DEBUG] 💳 Final subscription state:', {
        paid,
        activeCount,
        planLimit,
        fetchError,
        isOverLimit: activeCount > planLimit
      });

      // CRITICAL DEBUG: Log all the factors that will determine redirects
      console.log('[EXTREME_DEBUG] 🚦 REDIRECT DECISION FACTORS:');
      console.log('[EXTREME_DEBUG] 🚦 - isAdmin:', isAdmin);
      console.log('[EXTREME_DEBUG] 🚦 - paid:', paid);
      console.log('[EXTREME_DEBUG] 🚦 - userStatus:', userStatus);
      console.log('[EXTREME_DEBUG] 🚦 - activeCount:', activeCount);
      console.log('[EXTREME_DEBUG] 🚦 - planLimit:', planLimit);
      console.log('[EXTREME_DEBUG] 🚦 - path:', path);
      console.log('[EXTREME_DEBUG] 🚦 - fetchError:', fetchError);

      // FIXED: Rule 1: Non-admin and unpaid users -> /account-inactive (but not during fetch errors)
      if (!isAdmin && !paid && userStatus === 'active' && !fetchError) {
        console.log('[EXTREME_DEBUG] 🚦 ❌ RULE 1: Non-admin unpaid (with working API), redirecting to /account-inactive');
        return NextResponse.redirect(new URL('/account-inactive', request.url));
      } else if (!isAdmin && !paid && fetchError) {
        console.log('[EXTREME_DEBUG] 🚦 ⚠️ RULE 1: Non-admin unpaid but API fetch failed, allowing temporary access');
      }

      // FIXED: Rule 2: Admin unpaid -> only billing, subscription, and upgrade-plan pages (but handle fetch errors gracefully)
      if (isAdmin && !paid && !fetchError) {
        console.log('[EXTREME_DEBUG] 🚦 ⚠️ RULE 2: Admin unpaid (with working API) - checking allowed pages');
        // Allow any billing page under /billing or /dashboard/billing, subscription-required, upgrade-plan, and stripe-api subscription endpoints
        const isBillingPage = path.includes('/billing');
        const isSubscriptionPage = path === '/subscription-required' || path === '/upgrade-plan';
        const isStripeSubsApi = path.startsWith('/api/stripe/subscriptions');
        const isDashboard = path === '/dashboard';
        
        console.log('[EXTREME_DEBUG] 🚦 RULE 2: Page type check:', {
          isBillingPage,
          isSubscriptionPage,
          isStripeSubsApi,
          isDashboard
        });
        
        if (isBillingPage || isSubscriptionPage || isStripeSubsApi || isDashboard) {
          console.log('[EXTREME_DEBUG] 🚦 ✅ RULE 2: Admin unpaid accessing allowed route:', path);
          return NextResponse.next();
        }
        console.log('[EXTREME_DEBUG] 🚦 ❌ RULE 2: Redirecting unpaid admin to /subscription-required');
        return NextResponse.redirect(new URL('/subscription-required', request.url));
      } else if (isAdmin && !paid && fetchError) {
        console.log('[EXTREME_DEBUG] 🚦 ⚠️ RULE 2: Admin unpaid but API fetch failed, allowing temporary access');
      }

      // Rule 3a: Non-admin users over plan limit -> /account-inactive
      if (!isAdmin && activeCount > planLimit && !fetchError) {
        console.log('[EXTREME_DEBUG] 🚦 ❌ RULE 3a: Non-admin over plan limit, redirecting to /account-inactive');
        if (path !== '/account-inactive') {
          return NextResponse.redirect(new URL('/account-inactive', request.url));
        }
      }

      // Rule 3: Paid users over plan limit -> /upgrade-plan
      if (paid && activeCount > planLimit && !fetchError) {
        console.log('[EXTREME_DEBUG] 🚦 ⚠️ RULE 3: Over plan limit, checking access');
        // Allow access to billing pages for admins even when over plan limit
        if (isAdmin && (path.startsWith('/billing') || path.startsWith('/dashboard/billing'))) {
          console.log('[EXTREME_DEBUG] 🚦 ✅ RULE 3: Allowing admin access to billing while over limit');
          return NextResponse.next();
        }
        // Redirect non-admins or non-billing pages to upgrade plan
        if (!path.startsWith('/billing') && path !== '/upgrade-plan') {
          console.log('[EXTREME_DEBUG] 🚦 ❌ RULE 3: Redirecting to /upgrade-plan');
          return NextResponse.redirect(new URL('/upgrade-plan', request.url));
        }
      }

      // Admin override: only active admins can access directly
      if (isAdmin) {
        console.log('[EXTREME_DEBUG] 👑 ADMIN OVERRIDE: Checking admin status');
        if (userStatus !== 'active') {
          console.log('[EXTREME_DEBUG] 👑 ❌ Admin with status', userStatus, 'redirected to pending-approval');
          return NextResponse.redirect(new URL('/pending-approval', request.url));
        }
        console.log('[EXTREME_DEBUG] 👑 ✅ Active admin access granted for path:', path);
        // For API requests, attach headers
        if (path.startsWith('/api/')) {
          const requestHeaders = new Headers(request.headers);
          requestHeaders.set('x-user-role', userRole);
          requestHeaders.set('x-user-status', userStatus);
          if (companyCode) {
            requestHeaders.set('x-company-code', companyCode);
          }
          console.log('[EXTREME_DEBUG] 👑 ✅ Adding headers for API request');
          return NextResponse.next({ request: { headers: requestHeaders } });
        }
        return NextResponse.next();
      }
      
      // ========== STATUS-BASED ACCESS CONTROL ==========
      // For non-admin users, enforce strict status restrictions
      console.log('[EXTREME_DEBUG] 👤 NON-ADMIN STATUS CHECK: userStatus =', userStatus);
      
      // Handle rejected users - only allow access to /rejected-account and logout
      if (userStatus === 'rejected') {
        console.log('[EXTREME_DEBUG] 👤 REJECTED USER: Checking allowed paths');
        // If trying to access a page that's not allowed for rejected users, redirect
        if (!isAllowedForStatus(path, 'rejected')) {
          console.log('[EXTREME_DEBUG] 👤 ❌ Rejected user redirected from', path);
          return NextResponse.redirect(new URL('/rejected-account', request.url));
        }
      }
      
      // Handle pending users - only allow access to /pending-approval and logout
      if (userStatus === 'pending') {
        console.log('[EXTREME_DEBUG] 👤 PENDING USER: Checking allowed paths');
        if (isAllowedForStatus(path, 'pending')) {
          console.log('[EXTREME_DEBUG] 👤 ✅ Pending user access granted for pending-approval page:', path);
          return NextResponse.next();
        } else {
          console.log('[EXTREME_DEBUG] 👤 ❌ Pending user redirected from', path, 'to pending-approval');
          return NextResponse.redirect(new URL('/pending-approval', request.url));
        }
      }
      
      // Handle inactive users - only allow access to /inactive-account and logout
      if (userStatus === 'inactive') {
        console.log('[EXTREME_DEBUG] 👤 INACTIVE USER: Checking allowed paths');
        // If trying to access a page that's not allowed for inactive users, redirect
        if (!isAllowedForStatus(path, 'inactive')) {
          console.log('[EXTREME_DEBUG] 👤 ❌ Inactive user redirected from', path);
          return NextResponse.redirect(new URL('/inactive-account', request.url));
        }
      }
      
      // Only active users should be able to access protected resources past this point
      if (userStatus !== 'active') {
        console.log('[EXTREME_DEBUG] 👤 ❌ NON-ACTIVE USER attempted to access', path, 'with status', userStatus);
        
        // Redirect to appropriate status page based on user status
        if (userStatus === 'pending') {
          return NextResponse.redirect(new URL('/pending-approval', request.url));
        } else if (userStatus === 'inactive') {
          return NextResponse.redirect(new URL('/inactive-account', request.url));
        } else if (userStatus === 'rejected') {
          return NextResponse.redirect(new URL('/rejected-account', request.url));
        } else {
          // Default fallback for any other status
          console.log('[EXTREME_DEBUG] 👤 ❌ Unknown status, redirecting to login');
          return NextResponse.redirect(new URL('/login', request.url));
        }
      }
      
      // Require companyCode for API access (except for admins, which we already handled)
      if (!companyCode && path.startsWith('/api/')) {
        console.log('[EXTREME_DEBUG] 🏢 ❌ No company code for API access');
        return NextResponse.json(
          { error: 'No company code found in token' },
          { status: 403 }
        );
      }

      // Restrict access to admin routes for non-admin users
      if ((path.startsWith('/dashboard/admin/') || path.startsWith('/dashboard/superadmin/'))) {
        console.log('[EXTREME_DEBUG] 👤 ❌ Non-admin attempting to access admin route, redirecting');
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }

      // Restrict access to invite page for non-admin users
      if ((path === '/dashboard/invite' || path === '/invite') && !isAdmin) {
        console.log('[EXTREME_DEBUG] 👤 ❌ Non-admin attempting to access invite page, redirecting');
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }

      // For API requests, add company info to headers for database selection
      if (path.startsWith('/api/')) {
        console.log('[EXTREME_DEBUG] 🔌 Adding headers for API request');
        const requestHeaders = new Headers(request.headers);
        requestHeaders.set('x-company-code', companyCode || '');
        requestHeaders.set('x-user-role', userRole);
        requestHeaders.set('x-user-status', userStatus);
        
        return NextResponse.next({
          request: {
            headers: requestHeaders,
          },
        });
      }

      // Check if token is expired
      const currentTime = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < currentTime) {
        console.log(`[EXTREME_DEBUG] ❌ TOKEN EXPIRED - EXP: ${new Date(payload.exp * 1000).toISOString()}, NOW: ${new Date().toISOString()}`);
        throw new Error('Token expired');
      }

      // Only active users can proceed past this point
      if (userStatus === 'active') {
        console.log('[EXTREME_DEBUG] 👤 ✅ Access granted to active user');
        return NextResponse.next();
      } else {
        // If we somehow got here with a non-active status, redirect to login
        console.log('[EXTREME_DEBUG] 👤 ❌ Non-active user caught by final check, redirecting to login');
        return NextResponse.redirect(new URL('/login', request.url));
      }
      
    } catch (error) {
      DEBUG.error('❌ TOKEN VERIFICATION FAILED:', error);
      
      // Log detailed error information
      if (error instanceof Error) {
        DEBUG.error('Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack?.split('\n').slice(0, 3).join('\n') + '...'
        });
      }
      
      // Create error response
      const response = NextResponse.redirect(new URL('/login', request.url));
      
      // Add debug headers
      response.headers.set('x-debug-auth', 'token-verification-failed');
      response.headers.set('x-debug-error', error instanceof Error ? error.message : 'Unknown error');
      
      // Clear invalid token
      response.cookies.set({
        name: 'token',
        value: '',
        path: '/',
        expires: new Date(0)
      });
      
      return response;
    }
  } catch (error) {
    console.error('[EXTREME_DEBUG] ❌ Auth middleware error:', error);
  }
}

// Explicitly configure matcher to run on all routes except Next.js static files
export const config = {
  matcher: [
    // Match all request paths except for the ones starting with:
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico (favicon file)
    // - api (API routes are handled by their own middleware)
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ]
};

// Create a separate matcher for webhook paths
const webhookMatcher = {
  matcher: [
    ...WEBHOOK_PATHS.map(path => `${path}(/.*)?`),
    // Also match all API routes that start with /api/webhooks
    '/api/webhooks/:path*',
    '/api/stripe/webhook',
    '/stripe/webhook',
    '/webhook'
  ]
};

// Export both matchers
export { webhookMatcher };