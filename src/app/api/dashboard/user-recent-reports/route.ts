import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { connectToCompanyDb } from '@/lib/companyDb';

export async function GET(request: NextRequest) {
  try {
    // Get token from cookies or authorization header
    const cookieToken = request.cookies.get('token')?.value;
    const headerToken = request.headers.get('authorization')?.split(' ')[1];
    const token = cookieToken || headerToken || '';
    
    if (!token) {
      return NextResponse.json({ error: 'No authentication token provided' }, { status: 401 });
    }
    
    // Verify authentication and get user info
    const authResult = await verifyAuth(token);
    if (!authResult) {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }
    
    const { companyCode, email } = authResult;
    if (!companyCode || !email) {
      return NextResponse.json({ error: 'Company code or user email not found' }, { status: 400 });
    }
    
    // Connect to the company-specific database
    const { client, companyDb } = await connectToCompanyDb(companyCode);
    
    try {
      // Get most recent 2 reports
      const recentReports = await companyDb.collection('saved_reports')
        .find({})
        .sort({ createdAt: -1 })
        .limit(2)
        .toArray();
      
      return NextResponse.json(recentReports);
      
    } finally {
      await client.close();
    }
    
  } catch (error: any) {
    console.error('Error fetching user recent reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user reports', details: error.message },
      { status: 500 }
    );
  }
}
