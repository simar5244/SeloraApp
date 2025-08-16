import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { verifyAuth } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import Notification from '@/models/Notification';
import { sendNotificationEmail } from '@/services/emailService';

const uri = process.env.MONGODB_URI || '';
const projectsCollection = 'projects';

export async function POST(request: NextRequest, { params }: { params: { projectId: string } }) {
  const { projectId } = params;
  // Authenticate user
  const authHeader = request.headers.get('authorization');
  let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : request.cookies.get('token')?.value;
  if (!token) {
    return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
  }
  const payload = await verifyAuth(token);
  if (!payload) {
    return NextResponse.json({ success: false, message: 'Invalid or expired token' }, { status: 401 });
  }
  const userEmail = payload.email || '';
  const userRole = payload.role || '';
  const companyCode = request.headers.get('X-Company-Code') || payload.companyCode || '';
  if (!companyCode) {
    return NextResponse.json({ success: false, message: 'Company code required' }, { status: 400 });
  }

  // Parse body
  const body = await request.json();
  const { linkedProjectId } = body;
  if (!linkedProjectId) {
    return NextResponse.json({ success: false, message: 'linkedProjectId is required' }, { status: 400 });
  }

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(`company_${companyCode.toLowerCase()}`);
  const col = db.collection(projectsCollection);

  // Fetch main project for permission check
  const project = await col.findOne({ _id: new ObjectId(projectId) });
  if (!project) {
    await client.close();
    return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 });
  }
  const isTopManagement = ['top_management_tier_1','top_management_tier_2','top_management_tier_3'].includes(userRole);
  const isMember = Array.isArray(project.employees) && project.employees.some((e: any) => e.email === userEmail || e.employee_email === userEmail);
  if (!isTopManagement && !isMember) {
    await client.close();
    return NextResponse.json({ success: false, message: 'Access Denied - cannot link projects' }, { status: 403 });
  }

  // Perform link: add to set
  await col.updateOne(
    { _id: new ObjectId(projectId) },
    { $addToSet: { linkedProjects: new ObjectId(linkedProjectId) } }
  );

  // Fetch the updated main project and the linked project document
  const updated = await col.findOne({ _id: new ObjectId(projectId) });
  const linkedProject = await col.findOne({ _id: new ObjectId(linkedProjectId) });

  // Best-effort notifications to members of the linked project
  try {
    if (linkedProject) {
      // Connect Mongoose to company DB for Notification model
      await dbConnect(companyCode);

      // Helper: find userId by email
      const findUserIdByEmail = async (email: string) => {
        // 1) Try central auth_db linkage
        try {
          const authDb = client.db('auth_db');
          const authUsers = authDb.collection('authUsers');
          const authUser = await authUsers.findOne({ email });
          if (authUser?.userId) {
            try { return new ObjectId(String(authUser.userId)); } catch {}
          }
        } catch {}

        // 2) Try company-specific users collection
        try {
          const companyDb = client.db(`company_${companyCode.toLowerCase()}`);
          const companyUsers = companyDb.collection('users');
          const companyUser = await companyUsers.findOne({ email });
          if (companyUser?._id) return companyUser._id;
        } catch {}

        // 3) Try default org users as a last resort
        try {
          const defaultDbName = 'org_sim_db';
          const defaultDb = client.db(defaultDbName);
          const usersCol = defaultDb.collection('users');
          const defaultUser = await usersCol.findOne({ email });
          if (defaultUser?._id) return defaultUser._id;
        } catch {}

        return null;
      };

      // Build member email lists for both projects
      const linkedMemberEmailsSet = new Set<string>();
      if (Array.isArray((linkedProject as any).employees)) {
        for (const e of (linkedProject as any).employees) {
          const em = (e?.email || e?.employee_email || e?.user_email || '').toLowerCase();
          if (em) linkedMemberEmailsSet.add(em);
        }
      }

      const mainMemberEmailsSet = new Set<string>();
      if (Array.isArray((updated as any)?.employees)) {
        for (const e of (updated as any).employees) {
          const em = (e?.email || e?.employee_email || e?.user_email || '').toLowerCase();
          if (em) mainMemberEmailsSet.add(em);
        }
      }

      const linkedMemberEmails = Array.from(linkedMemberEmailsSet);
      const mainMemberEmails = Array.from(mainMemberEmailsSet);

      const mainTitle = (updated as any)?.project_title || (updated as any)?.name || 'Project';
      const linkedTitle = (linkedProject as any)?.project_title || (linkedProject as any)?.name || 'Project';
      const subject = `Project linked: ${linkedTitle} ↔ ${mainTitle}`;

      // Notify linked project's members (their project got linked to main project)
      {
        const message = `Your project "${linkedTitle}" has been linked to the project "${mainTitle}".`;
        const linkProjectId = String(linkedProjectId); // link to their own project page
        for (const email of linkedMemberEmails) {
          try {
            const userId = await findUserIdByEmail(email);
            if (userId) {
              await Notification.create({
                userId,
                type: 'project',
                title: 'Project linked',
                message,
                link: `/dashboard/projects/${linkProjectId}`,
                isRead: false,
              });
            }

            await sendNotificationEmail(
              email,
              subject,
              `${message} Click the button below to view your project details.`,
              undefined,
              linkProjectId
            );
          } catch (notifErr) {
            console.error('[PROJECT LINK] Failed to create/send notification for', email, notifErr);
          }
        }
      }

      // Notify main project's members (their project got linked to linked project)
      {
        const message = `Your project "${mainTitle}" has been linked to the project "${linkedTitle}".`;
        const linkProjectId = String(projectId); // link to the main project page
        for (const email of mainMemberEmails) {
          try {
            const userId = await findUserIdByEmail(email);
            if (userId) {
              await Notification.create({
                userId,
                type: 'project',
                title: 'Project linked',
                message,
                link: `/dashboard/projects/${linkProjectId}`,
                isRead: false,
              });
            }

            await sendNotificationEmail(
              email,
              subject,
              `${message} Click the button below to view your project details.`,
              undefined,
              linkProjectId
            );
          } catch (notifErr) {
            console.error('[PROJECT LINK] Failed to create/send notification for', email, notifErr);
          }
        }
      }
    }
  } catch (notifyError) {
    console.error('[PROJECT LINK] Notification/email dispatch error:', notifyError);
    // Do not fail the operation due to notification errors
  }

  await client.close();
  return NextResponse.json({ success: true, project: updated });
}

// Handler to remove a linked project
export async function DELETE(request: NextRequest, { params }: { params: { projectId: string } }) {
  const { projectId } = params;
  // Authenticate user
  const authHeader = request.headers.get('authorization');
  let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : request.cookies.get('token')?.value;
  if (!token) return NextResponse.json({ success: false, message: 'Authentication required' }, { status: 401 });
  const payload = await verifyAuth(token);
  if (!payload) return NextResponse.json({ success: false, message: 'Invalid or expired token' }, { status: 401 });
  const userEmail = payload.email || '';
  const userRole = payload.role || '';
  const companyCode = request.headers.get('X-Company-Code') || payload.companyCode || '';
  if (!companyCode) return NextResponse.json({ success: false, message: 'Company code required' }, { status: 400 });

  // Parse body for linkedProjectId
  const body = await request.json();
  const { linkedProjectId } = body;
  if (!linkedProjectId) return NextResponse.json({ success: false, message: 'linkedProjectId is required' }, { status: 400 });

  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(`company_${companyCode.toLowerCase()}`);
  const col = db.collection(projectsCollection);

  // Permission check as in POST
  const project = await col.findOne({ _id: new ObjectId(projectId) });
  if (!project) { await client.close(); return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 }); }
  const isTopManagement = ['top_management_tier_1','top_management_tier_2','top_management_tier_3'].includes(userRole);
  const isMember = Array.isArray(project.employees) && project.employees.some((e: any) => e.email === userEmail || e.employee_email === userEmail);
  if (!isTopManagement && !isMember) { await client.close(); return NextResponse.json({ success: false, message: 'Access Denied - cannot unlink projects' }, { status: 403 }); }

  // Unlink
  await col.updateOne(
    { _id: new ObjectId(projectId) },
    { $pull: { linkedProjects: new ObjectId(linkedProjectId) } } as any
  );

  const updated = await col.findOne({ _id: new ObjectId(projectId) });
  await client.close();
  return NextResponse.json({ success: true, project: updated });
}
