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
      // Find employees with high attrition risk (string match for 'high' or above)
      const highAttritionEmployees = await companyDb.collection('users').aggregate([
        {
          $match: {
            'attritionAssessment.attrition_risk': { $in: ['high', 'critical'] },
            status: 'active'
          }
        },
        {
          $project: {
            _id: 1,
            firstName: 1,
            lastName: 1,
            email: 1,
            attritionRisk: '$attritionAssessment.attrition_risk',
            attrition_score: '$attritionAssessment.attrition_score',
            primary_explanation: '$attritionAssessment.primary_explanation',
            jobTitle: 1,
            department: 1,
            lastUpdated: 1,
            attritionAssessment: 1
          }
        },
        { $sort: { lastName: 1 } }
      ]).toArray();
      
      return NextResponse.json(highAttritionEmployees);
      
    } finally {
      await client.close();
    }
    
  } catch (error: any) {
    console.error('Error in high attrition employees endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to fetch high attrition employees', details: error.message },
      { status: 500 }
    );
  }
}
