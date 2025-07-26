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

    // Connect to the company database
    const { companyDb } = await connectToCompanyDb(companyCode);
    
    // Get total active employees
    const totalEmployees = await companyDb.collection('users')
      .countDocuments({ status: 'active' });
    
    // Get active projects
    const activeProjects = await companyDb.collection('projects')
      .countDocuments({ status: { $ne: 'completed' } });
    
    return NextResponse.json({
      totalEmployees,
      activeProjects
    });
    
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
