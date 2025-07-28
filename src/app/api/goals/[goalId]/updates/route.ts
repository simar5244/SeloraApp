import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/auth';
import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI!;

// POST /api/goals/[goalId]/updates - Add update to goal
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  const resolvedParams = await params;
  console.log('[Goal Updates API] Route hit! Params:', resolvedParams);
  console.log('[Goal Updates API] Request URL:', request.url);

  try {
    console.log('[Goal Updates API] Starting update creation request for goal:', resolvedParams.goalId);
    
    // Authenticate and enforce multi-tenancy
    const authResult = await authMiddleware(request);
    if (authResult) {
      console.log('[Goal Updates API] Authentication failed:', authResult);
      return authResult;
    }
    
    const user = (request as any).user;
    if (!user?.companyCode) {
      console.error('[Goal Updates API] No company code found in user context');
      return NextResponse.json({ error: 'Company not found' }, { status: 403 });
    }

    console.log('[Goal Updates API] Authenticated user:', user.email, 'Company:', user.companyCode);
    
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
      const goalsCollection = db.collection('goals');
      
      console.log('[Goal Updates API] Searching in database:', dbName, 'for goal:', resolvedParams.goalId);

      // Validate ObjectId format
      if (!ObjectId.isValid(resolvedParams.goalId)) {
        console.error('[Goal Updates API] Invalid ObjectId format:', resolvedParams.goalId);
        return NextResponse.json({ error: 'Invalid goal ID format' }, { status: 400 });
      }

      // Find the goal
      const goal = await goalsCollection.findOne({
        _id: new ObjectId(resolvedParams.goalId)
      });

      console.log('[Goal Updates API] Goal found:', !!goal);
      if (goal) {
        console.log('[Goal Updates API] Goal title:', goal.title);
      } else {
        // Try to find any goal to see if there are goals in the collection
        const anyGoal = await goalsCollection.findOne({});
        console.log('[Goal Updates API] Any goal exists:', !!anyGoal);
        if (anyGoal) {
          console.log('[Goal Updates API] Sample goal ID:', anyGoal._id);
        }
      }

      if (!goal) {
        return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
      }
      
      // Check if user is a member or admin
      const isAdmin = ['admin', 'superadmin'].includes(user.role);
      const isMember = goal.assignedEmployees?.some((emp: any) => 
        emp.email === user.email || emp.id === user.id || emp._id === user.id
      ) || goal.team_members?.some((member: any) => 
        member.email === user.email || member.id === user.id || member._id === user.id
      );
      
      if (!isAdmin && !isMember) {
        return NextResponse.json({ 
          error: 'Access denied. Only goal members and admins can post updates.' 
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
      
      // Add update to goal's updates array
      const result = await goalsCollection.updateOne(
        { _id: new ObjectId(resolvedParams.goalId) },
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
        return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
      }
      
      console.log('[Goal Updates API] Update added successfully');
      
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
    console.error('[Goal Updates API] Error adding update:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/goals/[goalId]/updates - Get goal updates
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ goalId: string }> }
) {
  const resolvedParams = await params;
  console.log('[Goal Updates API GET] Route hit! Params:', resolvedParams);
  console.log('[Goal Updates API GET] Request URL:', request.url);

  try {
    console.log('[Goal Updates API] Starting get updates request...');
    
    // Authenticate and enforce multi-tenancy
    const authResult = await authMiddleware(request);
    if (authResult) {
      console.log('[Goal Updates API] Authentication failed:', authResult);
      return authResult;
    }
    
    const user = (request as any).user;
    if (!user?.companyCode) {
      console.error('[Goal Updates API] No company code found in user context');
      return NextResponse.json({ error: 'Company not found' }, { status: 403 });
    }

    console.log('[Goal Updates API] Authenticated user:', user.email, 'Company:', user.companyCode);
    
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    
    try {
      // Use company-specific database
      const dbName = `company_${user.companyCode.toLowerCase()}`;
      const db = client.db(dbName);
      const goalsCollection = db.collection('goals');
      
      console.log('[Goal Updates API] Searching in database:', dbName, 'for goal:', resolvedParams.goalId);

      // Find the goal and get its updates
      const goal = await goalsCollection.findOne(
        { _id: new ObjectId(resolvedParams.goalId) },
        { projection: { updates: 1 } }
      );
      
      if (!goal) {
        return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
      }
      
      const updates = goal.updates || [];
      
      console.log('[Goal Updates API] Found updates:', updates.length);
      
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
    console.error('[Goal Updates API] Error fetching updates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
