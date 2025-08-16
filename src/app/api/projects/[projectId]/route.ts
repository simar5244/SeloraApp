import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/dbConnect';
import Notification from '@/models/Notification';
import { sendNotificationEmail } from '@/services/emailService';

const uri = process.env.MONGODB_URI!;
const JWT_SECRET = process.env.JWT_SECRET!;

export async function PATCH(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  let client: MongoClient | null = null;
  try {
    // Ensure params is properly awaited
    const resolvedParams = await Promise.resolve(params);
    const { projectId } = resolvedParams;
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

    client = new MongoClient(uri);
    await client.connect();

    // Determine database
    const companyCode = payload.companyCode || 'default';
    const dbToUse = companyCode ? `company_${String(companyCode).toLowerCase()}` : 'org_sim_db';
    const db = client.db(dbToUse);
    const defaultDbName = 'org_sim_db';

    // Load project first for permission checks
    const existing = await db.collection('projects').findOne({ _id: new ObjectId(projectId) });
    if (!existing) {
      await client.close();
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Permission: allow if admin or top management, or project member
    const role = (payload.role || '').toString();
    const isTopManagement = ['top_management_tier_1','top_management_tier_2','top_management_tier_3'].includes(role) || role.toLowerCase() === 'admin';
    const isMember = Array.isArray((existing as any).employees) && (existing as any).employees.some((e: any) =>
      e?.email === userEmail || e?.employee_email === userEmail || e?.user_email === userEmail
    );

    if (!isTopManagement && !isMember) {
      await client.close();
      return NextResponse.json({ error: 'Access Denied - Only project members or admin can edit projects' }, { status: 403 });
    }

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

    // Normalize linked_projects if provided
    if (body.linked_projects !== undefined) {
      if (Array.isArray(body.linked_projects)) {
        updateData.linked_projects = body.linked_projects.map((p: any) => ({
          projectId: p?.projectId || p?._id || p?.id,
          linkedAt: p?.linkedAt || new Date(),
          linkedBy: p?.linkedBy || userEmail,
        }));
      } else {
        updateData.linked_projects = [];
      }
    }

    const result = await db.collection('projects').updateOne(
      { _id: new ObjectId(projectId) },
      { $set: updateData }
    );

    if (result.modifiedCount > 0) {
      // If linked_projects were provided, notify members of newly linked projects
      if (body.linked_projects !== undefined) {
        try {
          // Build sets of existing and incoming linked project IDs
          const existingLinkedIds = new Set<string>();
          if (Array.isArray((existing as any).linked_projects)) {
            for (const lp of (existing as any).linked_projects) {
              const idVal = typeof lp === 'string' ? lp : (lp?.projectId || lp?._id || lp?.id);
              if (idVal) existingLinkedIds.add(String(idVal));
            }
          }

          const incomingLinkedIds = new Set<string>();
          if (Array.isArray((updateData as any).linked_projects)) {
            for (const lp of (updateData as any).linked_projects) {
              const idVal = lp?.projectId || lp?._id || lp?.id;
              if (idVal) incomingLinkedIds.add(String(idVal));
            }
          }

          const newlyLinked = Array.from(incomingLinkedIds).filter(id => !existingLinkedIds.has(id));

          if (newlyLinked.length > 0) {
            await dbConnect(companyCode);
            const clientRef = client!; // capture non-null client for closures

            // Helper to find user _id by email across known user stores
            const findUserIdByEmail = async (email: string) => {
              // 1) Try central auth_db linkage
              try {
                const authDb = clientRef.db('auth_db');
                const authUsers = authDb.collection('authUsers');
                const authUser = await authUsers.findOne({ email });
                if (authUser?.userId) {
                  try { return new ObjectId(String(authUser.userId)); } catch {}
                }
              } catch {}

              // 2) Try company-specific users collection
              try {
                const companyDb = clientRef.db(dbToUse);
                const companyUsers = companyDb.collection('users');
                const companyUser = await companyUsers.findOne({ email });
                if (companyUser?._id) return companyUser._id;
              } catch {}

              // 3) Try default org users as a last resort
              try {
                const defaultDb = clientRef.db(defaultDbName);
                const usersCol = defaultDb.collection('users');
                const defaultUser = await usersCol.findOne({ email });
                if (defaultUser?._id) return defaultUser._id;
              } catch {}

              return null;
            };

            // Helper to collect member emails from a project doc
            const collectEmails = (doc: any) => {
              const set = new Set<string>();
              const push = (val: any) => {
                if (!val) return;
                const email = (typeof val === 'string') ? val : (val.email || val.employee_email || val.user_email);
                if (email && typeof email === 'string') set.add(email.toLowerCase());
              };
              if (Array.isArray(doc?.employees)) doc.employees.forEach(push);
              if (Array.isArray(doc?.assignedEmployees)) doc.assignedEmployees.forEach(push);
              if (Array.isArray(doc?.assigned_employees)) doc.assigned_employees.forEach(push);
              if (Array.isArray(doc?.team_members)) doc.team_members.forEach(push);
              return Array.from(set);
            };

            const currentProjectIdStr = String(projectId);
            const currentTitle = (existing as any).project_title || (existing as any).name || (existing as any).title || 'Project';

            for (const linkedId of newlyLinked) {
              try {
                let linkedDoc: any = null;
                if (ObjectId.isValid(linkedId)) {
                  linkedDoc = await db.collection('projects').findOne({ _id: new ObjectId(linkedId) });
                }
                if (!linkedDoc) {
                  linkedDoc = await db.collection('projects').findOne({ project_id: linkedId });
                }
                if (!linkedDoc) continue;

                const linkedTitle = linkedDoc.project_title || linkedDoc.name || linkedDoc.title || 'Project';
                const recipientEmails = collectEmails(linkedDoc);

                const subject = `Project linked: ${currentTitle} ↔ ${linkedTitle}`;
                const message = `Your project "${linkedTitle}" was linked with "${currentTitle}".`;
                const linkPath = `/dashboard/projects/${currentProjectIdStr}`;

                for (const email of recipientEmails) {
                  try {
                    const userId = await findUserIdByEmail(email);
                    if (userId) {
                      await Notification.create({
                        userId,
                        type: 'project',
                        title: 'Project Linked',
                        message,
                        link: linkPath,
                        isRead: false,
                      });
                    }

                    await sendNotificationEmail(
                      email,
                      subject,
                      message + ' Click to view details.',
                      currentTitle,
                      currentProjectIdStr
                    );
                  } catch (lnErr) {
                    console.error('[PROJECT PATCH] Failed to notify linked project member', email, lnErr);
                  }
                }
              } catch (linkErr) {
                console.error('[PROJECT PATCH] Error processing linked project', linkedId, linkErr);
              }
            }
          }
        } catch (linkedNotifyErr) {
          console.error('[PROJECT PATCH] Linked-project notification/email error:', linkedNotifyErr);
        }
      }

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
  } finally {
    // Ensure the client is closed after operations
    try { if (client) await client.close(); } catch {}
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
