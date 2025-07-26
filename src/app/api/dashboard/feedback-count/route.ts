import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
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
    
    // Verify authentication and get company code
    const authResult = await verifyAuth(token);
    if (!authResult) {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }
    
    const { companyCode } = authResult;
    if (!companyCode) {
      return NextResponse.json({ error: 'Company code not found' }, { status: 400 });
    }
    
    // Connect to the company-specific database
    const { companyDb } = await connectToCompanyDb(companyCode);
    
    // Get current quarter and year for the metrics key (e.g., 'Q2-2023')
    const now = new Date();
    const currentQuarter = Math.floor(now.getMonth() / 3) + 1;
    const currentYear = now.getFullYear();
    const quarterKey = `Q${currentQuarter}-${currentYear}`;
    
    // Get the user's feedback metrics
    const user = await companyDb.collection('users').findOne(
      { _id: new ObjectId(authResult.userId) },
      { projection: { 'feedbackMetrics.quarterlyGiven': 1 } }
    );
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Get the count for current quarter or default to 0
    const feedbackCount = user.feedbackMetrics?.quarterlyGiven?.[quarterKey]?.count || 0;
    
    return NextResponse.json({ 
      count: feedbackCount,
      quarter: quarterKey
    });
    
  } catch (error: any) {
    console.error('Error counting feedbacks:', error);
    return NextResponse.json(
      { error: 'Failed to count feedbacks', details: error.message },
      { status: 500 }
    );
  }
}
