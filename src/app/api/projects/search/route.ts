import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import jwt from 'jsonwebtoken';

const uri = process.env.MONGODB_URI!;
const JWT_SECRET = process.env.JWT_SECRET!;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query.trim()) {
      return NextResponse.json({ projects: [] });
    }

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

    // Search projects by title and description
    const searchRegex = new RegExp(query, 'i');
    const projects = await db.collection('projects').find({
      $or: [
        { project_title: searchRegex },
        { title: searchRegex },
        { project_description: searchRegex },
        { description: searchRegex }
      ]
    }).limit(limit).toArray();

    await client.close();

    // Format projects for frontend
    const formattedProjects = projects.map(project => ({
      id: project._id.toString(),
      _id: project._id.toString(),
      title: project.project_title || project.title,
      project_title: project.project_title || project.title,
      description: project.project_description || project.description,
      project_description: project.project_description || project.description,
      status: project.status,
      department: project.department,
      startDate: project.start_date || project.startDate,
      endDate: project.end_date || project.endDate
    }));

    return NextResponse.json({ projects: formattedProjects });

  } catch (error) {
    console.error('Error searching projects:', error);
    return NextResponse.json({ error: 'Failed to search projects' }, { status: 500 });
  }
}
