import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
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
      // Find overworked employees (sum of job responsibilities > 50 hours)
      const underutilizedEmployees = await companyDb.collection('users').aggregate([
        {
          $match: { status: 'active' }
        },
        {
          $project: {
            _id: 1,
            firstName: 1,
            lastName: 1,
            email: 1,
            jobResponsibilities: 1,
            totalHours: {
              $sum: '$jobResponsibilities.hours'
            }
          }
        },
        {
          $match: {
            totalHours: { $lt: 30 }
          }
        }
      ]).toArray();
      
      return NextResponse.json(underutilizedEmployees);
      
    } finally {
      await client.close();
    }
    
  } catch (error: any) {
    console.error('Error fetching overworked employees:', error);
    return NextResponse.json(
      { error: 'Failed to fetch overworked employees', details: error.message },
      { status: 500 }
    );
  }
}
