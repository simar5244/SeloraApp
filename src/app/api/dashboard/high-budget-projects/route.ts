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
      // Find all high budget projects (total_budget >= 50000) without any user-based filtering
      const highBudgetProjects = await companyDb.collection('projects')
        .find({ 
          total_budget: { $gte: 50000 },
          status: { $ne: 'completed' } // Only include active projects
        }, {
          projection: {
            _id: 1,
            project_title: 1,
            project_description: 1,
            start_date: 1,
            end_date: 1,
            status: 1,
            priority: 1,
            employees: 1,
            total_budget: 1,
            created_at: 1
          }
        })
        .sort({ total_budget: -1 })
        .toArray();
      
      // Map to expected format
      const formattedProjects = highBudgetProjects.map(project => ({
        _id: project._id,
        title: project.project_title,
        description: project.project_description,
        startDate: project.start_date,
        endDate: project.end_date,
        status: project.status,
        priority: project.priority,
        teamMembers: project.employees || [],
        budget: project.total_budget || 0,
        createdAt: project.created_at
      }));
      
      return NextResponse.json(formattedProjects);
      
    } finally {
      await client.close();
    }
    
  } catch (error: any) {
    console.error('Error fetching high budget projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch high budget projects', details: error.message },
      { status: 500 }
    );
  }
}
