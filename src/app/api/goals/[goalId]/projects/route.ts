import { NextResponse } from 'next/server';
import { MongoClient, ObjectId, Collection, Document } from 'mongodb';
import { verifyAuth } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import Notification from '@/models/Notification';
import { sendNotificationEmail } from '@/services/emailService';

const uri = process.env.MONGODB_URI || '';

// Collections at the top with proper typing
const goalsCollection = 'goals';
const projectsCollection = 'projects';

// Define interfaces for our documents
interface GoalDocument extends Document {
  _id: ObjectId;
  assignedProjects: Array<{
    projectId: ObjectId | string;
    _id?: ObjectId | string;
    [key: string]: any;
  }>;
  createdBy: string;
  [key: string]: any;
}

interface ProjectDocument extends Document {
  _id: ObjectId;
  linkedToGoal?: boolean;
  goalContext?: any;
  [key: string]: any;
}

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
    
    // Validate and get the goal
    const goalId = resolvedParams.goalId;
    if (!goalId || !ObjectId.isValid(goalId)) {
      return NextResponse.json({ error: 'Invalid goal ID format' }, { status: 400 });
    }
    
    const goal = await goalsCol.findOne({ _id: new ObjectId(goalId) });
    
    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }
    
    // Get assigned projects details
    console.log('Goal assigned projects:', goal.assignedProjects);
    
    // Array to store project IDs
    const projectIds = [];
    const stringIds = [];
    
    // Check if assignedProjects exists and is an array
    if (goal.assignedProjects && Array.isArray(goal.assignedProjects)) {
      // Loop through each assigned project
      for (const ap of goal.assignedProjects) {
        console.log('Processing assigned project:', ap);
        
        // Extract the projectId regardless of format
        let projectId = null;
        
        if (ap && typeof ap === 'object') {
          // If projectId is directly available
          if (ap.projectId) {
            projectId = ap.projectId;
          } else if (ap._id) {
            projectId = ap._id;
          } else if (ap.id) {
            projectId = ap.id;
          }
        } else if (typeof ap === 'string') {
          // If the whole entry is just a string ID
          projectId = ap;
        }
        
        console.log('Extracted project ID:', projectId);
        
        // Convert to ObjectId if possible
        if (projectId) {
          // Handle ObjectId objects directly
          if (typeof projectId === 'object') {
            if (projectId._bsontype === 'ObjectID' || projectId._bsontype === 'ObjectId') {
              projectIds.push(projectId);
            } else if (projectId.toString) {
              // Try to convert object to string then to ObjectId
              const idStr = projectId.toString();
              if (ObjectId.isValid(idStr)) {
                projectIds.push(new ObjectId(idStr));
              } else {
                stringIds.push(idStr);
              }
            }
          }
          // Handle string IDs that can be converted to ObjectId
          else if (typeof projectId === 'string') {
            if (ObjectId.isValid(projectId)) {
              projectIds.push(new ObjectId(projectId));
            } else {
              stringIds.push(projectId);
            }
          } 
          // Handle any other format
          else if (projectId) {
            const idStr = String(projectId);
            if (ObjectId.isValid(idStr)) {
              projectIds.push(new ObjectId(idStr));
            } else {
              stringIds.push(idStr);
            }
          }
        }
      }
    }
    
    console.log('Extracted project IDs:', projectIds);
    console.log('Extracted string IDs:', stringIds);
    
    let projects: any[] = [];
    
    // Query for projects with ObjectId _id
    if (projectIds.length > 0) {
      const objectIdProjects = await projectsCol.find({
        _id: { $in: projectIds }
      }).toArray();
      projects = [...projects, ...objectIdProjects];
    }
    
    // Query for projects with string IDs
    if (stringIds.length > 0) {
      const stringIdProjects = await projectsCol.find({
        $or: [
          { id: { $in: stringIds } },
          { projectId: { $in: stringIds } }
        ]
      }).toArray();
      projects = [...projects, ...stringIdProjects];
    }
    
    // Format projects for response
    const formattedProjects = projects.map((project: any) => ({
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
      assignmentInfo: goal.assignedProjects?.find((ap: any) => {
        // Handle different formats of project IDs
        const apId = ap.projectId?.toString() || ap._id?.toString() || ap.id?.toString() || ap.toString();
        const projectId = project._id?.toString();
        return apId === projectId;
      })
    }));
    
    return NextResponse.json({ 
      success: true, 
      projects: formattedProjects,
      goalId: (await params).goalId,
      goalTitle: goal.title || ''
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
    let companyCode = url.searchParams.get('companyCode') || '';
    
    // Get token from request headers
    const authHeader = request.headers.get('authorization');
    let dbUserRole = '';
    let currentUserId = '';
    let userEmail = '';
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    const payload = await verifyAuth(token);
    
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    
    // Set user info from token
    currentUserId = payload.id;
    userEmail = payload.email || '';
    
    // Get user data from central auth DB
    try {
      const authDb = client.db('auth_db');
      const authUsers = authDb.collection('authUsers');
      const authUser = await authUsers.findOne({ userId: currentUserId });
      
      if (authUser) {
        companyCode = authUser.companyCode || companyCode;
        dbUserRole = authUser.role || '';
        console.log('Auth user found:', { 
          email: userEmail, 
          role: dbUserRole, 
          companyCode 
        });
      } else {
        console.warn('User not found in auth database, using token data as fallback');
        // Use role from token if available
        dbUserRole = payload.role || '';
      }
    } catch (err) {
      console.error('Error loading user from auth_db:', err);
      return NextResponse.json({ 
        error: 'Error loading user data',
        details: err instanceof Error ? err.message : 'Unknown error'
      }, { status: 500 });
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
    const allowedRoles = ['admin', 'top_management_tier_1', 'top_management_tier_2', 'top_management_tier_3'];
    const isAdminOrManagement = allowedRoles.includes(dbUserRole);
    const isGoalCreator = goal.createdBy === userEmail;
    const canManageGoal = isAdminOrManagement || isGoalCreator;

    console.log('Permission check:', {
      userEmail,
      userRole: dbUserRole,
      isAdminOrManagement,
      isGoalCreator,
      allowedRoles,
      goalCreatedBy: goal.createdBy,
      canManageGoal
    });

    if (!canManageGoal) {
      return NextResponse.json({ 
        error: 'Insufficient privileges to manage goal projects',
        details: {
          requiredRoles: allowedRoles,
          userRole: dbUserRole,
          isGoalCreator
        }
      }, { status: 403 });
    }
    
    if (body.action === 'assign_existing') {
      // Assign existing project to goal
      const projectId = body.projectId;
      if (!projectId) {
        return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
      }
      
      // Check if project exists
      // Validate projectId format
      if (!ObjectId.isValid(projectId)) {
        return NextResponse.json({ error: 'Invalid project ID format' }, { status: 400 });
      }
      const validProjectId = new ObjectId(projectId);
      if (!validProjectId) {
        return NextResponse.json({ error: 'Invalid project ID format' }, { status: 400 });
      }
      if (!validProjectId) {
        return NextResponse.json({ error: 'Invalid project ID format' }, { status: 400 });
      }
      
      const project = await projectsCol.findOne({ _id: validProjectId });
      
      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
      
      // Check if the project is already assigned to the goal
      const isAlreadyAssisted = goal.assignedProjects?.some(
        (ap: any) => ap.projectId?.toString() === projectId.toString()
      );
  
      if (isAlreadyAssisted) {
        return NextResponse.json(
          { error: 'Project is already assigned to this goal' },
          { status: 400 }
        );
      }

      // Assign existing project to goal
      const result = await goalsCol.updateOne(
        { _id: new ObjectId(resolvedParams.goalId) },
        { 
          $push: { 
            assignedProjects: {
              projectId: new ObjectId(projectId),
              assignedAt: new Date(),
              assignedBy: new ObjectId(currentUserId)
            } as any
          },
          $set: { updatedAt: new Date() }
        }
      );

      if (result.modifiedCount > 0) {
        // Update project document to link to goal
        await projectsCol.updateOne(
          { _id: validProjectId },
          {
            $set: {
              linkedToGoal: true,
              goalContext: { goalId: resolvedParams.goalId },
              updatedAt: new Date()
            }
          }
        );
        // Notify all project members that their project has been linked to this goal
        try {
          // Ensure Mongoose connection for Notification model (company-scoped)
          await dbConnect(companyCode);

          // Build a unique set of member emails from the project document
          const memberEmailsSet = new Set<string>();
          const pushEmail = (val: any) => {
            if (!val) return;
            const email = (typeof val === 'string') ? val : (val.email || val.employee_email || val.user_email);
            if (email && typeof email === 'string') memberEmailsSet.add(email.toLowerCase());
          };

          // Collect from common fields
          if (Array.isArray(project?.employees)) project.employees.forEach(pushEmail);
          if (Array.isArray(project?.viewers)) project.viewers.forEach(pushEmail);
          if (Array.isArray(project?.employee_contributions)) {
            project.employee_contributions.forEach((c: any) => pushEmail(c));
          }

          const memberEmails = Array.from(memberEmailsSet);

          // Helper to resolve userId by email
          const findUserIdByEmail = async (email: string) => {
            // 1) central auth_db
            try {
              const authDb = client.db('auth_db');
              const authUsers = authDb.collection('authUsers');
              const authUser = await authUsers.findOne({ email });
              if (authUser?.userId) {
                try { return new ObjectId(String(authUser.userId)); } catch {}
              }
            } catch {}
            // 2) company-specific users
            try {
              const companyDb = client.db(`company_${companyCode.toLowerCase()}`);
              const companyUsers = companyDb.collection('users');
              const companyUser = await companyUsers.findOne({ email });
              if (companyUser?._id) return companyUser._id;
            } catch {}
            return null;
          };

          const goalTitle = goal.title || '';
          const projectTitle = project.project_title || project.name || 'Project';
          const subject = `Your project ${projectTitle} has been linked to goal ${goalTitle}`;
          const linkPath = `/dashboard/goals/${resolvedParams.goalId}`;
          const projectIdStr = validProjectId.toString();

          for (const email of memberEmails) {
            try {
              const userId = await findUserIdByEmail(email);
              if (userId) {
                await Notification.create({
                  userId,
                  type: 'project',
                  title: 'Project linked to a goal',
                  message: `Your project \"${projectTitle}\" has been linked to goal \"${goalTitle}\"`,
                  link: linkPath,
                  isRead: false,
                });
              }
              await sendNotificationEmail(
                email,
                subject,
                `Your project \"${projectTitle}\" has been linked to the goal \"${goalTitle}\".`,
                projectTitle,
                projectIdStr
              );
            } catch (notifErr) {
              console.error('[GOAL-PROJECT LINK] Failed to notify', email, notifErr);
            }
          }
        } catch (notifyErr) {
          console.error('[GOAL-PROJECT LINK] Notification/email dispatch error:', notifyErr);
          // do not fail the main operation due to notification issues
        }
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
          // Link new project to this goal
          linkedToGoal: true,
          goalContext: { goalId: resolvedParams.goalId },
        
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
              } as any // Type assertion to bypass TypeScript's strict type checking
            },
            $set: { updatedAt: new Date() }
          }
        );
        
        if (goalResult.modifiedCount > 0) {
          console.log(`Project created and assigned to goal successfully: ${projectResult.insertedId}`);
          // Notify all project members that their project has been linked to this goal
          try {
            // Ensure Mongoose connection for Notification model (company-scoped)
            await dbConnect(companyCode);

            // Build a unique set of member emails from the created project document
            const memberEmailsSet = new Set<string>();
            const pushEmail = (val: any) => {
              if (!val) return;
              const email = (typeof val === 'string') ? val : (val.email || val.employee_email || val.user_email);
              if (email && typeof email === 'string') memberEmailsSet.add(email.toLowerCase());
            };

            // Collect from common fields on the newly created project
            if (Array.isArray(projectDocument?.employees)) projectDocument.employees.forEach(pushEmail);
            if (Array.isArray(projectDocument?.viewers)) projectDocument.viewers.forEach(pushEmail);
            if (Array.isArray(projectDocument?.employee_contributions)) {
              projectDocument.employee_contributions.forEach((c: any) => pushEmail(c));
            }

            const memberEmails = Array.from(memberEmailsSet);

            // Helper to resolve userId by email
            const findUserIdByEmail = async (email: string) => {
              // 1) central auth_db
              try {
                const authDb = client.db('auth_db');
                const authUsers = authDb.collection('authUsers');
                const authUser = await authUsers.findOne({ email });
                if (authUser?.userId) {
                  try { return new ObjectId(String(authUser.userId)); } catch {}
                }
              } catch {}
              // 2) company-specific users
              try {
                const companyDb = client.db(`company_${companyCode.toLowerCase()}`);
                const companyUsers = companyDb.collection('users');
                const companyUser = await companyUsers.findOne({ email });
                if (companyUser?._id) return companyUser._id;
              } catch {}
              return null;
            };

            const goalTitle = goal.title || '';
            const projectTitle = projectDocument.project_title || 'Project';
            const subject = `Your project ${projectTitle} has been linked to goal ${goalTitle}`;
            const linkPath = `/dashboard/goals/${resolvedParams.goalId}`;
            const projectIdStr = projectResult.insertedId.toString();

            for (const email of memberEmails) {
              try {
                const userId = await findUserIdByEmail(email);
                if (userId) {
                  await Notification.create({
                    userId,
                    type: 'project',
                    title: 'Project linked to a goal',
                    message: `Your project \"${projectTitle}\" has been linked to goal \"${goalTitle}\"`,
                    link: linkPath,
                    isRead: false,
                  });
                }
                await sendNotificationEmail(
                  email,
                  subject,
                  `Your project \"${projectTitle}\" has been linked to the goal \"${goalTitle}\".`,
                  projectTitle,
                  projectIdStr
                );
              } catch (notifErr) {
                console.error('[GOAL-PROJECT CREATE] Failed to notify', email, notifErr);
              }
            }
          } catch (notifyErr) {
            console.error('[GOAL-PROJECT CREATE] Notification/email dispatch error:', notifyErr);
            // do not fail the main operation due to notification issues
          }
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
    let companyCode = url.searchParams.get('companyCode') || '';
    
    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }
    
    // Get token from request headers
    const authHeader = request.headers.get('authorization');
    let dbUserRole = '';
    let userEmail = '';
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    const token = authHeader.split(' ')[1];
    const payload = await verifyAuth(token);
    
    if (!payload) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
    }
    
    // Set user info from token
    userEmail = payload.email || '';
    dbUserRole = payload.role || '';
    
    if (!companyCode) {
      return NextResponse.json({ error: 'Company code is required' }, { status: 400 });
    }
    
    // Use company-specific database
    const dbName = `company_${companyCode.toLowerCase()}`;
    const db = client.db(dbName);
    const goalsCol = db.collection<GoalDocument>(goalsCollection);
    const projectsCol = db.collection<ProjectDocument>(projectsCollection);
    
    // Verify goal exists and user has permission
    const goal = await goalsCol.findOne({
      _id: new ObjectId(resolvedParams.goalId)
    });
    
    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
    }
    
    // Check permission
    const allowedRoles = ['admin', 'top_management_tier_1', 'top_management_tier_2', 'top_management_tier_3'];
    const isAdminOrManagement = allowedRoles.includes(dbUserRole);
    const isGoalCreator = goal.createdBy === userEmail;
    const canManageGoal = isAdminOrManagement || isGoalCreator;

    console.log('Permission check:', {
      userEmail,
      userRole: dbUserRole,
      isAdminOrManagement,
      isGoalCreator,
      allowedRoles,
      goalCreatedBy: goal.createdBy,
      canManageGoal
    });

    if (!canManageGoal) {
      return NextResponse.json({ 
        error: 'Insufficient privileges to manage goal projects',
        details: {
          requiredRoles: allowedRoles,
          userRole: dbUserRole,
          isGoalCreator
        }
      }, { status: 403 });
    }
    
    // Start a session for the transaction
    // Flag to indicate if project doc was deleted from DB
      let deletedFromDb = false;
      const session = client.startSession();
    
    try {
      await session.withTransaction(async () => {
        console.log('Attempting to remove project:', projectId, 'from goal:', resolvedParams.goalId);
        
        const goalObjectId = new ObjectId(resolvedParams.goalId);
        const projectObjectId = new ObjectId(projectId);
        
        // 1. Remove project from goal's assignedProjects
        // Try to match both string and ObjectId formats
        const projectIdStr = projectObjectId.toString();
        console.log('Removing project with ID:', projectIdStr, 'from goal assignedProjects');
        
        let result = await goalsCol.updateOne(
          { _id: goalObjectId },
          { 
            $pull: { 
              assignedProjects: { 
                $or: [
                  { projectId: projectObjectId },
                  { projectId: projectIdStr },
                  { _id: projectObjectId },
                  { _id: projectIdStr }
                ]
              } as any // Type assertion needed for complex $or in $pull
            },
            $set: { updatedAt: new Date() }
          },
          { session }
        );
        
        console.log('Goal update result:', result);
        
        // If no match, try direct array manipulation as fallback
        if (result.modifiedCount === 0) {
          const goal = await goalsCol.findOne({ _id: goalObjectId }, { session });
          if (goal && Array.isArray(goal.assignedProjects)) {
            const projectIdStr = projectObjectId.toString();
            const updatedProjects = goal.assignedProjects.filter(p => {
              if (!p) return false;
              const pId = p.projectId?.toString() || p._id?.toString();
              return pId !== projectIdStr;
            });
            
            if (updatedProjects.length < goal.assignedProjects.length) {
              result = await goalsCol.updateOne(
                { _id: goalObjectId },
                { 
                  $set: { 
                    assignedProjects: updatedProjects,
                    updatedAt: new Date() 
                  }
                },
                { session }
              );
            }
          }
        }
        
        if (result.modifiedCount === 0) {
          throw new Error('Project not found in goal or already removed');
        }
        
        // 2. Update the project's linkedToGoal status and clear goalContext
        await projectsCol.updateOne(
          { _id: projectObjectId },
          { 
            $set: { 
              linkedToGoal: false,
              goalContext: null,
              updatedAt: new Date()
            } 
          },
          { session }
        );

                // If project was originally created in this goal, remove it entirely
        const projectDoc = await projectsCol.findOne({ _id: projectObjectId }, { session });
        console.log('Fetched projectDoc for deletion check:', projectDoc);
        console.log('Comparing createdFromGoal:', projectDoc?.createdFromGoal, 'with goalId:', resolvedParams.goalId);
        if (projectDoc?.createdFromGoal) {
              console.log('Deleting project since createdFromGoal is truthy:', projectDoc.createdFromGoal);
          const delRes = await projectsCol.deleteOne({ _id: projectObjectId }, { session });
          deletedFromDb = delRes.deletedCount === 1;
        }
      });
      
      console.log(`Project ${projectId} removed from goal ${resolvedParams.goalId} and updated successfully`);
      return NextResponse.json({ 
        success: true, 
        message: 'Project removed from goal successfully',
        projectId,
        deletedFromDb
      });
      
    } catch (error) {
      console.error('Error in transaction:', error);
      throw error;
    } finally {
      await session.endSession();
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