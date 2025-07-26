import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { verifyAuth } from '@/lib/auth';
import { connectToCompanyDb } from '@/lib/companyDb';
import { ObjectId } from 'mongodb';

interface EmployeeContribution {
  employee_id: string;
  role: string;
  hours_per_week: number;
  start_date: Date;
  end_date?: Date;
  active: boolean;
  name?: string;
  email?: string;
  department?: string;
}

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
}

export async function GET(request: NextRequest) {
  noStore();
  console.log('=== Employee Projects API Called ===');
  
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
    
    const { companyCode, userId } = authResult;
    console.log('Auth details:', { companyCode, userId });
    
    if (!companyCode || !userId) {
      console.error('Missing auth data:', { hasCompanyCode: !!companyCode, hasUserId: !!userId });
      return NextResponse.json(
        { error: 'Company code or user ID not found in token' },
        { status: 400 }
      );
    }
    
    // Connect to the company-specific database
    console.log(`Connecting to company database: ${companyCode}`);
    const { companyDb } = await connectToCompanyDb(companyCode);
    
    // Get user's email from auth result
    const userEmail = authResult.email;
    if (!userEmail) {
      console.error('User email not found in auth result');
      return NextResponse.json(
        { error: 'User email not found in authentication data' },
        { status: 400 }
      );
    }
    
    // Fetch projects where the user is either an employee or a viewer by email
    const query = {
      $or: [
        { 'employees.email': userEmail },
        { 'viewers.email': userEmail }
      ]
    };
    
    console.log('Executing projects query:', JSON.stringify(query, null, 2));
    const projects = await companyDb.collection<Project>('projects').find(query).toArray();
    console.log(`Found ${projects.length} projects for user email: ${userEmail}`);
    
    // Format the response
    console.log('Processing projects...');
    const formattedProjects = projects.map((project, index) => {
      console.log(`\nProject ${index + 1}:`, {
        id: project._id,
        project_title: project.project_title,
        employees: project.employees?.length || 0,
        viewers: project.viewers?.length || 0
      });
      
      // Get user's role and hours
      const userRole = project.employees?.find((e: any) => e.email === userEmail) || 
                      project.viewers?.find((v: any) => v.email === userEmail);
      
      // Format dates
      const formatDate = (date: Date | string | undefined): string => {
        if (!date || date === 'ongoing') return 'ongoing';
        const d = new Date(date);
        return isNaN(d.getTime()) ? 'ongoing' : d.toISOString();
      };
      
      console.log('Project details:', {
        title: project.project_title,
        start_date: project.start_date,
        end_date: project.end_date,
        priority: project.priority,
        status: project.status
      });
      
      return {
        _id: project._id.toString(),
        name: project.project_title || 'Unnamed Project',
        status: project.status || 'in_progress',
        endDate: formatDate(project.end_date),
        priority: project.priority || 'medium',
        department: project.department || 'General',
        weeklyHours: userRole?.hours_per_week || 0
      };
    });
    
    console.log('Returning formatted projects:', formattedProjects.length);
    return NextResponse.json(formattedProjects);
    
  } catch (error) {
    console.error('Error in employee projects API:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch employee projects',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  } finally {
    console.log('=== Employee Projects API Completed ===\n');
  }
}
