import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';

const uri = process.env.MONGODB_URI!;
const JWT_SECRET = process.env.JWT_SECRET!;

export async function PATCH(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params;
    const body = await request.json();

    // Get auth token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Verify token
    const payload = jwt.verify(token, JWT_SECRET) as any;
    const userEmail = payload.email;

    if (!userEmail) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const client = new MongoClient(uri);
    await client.connect();

    // Determine database
    const companyCode = payload.companyCode || 'default';
    const dbToUse = companyCode ? `company_${companyCode}` : 'org_sim_db';
    const db = client.db(dbToUse);

    // Update project with new data
    const updateData: any = {
      updatedAt: new Date()
    };

    // Add fields from body
    if (body.linkedToGoal !== undefined) {
      updateData.linkedToGoal = body.linkedToGoal;
    }
    if (body.goalContext) {
      updateData.goalContext = body.goalContext;
    }
    if (body.assignedEmployees) {
      updateData.assignedEmployees = body.assignedEmployees;
      updateData.assigned_employees = body.assignedEmployees;
      updateData.team_members = body.assignedEmployees.map((emp: any) => ({
        user_id: emp.employeeId,
        name: emp.name,
        email: emp.email,
        role: emp.role || 'member'
      }));
    }

    const result = await db.collection('projects').updateOne(
      { _id: new ObjectId(projectId) },
      { $set: updateData }
    );

    await client.close();

    if (result.modifiedCount > 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Project updated successfully' 
      });
    } else {
      return NextResponse.json({ 
        error: 'Project not found or no changes made' 
      }, { status: 404 });
    }

  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json({ 
      error: 'Failed to update project' 
    }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params;

    // Get auth token
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Verify token
    const payload = jwt.verify(token, JWT_SECRET) as any;
    const userEmail = payload.email;

    if (!userEmail) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const client = new MongoClient(uri);
    await client.connect();

    // Determine database
    const companyCode = payload.companyCode || 'default';
    const dbToUse = companyCode ? `company_${companyCode}` : 'org_sim_db';
    const db = client.db(dbToUse);

    // Get project
    const project = await db.collection('projects').findOne({
      _id: new ObjectId(projectId)
    });

    await client.close();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Format project for frontend
    const formattedProject = {
      id: project._id.toString(),
      _id: project._id.toString(),
      title: project.project_title || project.title,
      project_title: project.project_title || project.title,
      description: project.project_description || project.description,
      project_description: project.project_description || project.description,
      status: project.status,
      priority: project.priority,
      department: project.department,
      startDate: project.start_date || project.startDate,
      endDate: project.end_date || project.endDate,
      budget: project.total_budget || project.budget,
      assignedEmployees: project.assignedEmployees || project.assigned_employees || [],
      team_members: project.team_members || [],
      linkedToGoal: project.linkedToGoal || false,
      goalContext: project.goalContext || null,
      createdBy: project.createdBy,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    };

    return NextResponse.json({ project: formattedProject });

  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
  }
}
