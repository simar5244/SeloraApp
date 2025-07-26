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
    const { client, companyDb } = await connectToCompanyDb(companyCode);
    
    try {
      // Find employees with low feedback (average rating <= 2)
      const lowFeedbackEmployees = await companyDb.collection('users').aggregate([
        {
          $match: { 
            status: 'active',
            'feedbackMetrics.received.averageRating': { $lte: 2 }
          }
        },
        {
          $project: {
            _id: 1,
            firstName: 1,
            lastName: 1,
            email: 1,
            averageRating: '$feedbackMetrics.received.averageRating',
            weightedRating: '$feedbackMetrics.received.weightedAverageRating',
            feedbackCount: { $ifNull: ['$feedbackMetrics.received.count', 0] },
            lastFeedbackDate: {
              $ifNull: [
                { $max: '$feedback.date' },
                null
              ]
            }
          }
        },
        {
          $sort: { averageRating: 1 } // Sort by lowest rating first
        }
      ]).toArray();
      
      return NextResponse.json(lowFeedbackEmployees);
      
    } finally {
      await client.close();
    }
    
  } catch (error: any) {
    console.error('Error fetching low feedback employees:', error);
    return NextResponse.json(
      { error: 'Failed to fetch low feedback employees', details: error.message },
      { status: 500 }
    );
  }
}
