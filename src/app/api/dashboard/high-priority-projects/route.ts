import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { verifyAuth } from '@/lib/auth';
import { connectToCompanyDb } from '@/lib/companyDb';
import { ObjectId, Filter } from 'mongodb';

interface ProjectMember {
  _id: string;
  name: string;
  email: string;
  role: string;
  hours_per_week: number;
  join_date: Date;
  status: 'active' | 'inactive' | 'on_leave';
}

interface Project {
  _id: ObjectId;
  project_title: string;
  project_description?: string;
  start_date: Date | string;
  end_date?: Date | string | 'ongoing';
  department: string;
  status: 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  total_budget?: number;
  employees: ProjectMember[];
  viewers: ProjectMember[];
  created_at: Date;
  updated_at: Date;
  visibleToAll?: boolean;
}

export async function GET(request: NextRequest) {
  noStore();
  console.log('=== High Priority Projects API Called ===');
  
  try {
    // Get token from cookies or authorization header
    const cookieToken = request.cookies.get('token')?.value;
    const headerToken = request.headers.get('authorization')?.split(' ')[1];
    const token = cookieToken || headerToken || '';
    
    console.log('Auth token found:', !!token);
    console.log('Token source:', cookieToken ? 'cookie' : headerToken ? 'header' : 'none');
    
    if (!token) {
      return NextResponse.json({ error: 'No authentication token provided' }, { status: 401 });
    }
    
    // Verify authentication and get company code and user ID
    console.log('Verifying auth token...');
    const authResult = await verifyAuth(token);
    console.log('Auth result:', authResult ? 'Success' : 'Failed');
    
    if (!authResult) {
      console.error('Authentication failed: Invalid or expired token');
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }
    
    const { companyCode, userId, email: userEmail } = authResult;
    console.log('Auth details:', { companyCode, userId, userEmail });
    
    if (!companyCode || !userId || !userEmail) {
      console.error('Missing auth data:', { 
        hasCompanyCode: !!companyCode, 
        hasUserId: !!userId,
        hasUserEmail: !!userEmail
      });
      return NextResponse.json(
        { error: 'Company code, user ID, or email not found in token' },
        { status: 400 }
      );
    }
    
    // Connect to the company-specific database
    console.log(`Connecting to company database: ${companyCode}`);
    const { client, companyDb } = await connectToCompanyDb(companyCode);
    
    try {
      // Build the query to find high/critical priority projects that the user has access to
      const query: Filter<Project> = {
        $and: [
          { priority: { $in: ['high', 'critical'] as const } },
          {
            $or: [
              { 'employees.email': userEmail },
              { 'viewers.email': userEmail },
              { visibleToAll: true }
            ]
          }
        ]
      };
      
      console.log('Executing high priority projects query:', JSON.stringify(query, null, 2));
      
      // Execute the query with proper typing
      const projects = await companyDb.collection<Project>('projects')
        .find(query)
        .sort({ priority: 1, start_date: 1 })
        .toArray();
      
      console.log(`Found ${projects.length} high/critical priority projects for user ${userEmail}`);
      
      // Format the response
      console.log('Processing high priority projects...');
      const formattedProjects = projects.map((project) => {
        // Format dates
        const formatDate = (date: Date | string | undefined): string => {
          if (!date || date === 'ongoing') return 'ongoing';
          const d = new Date(date);
          return isNaN(d.getTime()) ? 'ongoing' : d.toISOString();
        };
        
        // Get user's role and hours if they are a team member
        const userRole = project.employees?.find((e) => e.email === userEmail) || 
                        project.viewers?.find((v) => v.email === userEmail);
        
        return {
          _id: project._id.toString(),
          title: project.project_title || 'Unnamed Project',
          description: project.project_description || '',
          startDate: formatDate(project.start_date),
          endDate: formatDate(project.end_date),
          status: project.status,
          priority: project.priority,
          budget: project.total_budget,
          teamMembers: project.employees?.map(member => ({
            _id: member._id,
            firstName: member.name?.split(' ')[0] || '',
            lastName: member.name?.split(' ').slice(1).join(' ') || member.name || '',
            email: member.email
          })) || []
        };
      });
      
      console.log(`Returning ${formattedProjects.length} formatted high priority projects`);
      return NextResponse.json(formattedProjects);
      
    } catch (error) {
      console.error('Error in high priority projects API:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
      
      return NextResponse.json(
        { 
          error: 'Failed to fetch high priority projects',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    } finally {
      // Close the database connection
      await client.close();
      console.log('=== High Priority Projects API Completed ===\n');
    }
  } catch (error: any) {
    console.error('Error in high priority projects endpoint:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return NextResponse.json(
      { error: 'Failed to fetch high priority projects', details: error.message },
      { status: 500 }
    );
  }
}
