import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/auth';
import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI!;

// POST /api/projects/[projectId]/updates - Add update to project
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const resolvedParams = await params;
  console.log('[Project Updates API] Route hit! Params:', resolvedParams);
  console.log('[Project Updates API] Request URL:', request.url);

  try {
    console.log('[Project Updates API] Starting update creation request for project:', resolvedParams.projectId);
    
    // Authenticate and enforce multi-tenancy
    const authResult = await authMiddleware(request);
    if (authResult) {
      console.log('[Project Updates API] Authentication failed:', authResult);
      return authResult;
    }
    
    const user = (request as any).user;
    if (!user?.companyCode) {
      console.error('[Project Updates API] No company code found in user context');
      return NextResponse.json({ error: 'Company not found' }, { status: 403 });
    }

    console.log('[Project Updates API] Authenticated user:', user.email, 'Company:', user.companyCode);
    
    const { message, author_id, author_name } = await request.json();
    
    if (!message?.trim()) {
      return NextResponse.json({ error: 'Update message is required' }, { status: 400 });
    }
    
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    try {
      // Use company-specific database
      const dbName = `company_${user.companyCode.toLowerCase()}`;
      const db = client.db(dbName);
      const projectsCollection = db.collection('projects');
      
      console.log('[Project Updates API] Searching in database:', dbName, 'for project:', resolvedParams.projectId);

      // Validate ObjectId format
      if (!ObjectId.isValid(resolvedParams.projectId)) {
        console.error('[Project Updates API] Invalid ObjectId format:', resolvedParams.projectId);
        return NextResponse.json({ error: 'Invalid project ID format' }, { status: 400 });
      }

      // Find the project
      const project = await projectsCollection.findOne({
        _id: new ObjectId(resolvedParams.projectId)
      });

      console.log('[Project Updates API] Project found:', !!project);
      if (project) {
        console.log('[Project Updates API] Project title:', project.project_title);
      } else {
        // Try to find any project to see if there are projects in the collection
        const anyProject = await projectsCollection.findOne({});
        console.log('[Project Updates API] Any project exists:', !!anyProject);
        if (anyProject) {
          console.log('[Project Updates API] Sample project ID:', anyProject._id);
        }
      }

      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
      
      // Check if user is a member or admin
      const isAdmin = ['admin', 'superadmin'].includes(user.role);
      const isMember = project.employees?.some((emp: any) => 
        emp.email === user.email || emp.id === user.id || emp._id === user.id
      ) || project.team_members?.some((member: any) => 
        member.email === user.email || member.id === user.id || member._id === user.id
      );
      
      if (!isAdmin && !isMember) {
        return NextResponse.json({ 
          error: 'Access denied. Only project members and admins can post updates.' 
        }, { status: 403 });
      }
      
      // Create the update object
      const update = {
        _id: new ObjectId(),
        message: message.trim(),
        author_id: author_id || user.id,
        author_name: author_name || user.name || user.email,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      // Add update to project's updates array
      const result = await projectsCollection.updateOne(
        { _id: new ObjectId(resolvedParams.projectId) },
        {
          $push: {
            updates: {
              $each: [update],
              $position: 0 // Add to beginning of array
            }
          },
          $set: { updated_at: new Date() }
        }
      );
      
      if (result.matchedCount === 0) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
      
      console.log('[Project Updates API] Update added successfully');
      
      return NextResponse.json({ 
        success: true, 
        update: {
          ...update,
          _id: update._id.toString()
        }
      });
      
    } finally {
      await client.close();
    }
    
  } catch (error) {
    console.error('[Project Updates API] Error adding update:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/projects/[projectId]/updates - Get project updates
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const resolvedParams = await params;
  console.log('[Project Updates API GET] Route hit! Params:', resolvedParams);
  console.log('[Project Updates API GET] Request URL:', request.url);

  try {
    console.log('[Project Updates API] Starting get updates request...');
    
    // Authenticate and enforce multi-tenancy
    const authResult = await authMiddleware(request);
    if (authResult) {
      console.log('[Project Updates API] Authentication failed:', authResult);
      return authResult;
    }
    
    const user = (request as any).user;
    if (!user?.companyCode) {
      console.error('[Project Updates API] No company code found in user context');
      return NextResponse.json({ error: 'Company not found' }, { status: 403 });
    }

    console.log('[Project Updates API] Authenticated user:', user.email, 'Company:', user.companyCode);
    
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    try {
      // Use company-specific database
      const dbName = `company_${user.companyCode.toLowerCase()}`;
      const db = client.db(dbName);
      const projectsCollection = db.collection('projects');
      
      console.log('[Project Updates API] Searching in database:', dbName, 'for project:', resolvedParams.projectId);

      // Find the project and get its updates
      const project = await projectsCollection.findOne(
        { _id: new ObjectId(resolvedParams.projectId) },
        { projection: { updates: 1 } }
      );
      
      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
      
      const updates = project.updates || [];
      
      console.log('[Project Updates API] Found updates:', updates.length);
      
      return NextResponse.json({ 
        success: true, 
        updates: updates.map((update: any) => ({
          ...update,
          _id: update._id?.toString()
        }))
      });
      
    } finally {
      await client.close();
    }
    
  } catch (error) {
    console.error('[Project Updates API] Error fetching updates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
