import { NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { verifyAuth } from '@/lib/auth';

const uri = process.env.MONGODB_URI || '';
const goalsCollection = 'goals';
const projectsCollection = 'projects';

// GET handler to retrieve projects assigned to a goal
export async function GET(
  request: Request,
  { params }: { params: Promise<{ goalId: string }> }
) {
  const client = new MongoClient(uri);

  try {
    const resolvedParams = await params;
    console.log(`GET /api/goals/${resolvedParams.goalId}/projects request received`);
    await client.connect();
    
    const url = new URL(request.url);
    let companyCode = url.searchParams.get('companyCode') || '';
    
    // Get token from request headers
    const authHeader = request.headers.get('authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const payload = await verifyAuth(token);
      if (payload) {
        // Get user data from central auth DB
        try {
          const authDb = client.db('auth_db');
          const authUsers = authDb.collection('authUsers');
          const authUser = await authUsers.findOne({ userId: payload.id });
          if (authUser) {
            companyCode = authUser.companyCode || companyCode;
          }
        } catch (err) {
          console.error('Error loading user from auth_db:', err);
        }
      }
    }
    
    if (!companyCode) {
      return NextResponse.json({ error: 'Company code required' }, { status: 400 });
    }
    
    // Use company-specific database
    const dbName = `company_${companyCode.toLowerCase()}`;
    const db = client.db(dbName);
    const goalsCol = db.collection(goalsCollection);
    const projectsCol = db.collection(projectsCollection);
    
    // Get the goal
    const goal = await goalsCol.findOne({
      _id: ObjectId.isValid(resolvedParams.goalId) ? new ObjectId(resolvedParams.goalId) : null
    });
    
    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }
    
    // Get assigned projects details
    const projectIds = goal.assignedProjects?.map((ap: any) => 
      ObjectId.isValid(ap.projectId) ? new ObjectId(ap.projectId) : ap.projectId
    ) || [];
    
    let projects = [];
    if (projectIds.length > 0) {
      projects = await projectsCol.find({ 
        _id: { $in: projectIds } 
      }).toArray();
      
      // Format projects for response
      projects = projects.map((project: any) => ({
        id: project._id.toString(),
        name: project.project_title || project.name || '',
        description: project.project_description || project.description || '',
        status: project.status || 'planning',
        priority: project.priority || 'medium',
        startDate: project.start_date || project.startDate || '',
        endDate: project.end_date || project.endDate || '',
        department: project.department || '',
        employees: project.employees || project.employee_contributions || [],
        total_budget: project.total_budget || 0,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        // Include assignment info from goal
        assignmentInfo: goal.assignedProjects.find((ap: any) => 
          ap.projectId.toString() === project._id.toString()
        )
      }));
    }
    
    return NextResponse.json({ 
      success: true, 
      projects,
      goalId: resolvedParams.goalId,
      goalTitle: goal.title
    });
    
  } catch (error) {
    console.error('Error in goal projects GET:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch goal projects',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await client.close();
  }
}

// POST handler to create new project within a goal or assign existing project to goal
export async function POST(
  request: Request,
  { params }: { params: Promise<{ goalId: string }> }
) {
  const client = new MongoClient(uri);

  try {
    const resolvedParams = await params;
    console.log(`POST /api/goals/${resolvedParams.goalId}/projects request received`);
    await client.connect();
    
    const url = new URL(request.url);
    const userEmail = url.searchParams.get('userEmail') || '';
    let companyCode = url.searchParams.get('companyCode') || '';
    
    // Get token from request headers
    const authHeader = request.headers.get('authorization');
    let dbUserRole = '';
    let currentUserId = '';
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const payload = await verifyAuth(token);
      if (payload) {
        currentUserId = payload.id;
        // Get user data from central auth DB
        try {
          const authDb = client.db('auth_db');
          const authUsers = authDb.collection('authUsers');
          const authUser = await authUsers.findOne({ userId: payload.id });
          console.log('Auth user found:', authUser);
          if (authUser) {
            companyCode = authUser.companyCode || companyCode;
            dbUserRole = authUser.role || '';
            console.log('User role set to:', dbUserRole);
          }
        } catch (err) {
          console.error('Error loading user from auth_db:', err);
        }
      }
    }
    
    if (!companyCode) {
      return NextResponse.json({ error: 'Company code required' }, { status: 400 });
    }
    
    const body = await request.json();
    console.log('Goal project data:', body);
    
    // Use company-specific database
    const dbName = `company_${companyCode.toLowerCase()}`;
    const db = client.db(dbName);
    const goalsCol = db.collection(goalsCollection);
    const projectsCol = db.collection(projectsCollection);
    
    // Verify goal exists and user has permission
    const goal = await goalsCol.findOne({
      _id: ObjectId.isValid(resolvedParams.goalId) ? new ObjectId(resolvedParams.goalId) : null
    });
    
    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }
    
    // Check permission
    console.log('Permission check:', {
      dbUserRole,
      userEmail,
      goalCreatedBy: goal.createdBy,
      allowedRoles: ['admin', 'top_management_tier_1', 'top_management_tier_2', 'top_management_tier_3']
    });

    const canManageGoal = ['admin', 'top_management_tier_1', 'top_management_tier_2', 'top_management_tier_3'].includes(dbUserRole) ||
                         goal.createdBy === userEmail;

    console.log('Can manage goal:', canManageGoal);

    if (!canManageGoal) {
      return NextResponse.json({ error: 'Insufficient privileges to manage goal projects' }, { status: 403 });
    }
    
    if (body.action === 'assign_existing') {
      // Assign existing project to goal
      const projectId = body.projectId;
      if (!projectId) {
        return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
      }
      
      // Verify project exists
      const project = await projectsCol.findOne({ 
        _id: ObjectId.isValid(projectId) ? new ObjectId(projectId) : null 
      });
      
      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
      
      // Check if project is already assigned to this goal
      const isAlreadyAssigned = goal.assignedProjects?.some((ap: any) => 
        ap.projectId.toString() === projectId
      );
      
      if (isAlreadyAssigned) {
        return NextResponse.json({ error: 'Project is already assigned to this goal' }, { status: 400 });
      }
      
      // Add project to goal's assignedProjects
      const result = await goalsCol.updateOne(
        { _id: new ObjectId(resolvedParams.goalId) },
        { 
          $push: { 
            assignedProjects: {
              projectId: new ObjectId(projectId),
              assignedAt: new Date(),
              assignedBy: new ObjectId(currentUserId)
            }
          },
          $set: { updatedAt: new Date() }
        }
      );
      
      if (result.modifiedCount > 0) {
        return NextResponse.json({ 
          success: true, 
          message: 'Project assigned to goal successfully',
          projectId 
        });
      } else {
        throw new Error('Failed to assign project to goal');
      }
      
    } else {
      // Create new project within goal
      const projectData = body;
      
      // Generate unique project ID
      const projectId = new ObjectId();
      
      // Prepare project document (simplified for goal-created projects)
      const projectDocument = {
        _id: projectId,
        project_title: projectData.title || projectData.name,
        project_description: projectData.description,
        department: projectData.department,
        start_date: projectData.startDate ? new Date(projectData.startDate) : new Date(),
        end_date: projectData.endDate ? new Date(projectData.endDate) : null,
        status: projectData.status || 'planning',
        priority: projectData.priority || 'medium',
        total_budget: projectData.total_budget || 0,
        companyCode,
        createdBy: userEmail,
        createdByRole: dbUserRole,
        createdFromGoal: resolvedParams.goalId,
        isManagementProject: ['top_management_tier_1', 'top_management_tier_2', 'top_management_tier_3'].includes(dbUserRole),
        visibleToAll: projectData.visibleToAll !== undefined ? projectData.visibleToAll : true,
        
        // Employee assignments (simplified - they can fill details later)
        employee_contributions: (projectData.assignedEmployees || []).map((emp: any) => ({
          name: emp.name,
          email: emp.email,
          department: emp.department || projectData.department,
          role: emp.role || 'Team Member',
          is_lead: emp.isLead || false,
          tasks: [],
          hours: 0,
          hours_per_week: 0,
          tools_used: []
        })),
        
        employees: (projectData.assignedEmployees || []).map((emp: any) => ({
          name: emp.name,
          email: emp.email,
          employee_email: emp.email
        })),
        
        viewers: projectData.viewers || [],
        tools_and_resources: [],
        linked_projects: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      console.log('Creating project within goal:', projectDocument);
      
      // Create the project
      const projectResult = await projectsCol.insertOne(projectDocument);
      
      if (projectResult.insertedId) {
        // Assign the new project to the goal
        const goalResult = await goalsCol.updateOne(
          { _id: new ObjectId(resolvedParams.goalId) },
          { 
            $push: { 
              assignedProjects: {
                projectId: projectResult.insertedId,
                assignedAt: new Date(),
                assignedBy: new ObjectId(currentUserId)
              }
            },
            $set: { updatedAt: new Date() }
          }
        );
        
        if (goalResult.modifiedCount > 0) {
          console.log(`Project created and assigned to goal successfully: ${projectResult.insertedId}`);
          return NextResponse.json({ 
            success: true, 
            projectId: projectResult.insertedId.toString(),
            project: { ...projectDocument, id: projectResult.insertedId.toString() }
          });
        } else {
          // Project created but failed to assign to goal - cleanup
          await projectsCol.deleteOne({ _id: projectResult.insertedId });
          throw new Error('Failed to assign project to goal after creation');
        }
      } else {
        throw new Error('Failed to create project');
      }
    }
    
  } catch (error) {
    console.error('Error in goal projects POST:', error);
    return NextResponse.json({ 
      error: 'Failed to create/assign project',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await client.close();
  }
}

// DELETE handler to remove project from goal
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ goalId: string }> }
) {
  const client = new MongoClient(uri);

  try {
    const resolvedParams = await params;
    console.log(`DELETE /api/goals/${resolvedParams.goalId}/projects request received`);
    await client.connect();
    
    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');
    const userEmail = url.searchParams.get('userEmail') || '';
    let companyCode = url.searchParams.get('companyCode') || '';
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }
    
    // Get token from request headers
    const authHeader = request.headers.get('authorization');
    let dbUserRole = '';
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const payload = await verifyAuth(token);
      if (payload) {
        // Get user data from central auth DB
        try {
          const authDb = client.db('auth_db');
          const authUsers = authDb.collection('authUsers');
          const authUser = await authUsers.findOne({ userId: payload.id });
          if (authUser) {
            companyCode = authUser.companyCode || companyCode;
            dbUserRole = authUser.role || '';
          }
        } catch (err) {
          console.error('Error loading user from auth_db:', err);
        }
      }
    }
    
    if (!companyCode) {
      return NextResponse.json({ error: 'Company code required' }, { status: 400 });
    }
    
    // Use company-specific database
    const dbName = `company_${companyCode.toLowerCase()}`;
    const db = client.db(dbName);
    const goalsCol = db.collection(goalsCollection);
    
    // Verify goal exists and user has permission
    const goal = await goalsCol.findOne({
      _id: ObjectId.isValid(resolvedParams.goalId) ? new ObjectId(resolvedParams.goalId) : null
    });
    
    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }
    
    // Check permission
    const canManageGoal = ['admin', 'top_management_tier_1', 'top_management_tier_2', 'top_management_tier_3'].includes(dbUserRole) ||
                         goal.createdBy === userEmail;
    
    if (!canManageGoal) {
      return NextResponse.json({ error: 'Insufficient privileges to manage goal projects' }, { status: 403 });
    }
    
    // Remove project from goal's assignedProjects
    const result = await goalsCol.updateOne(
      { _id: new ObjectId(resolvedParams.goalId) },
      { 
        $pull: { 
          assignedProjects: { 
            projectId: ObjectId.isValid(projectId) ? new ObjectId(projectId) : projectId 
          }
        },
        $set: { updatedAt: new Date() }
      }
    );
    
    if (result.modifiedCount > 0) {
      console.log(`Project removed from goal successfully: ${projectId}`);
      return NextResponse.json({ 
        success: true, 
        message: 'Project removed from goal successfully',
        projectId 
      });
    } else {
      return NextResponse.json({ error: 'Project not found in goal or already removed' }, { status: 404 });
    }
    
  } catch (error) {
    console.error('Error in goal projects DELETE:', error);
    return NextResponse.json({ 
      error: 'Failed to remove project from goal',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await client.close();
  }
}