import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { MongoClient, ObjectId } from 'mongodb';
import { z } from 'zod';
import { verifyAuth } from '@/lib/auth';

// MongoDB connection string from environment variable
const uri = process.env.MONGODB_URI || '';
const defaultDbName = 'org_sim_db';
const goalsCollection = 'goals';

// Validation schemas
const CreateGoalSchema = z.object({
  title: z.string().min(1, 'Goal title is required'),
  description: z.string().min(1, 'Goal description is required'),
  department: z.string().min(1, 'Department is required'),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  status: z.enum(['planning', 'active', 'completed', 'canceled', 'on-hold']).optional(),
  visibleToAll: z.boolean().optional(),
  kpis: z.array(z.object({
    name: z.string(),
    description: z.string(),
    target: z.number(),
    unit: z.string(),
    dueDate: z.string()
  })).optional(),
  assignedEmployees: z.array(z.object({
    employeeId: z.string(),
    email: z.string(),
    name: z.string(),
    role: z.string()
  })).optional(),
  viewers: z.array(z.object({
    employeeId: z.string(),
    email: z.string(),
    name: z.string()
  })).optional()
});

// GET handler to retrieve goals
export async function GET(request: Request) {
  noStore();
  const client = new MongoClient(uri);
  
  try {
    console.log('GET /api/goals request received');
    await client.connect();
    
    const url = new URL(request.url);
    const goalId = url.searchParams.get('goalId');
    const userId = url.searchParams.get('userId') || '';
    const userEmail = url.searchParams.get('userEmail') || userId;
    
    // Get token from request headers
    const authHeader = request.headers.get('authorization');
    let companyCode = url.searchParams.get('companyCode') || '';
    let dbUserRole = '';
    
    // Get user data from token if available
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const payload = await verifyAuth(token);
      if (payload) {
        console.log(`User authenticated via token: ${payload.email}`);
        // Refresh user data from central auth DB for fresh role and companyCode
        try {
          const authDb = client.db('auth_db');
          const authUsers = authDb.collection('authUsers');
          const authUser = await authUsers.findOne({ userId: payload.id });
          if (authUser) {
            companyCode = authUser.companyCode || companyCode;
            dbUserRole = authUser.role || dbUserRole;
            console.log(`Loaded fresh role/company from auth_db: ${dbUserRole}/${companyCode}`);
          } else {
            dbUserRole = payload.role || '';
            companyCode = payload.companyCode || companyCode;
          }
        } catch (err) {
          console.error('Error loading user from auth_db:', err);
          dbUserRole = payload.role || '';
          companyCode = payload.companyCode || companyCode;
        }
      }
    }
    
    // If no company code yet, try to get from user record
    if (!companyCode && userEmail) {
      const defaultDb = client.db(defaultDbName);
      const usersCol = defaultDb.collection('users');
      const userDoc = await usersCol.findOne({ email: userEmail });
      if (userDoc) {
        companyCode = (userDoc as any).companyCode || '';
        dbUserRole = (userDoc as any).role || '';
      }
    }
    
    if (!companyCode) {
      console.error('Company code missing for goal access');
      return NextResponse.json({ error: 'Company code required for goal access' }, { status: 400 });
    }
    
    // Use company-specific database
    const dbName = `company_${companyCode.toLowerCase()}`;
    const db = client.db(dbName);
    const collection = db.collection(goalsCollection);
    
    console.log(`Using company-specific database: ${dbName}`);
    
    // Check if user is top management or admin
    const isTopManagement = ['top_management_tier_1', 'top_management_tier_2', 'top_management_tier_3'].includes(dbUserRole || '') || (dbUserRole || '').toLowerCase() === 'admin';
    console.log(`User is top management: ${isTopManagement}`);
    
    console.log(`API Goals GET Request - goalId: ${goalId}, userEmail: ${userEmail}, userRole: ${dbUserRole}, companyCode: ${companyCode}`);

    if (goalId) {
      // Single goal fetch
      let goal: any = null;
      
      // Handle valid ObjectId 
      if (goalId && ObjectId.isValid(goalId)) {
        goal = await collection.findOne({ _id: new ObjectId(goalId) });
      }
      // Fall back to string ID matching if needed
      if (!goal && goalId) {
        goal = await collection.findOne({ goalId: goalId });
      }

      if (!goal) {
        console.log(`Goal not found: ${goalId}`);
        return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
      }

      // VIEWING PERMISSION: Check if user can view this goal
      if (dbUserRole !== 'admin') {
        const isViewer = Array.isArray(goal.viewers) && goal.viewers.some((v: any) => 
          v.email === userEmail);
        const isAssigned = Array.isArray(goal.assignedEmployees) && goal.assignedEmployees.some((e: any) => 
          e.email === userEmail);
        
        // User can view if: assigned as member, listed as viewer, or goal is visibleToAll
        if (!goal.visibleToAll && !isViewer && !isAssigned) {
          console.log(`User ${userEmail} does not have access to goal ${goalId}`);
          return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
      }

      // Format goal ID
      if (!goal.id && goal._id) {
        goal.id = goal._id.toString();
      }
      
      // EDIT/DELETE PERMISSION: Only assigned members + admin
      const isAssigned = Array.isArray(goal.assignedEmployees) && goal.assignedEmployees.some((e: any) => 
        e.email === userEmail);
      const canEdit = (dbUserRole === 'admin') || isAssigned;
      const canDelete = (dbUserRole === 'admin') || isAssigned;
      
      goal.permissions = {
        canEdit,
        canDelete,
        canView: true
      };
      


      console.log(`Found goal: ${goal.title}`);
      return NextResponse.json({ goal, success: true });
    } else {
      // VIEWING PERMISSION: Only assigned members, viewers, or if visibleToAll is true
      let query: any = {};
      
      if (dbUserRole === 'admin') {
        // Only admin can see all goals
        query = {};
      } else {
        // All other users (including top management) can only see:
        // 1. Goals where they are assigned as members
        // 2. Goals where they are listed as viewers  
        // 3. Goals that are marked as visibleToAll
        query = {
          $or: [
            { visibleToAll: true },
            { 'assignedEmployees.email': userEmail },
            { 'viewers.email': userEmail }
          ]
        };
      }
      
      const allGoals = await collection.find(query).toArray();
      
      console.log(`Found ${allGoals.length} goals for user ${userEmail} with role ${dbUserRole}`);
      
      // Format goal IDs and add permission flags
      const formattedGoals = allGoals.map((goal: any) => {
        if (!goal.id && goal._id) {
          goal.id = goal._id.toString();
        }
        
        // EDIT PERMISSION: Only assigned members + admin
        const isAssigned = Array.isArray(goal.assignedEmployees) && goal.assignedEmployees.some((e: any) => 
          e.email === userEmail);
        const canEdit = (dbUserRole === 'admin') || isAssigned;
        
        // DELETE PERMISSION: Only assigned members + admin  
        const canDelete = (dbUserRole === 'admin') || isAssigned;
        
        goal.permissions = {
          canEdit,
          canDelete,
          canView: true // If they can see it, they can view it
        };
        

        
        return goal;
      });
      
      return NextResponse.json({ goals: formattedGoals });
    }
  } catch (error) {
    console.error('Error in goals GET:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch goals',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await client.close();
  }
}

// POST handler to create goals
export async function POST(request: Request) {
  const client = new MongoClient(uri);
  
  try {
    console.log('POST /api/goals request received');
    await client.connect();
    
    const body = await request.json();
    const url = new URL(request.url);
    const userEmail = url.searchParams.get('userEmail') || '';
    const userRole = url.searchParams.get('userRole') || '';
    let companyCode = url.searchParams.get('companyCode') || '';
    
    // Get token from request headers
    const authHeader = request.headers.get('authorization');
    let dbUserRole = userRole;
    
    // Get user data from token if available
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const payload = await verifyAuth(token);
      if (payload) {
        // Refresh user data from central auth DB
        try {
          const authDb = client.db('auth_db');
          const authUsers = authDb.collection('authUsers');
          const authUser = await authUsers.findOne({ userId: payload.id });
          if (authUser) {
            companyCode = authUser.companyCode || companyCode;
            dbUserRole = authUser.role || dbUserRole;
          }
        } catch (err) {
          console.error('Error loading user from auth_db:', err);
        }
      }
    }
    
    if (!companyCode) {
      return NextResponse.json({ error: 'Company code required for goal creation' }, { status: 400 });
    }
    
    // CREATION PERMISSION: Only admin and top management can create goals
    const canCreate = ['admin', 'top_management_tier_1', 'top_management_tier_2', 'top_management_tier_3'].includes(dbUserRole || '');
    
    if (!canCreate) {
      console.log(`User ${userEmail} with role ${dbUserRole} attempted to create goal but lacks permission`);
      return NextResponse.json({ 
        error: 'Insufficient privileges to create goals. Only administrators and top management can create goals.' 
      }, { status: 403 });
    }
    
    console.log('Goal creation data:', body);
    
    // Validate request body
    const validationResult = CreateGoalSchema.safeParse(body);
    if (!validationResult.success) {
      console.log('Validation failed:', validationResult.error);
      return NextResponse.json({ 
        error: 'Invalid goal data',
        details: validationResult.error.errors 
      }, { status: 400 });
    }
    
    const goalData = validationResult.data;
    
    // Use company-specific database
    const dbName = `company_${companyCode.toLowerCase()}`;
    const db = client.db(dbName);
    const collection = db.collection(goalsCollection);
    
    // Generate unique goal ID
    const goalId = new ObjectId().toString();
    
    // Prepare goal document
    const goalDocument = {
      goalId,
      title: goalData.title,
      description: goalData.description,
      department: goalData.department,
      startDate: new Date(goalData.startDate),
      endDate: new Date(goalData.endDate),
      priority: goalData.priority,
      status: goalData.status || 'planning',
      visibleToAll: goalData.visibleToAll !== undefined ? goalData.visibleToAll : true,
      companyCode,
      createdBy: userEmail,
      createdByRole: dbUserRole,
      assignedEmployees: goalData.assignedEmployees || [],
      viewers: goalData.viewers || [],
      kpis: goalData.kpis?.map(kpi => ({
        ...kpi,
        dueDate: new Date(kpi.dueDate),
        current: 0
      })) || [],
      assignedProjects: body.assignedProjects?.map((p: any) => ({
        projectId: p.projectId,
        assignedAt: new Date(p.assignedAt || new Date()),
        assignedBy: p.assignedBy || 'system'
      })) || [],
      progress: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    console.log('Creating goal with data:', goalDocument);
    
    const result = await collection.insertOne(goalDocument);
    
    if (result.insertedId) {
      console.log(`Goal created successfully with ID: ${result.insertedId}`);
      return NextResponse.json({ 
        success: true, 
        goalId: result.insertedId.toString(),
        goal: { ...goalDocument, id: result.insertedId.toString() }
      });
    } else {
      throw new Error('Failed to create goal');
    }
    
  } catch (error) {
    console.error('Error in goals POST:', error);
    return NextResponse.json({ 
      error: 'Failed to create goal',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await client.close();
  }
}

// PUT handler to update goals
export async function PUT(request: Request) {
  const client = new MongoClient(uri);
  
  try {
    console.log('PUT /api/goals request received');
    await client.connect();
    
    const url = new URL(request.url);
    const goalId = url.searchParams.get('goalId');
    const userEmail = url.searchParams.get('userEmail') || '';
    const userRole = url.searchParams.get('userRole') || '';
    let companyCode = url.searchParams.get('companyCode') || '';
    
    if (!goalId) {
      return NextResponse.json({ error: 'Goal ID is required' }, { status: 400 });
    }
    
    // Get token from request headers
    const authHeader = request.headers.get('authorization');
    let dbUserRole = userRole;
    
    // Get user data from token if available
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const payload = await verifyAuth(token);
      if (payload) {
        // Refresh user data from central auth DB
        try {
          const authDb = client.db('auth_db');
          const authUsers = authDb.collection('authUsers');
          const authUser = await authUsers.findOne({ userId: payload.id });
          if (authUser) {
            companyCode = authUser.companyCode || companyCode;
            dbUserRole = authUser.role || dbUserRole;
          }
        } catch (err) {
          console.error('Error loading user from auth_db:', err);
        }
      }
    }
    
    if (!companyCode) {
      return NextResponse.json({ error: 'Company code required for goal update' }, { status: 400 });
    }
    
    const body = await request.json();
    console.log('Goal update data:', body);
    
    // Use company-specific database
    const dbName = `company_${companyCode.toLowerCase()}`;
    const db = client.db(dbName);
    const collection = db.collection(goalsCollection);
    
    // Check if goal exists and user has permission
    if (!ObjectId.isValid(goalId)) {
      return NextResponse.json({ error: 'Invalid goal ID format' }, { status: 400 });
    }
    
    const existingGoal = await collection.findOne({ 
      _id: new ObjectId(goalId)
    });
    
    if (!existingGoal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }
    
    // EDIT PERMISSION: Only assigned members + admin can edit
    const isAssigned = Array.isArray(existingGoal.assignedEmployees) && existingGoal.assignedEmployees.some((e: any) => 
      e.email === userEmail);
    
    const canEdit = (dbUserRole === 'admin') || isAssigned;
    
    if (!canEdit) {
      console.log(`User ${userEmail} with role ${dbUserRole} attempted to edit goal ${goalId} but lacks permission`);
      return NextResponse.json({ 
        error: 'Insufficient privileges to edit this goal. Only administrators and assigned members can edit goals.' 
      }, { status: 403 });
    }
    
    // Prepare update data
    const updateData: any = {
      ...body,
      updatedAt: new Date()
    };
    
    // Convert date strings to Date objects if present
    if (updateData.startDate) updateData.startDate = new Date(updateData.startDate);
    if (updateData.endDate) updateData.endDate = new Date(updateData.endDate);
    if (updateData.kpis) {
      updateData.kpis = updateData.kpis.map((kpi: any) => ({
        ...kpi,
        dueDate: new Date(kpi.dueDate)
      }));
    }
    
    const result = await collection.updateOne(
      { _id: new ObjectId(goalId) },
      { $set: updateData }
    );
    
    if (result.modifiedCount > 0) {
      console.log(`Goal updated successfully: ${goalId}`);
      return NextResponse.json({ success: true, goalId });
    } else {
      throw new Error('Failed to update goal');
    }
    
  } catch (error) {
    console.error('Error in goals PUT:', error);
    return NextResponse.json({ 
      error: 'Failed to update goal',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await client.close();
  }
}

// DELETE handler to delete goals
export async function DELETE(request: Request) {
  const client = new MongoClient(uri);
  
  try {
    console.log('DELETE /api/goals request received');
    await client.connect();
    
    const url = new URL(request.url);
    const goalId = url.searchParams.get('goalId');
    const userEmail = url.searchParams.get('userEmail') || '';
    const userRole = url.searchParams.get('userRole') || '';
    let companyCode = url.searchParams.get('companyCode') || '';
    
    if (!goalId) {
      return NextResponse.json({ error: 'Goal ID is required' }, { status: 400 });
    }
    
    // Get token from request headers
    const authHeader = request.headers.get('authorization');
    let dbUserRole = userRole;
    
    // Get user data from token if available
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const payload = await verifyAuth(token);
      if (payload) {
        // Refresh user data from central auth DB
        try {
          const authDb = client.db('auth_db');
          const authUsers = authDb.collection('authUsers');
          const authUser = await authUsers.findOne({ userId: payload.id });
          if (authUser) {
            companyCode = authUser.companyCode || companyCode;
            dbUserRole = authUser.role || dbUserRole;
          }
        } catch (err) {
          console.error('Error loading user from auth_db:', err);
        }
      }
    }
    
    if (!companyCode) {
      return NextResponse.json({ error: 'Company code required for goal deletion' }, { status: 400 });
    }
    
    // Use company-specific database
    const dbName = `company_${companyCode.toLowerCase()}`;
    const db = client.db(dbName);
    const collection = db.collection(goalsCollection);
    
    // Check if goal exists and user has permission
    if (!ObjectId.isValid(goalId)) {
      return NextResponse.json({ error: 'Invalid goal ID format' }, { status: 400 });
    }
    
    const existingGoal = await collection.findOne({ 
      _id: new ObjectId(goalId)
    });
    
    if (!existingGoal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }
    
    // DELETE PERMISSION: Only assigned members + admin can delete
    const isAssigned = Array.isArray(existingGoal.assignedEmployees) && existingGoal.assignedEmployees.some((e: any) => 
      e.email === userEmail);
    
    const canDelete = (dbUserRole === 'admin') || isAssigned;
    
    if (!canDelete) {
      console.log(`User ${userEmail} with role ${dbUserRole} attempted to delete goal ${goalId} but lacks permission`);
      return NextResponse.json({ 
        error: 'Insufficient privileges to delete goals. Only administrators and assigned members can delete goals.' 
      }, { status: 403 });
    }
    
    // Before deleting the goal, update all linked projects
    const projectsCollection = db.collection('projects');
    
    // Update all projects that are linked to this goal
    const projectUpdateResult = await projectsCollection.updateMany(
      { 
        linkedToGoal: true,
        'goalContext.goalId': goalId
      },
      {
        $set: {
          linkedToGoal: false
        },
        $unset: {
          goalContext: ""
        }
      }
    );
    
    console.log(`Updated ${projectUpdateResult.modifiedCount} projects to unlink from goal ${goalId}`);
    
    // Now delete the goal
    const result = await collection.deleteOne({ _id: new ObjectId(goalId) });
    
    if (result.deletedCount > 0) {
      console.log(`Goal deleted successfully: ${goalId}`);
      return NextResponse.json({ 
        success: true, 
        goalId,
        unlinkedProjects: projectUpdateResult.modifiedCount
      });
    } else {
      throw new Error('Failed to delete goal');
    }
    
  } catch (error) {
    console.error('Error in goals DELETE:', error);
    return NextResponse.json({ 
      error: 'Failed to delete goal',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await client.close();
  }
}