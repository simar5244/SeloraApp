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
      // Get the most recent 5 integration history records
      // First, get the raw data without projection to see all fields
      const rawData = await companyDb.collection('integration_history')
        .find({})
        .sort({ timestamp: -1 })
        .limit(5)
        .toArray();
      
      console.log('Raw MongoDB data:', JSON.stringify(rawData, null, 2));
      
      // Then map to the fields we want
      const integrationHistory = rawData.map(item => ({
        type: item.type || item.integrationType || 'Unknown',
        filename: item.filename || item.fileName || 'No filename',
        timestamp: item.timestamp || item.date || item.createdAt || new Date().toISOString()
      }));
      
      console.log('Processed integration history:', JSON.stringify(integrationHistory, null, 2));
      
      return NextResponse.json(integrationHistory);
      
    } catch (err) {
      console.error('Database error:', err);
      return NextResponse.json(
        { error: 'Failed to fetch integration history' },
        { status: 500 }
      );
    } finally {
      await client.close();
    }
    
  } catch (err) {
    console.error('Error in integration-history endpoint:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Prevent other HTTP methods
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PATCH() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
