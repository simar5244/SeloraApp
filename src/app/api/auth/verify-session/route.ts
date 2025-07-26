import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/dbConnect';
import { getUserModel } from '@/models/User';
import { generateToken } from '@/lib/auth';
import { sendWelcomeEmailToNewUser } from '@/lib/mfa';

interface SessionData {
  session_id: string;
  company_code: string;
  email: string;
}

// Helper function to get the correct base URL (matching working billing portal approach)
const getBaseUrl = (request: NextRequest) => {
  console.log('\n=== DEBUG: getBaseUrl called in verify-session ===');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  
  // Use the same approach as the working billing portal - check origin header first
  const origin = request.headers.get('origin');
  if (origin && !origin.includes('localhost:8080')) {
    console.log(`[DEBUG] Using origin header: ${origin}`);
    return origin;
  }
  
  // 1. First check NEXT_PUBLIC_APP_URL (should be set in Railway environment)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    console.log(`[DEBUG] Using NEXT_PUBLIC_APP_URL: ${process.env.NEXT_PUBLIC_APP_URL}`);
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  // 2. Check if we're in development mode
  const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
  if (isDev) {
    const devUrl = 'http://localhost:3000';
    console.log(`[DEBUG] Development mode, using: ${devUrl}`);
    return devUrl;
  }
  
  // 3. Try to get from request headers
  const host = request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') || 'https';
  
  if (host && !host.includes('localhost') && !host.includes('0.0.0.0')) {
    const url = `${proto}://${host}`;
    console.log(`[DEBUG] Using request headers for URL: ${url}`);
    return url;
  }
  
  // 4. Fallback to BASE_URL or default production URL
  const fallbackUrl = process.env.BASE_URL || 'https://app.seloraa.com';
  console.log(`[DEBUG] Using fallback URL: ${fallbackUrl}`);
  return fallbackUrl;
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id');
    const companyCode = searchParams.get('company_code');
    const email = searchParams.get('email');

    if (!sessionId || !companyCode || !email) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Connect to the company's database via default connector
    console.log('Connecting to tenant DB for company:', companyCode);
    await connectDB(companyCode);

    // Instantiate the tenant-specific User model
    const TenantUser = getUserModel(companyCode);
    // Find the user in the company's database
    const user = await TenantUser.findOne({ email });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Send welcome email
    await sendWelcomeEmailToNewUser(user.email, user.username);

    // Generate JWT token
    const token = generateToken({
      userId: user._id,
      email: user.email,
      companyCode: user.companyCode,
      role: user.role,
    });

    // Get the correct base URL for the redirect (THIS IS THE FIX!)
    const baseUrl = getBaseUrl(req);
    console.log('\n[DEBUG] verify-session: Using baseUrl for redirect:', baseUrl);
    console.log('[DEBUG] verify-session: Request headers:', JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2));
    console.log('[DEBUG] verify-session: Original req.url:', req.url);
    console.log('[DEBUG] verify-session: Process env NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL);

    // Redirect back to signup page with success status and company code
    const response = NextResponse.redirect(
      new URL(
        `/company-signup?success=true&company_code=${encodeURIComponent(companyCode)}`,
        baseUrl  // Using baseUrl instead of req.url - THIS IS THE KEY FIX!
      )
    );

    // Set the JWT as an HTTP-only cookie
    response.cookies.set({
      name: 'token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Error verifying session:', error);
    return NextResponse.json(
      { error: 'Failed to verify session' },
      { status: 500 }
    );
  }
}
