import { NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';

import { MongoClient, ObjectId } from 'mongodb';
import { z } from 'zod';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';
import { verifyAuth } from '@/lib/auth';
import dbConnect from '@/lib/dbConnect';
import Notification from '@/models/Notification';
import { sendNotificationEmail } from '@/services/emailService';

// Function to run the Python script as a child process
async function runPythonScript(scriptArgs: string[]): Promise<any> {
  return new Promise((resolve, reject) => {
    // Path to the Python script
    const scriptPath = join(process.cwd(), 'src', 'python', 'project_service.py');
    
    // Check if Python script exists
    if (!fs.existsSync(scriptPath)) {
      console.error(`Python script not found at ${scriptPath}`);
      return reject(new Error('Internal server error: Python script not found'));
    }

    // Temporary file to store output
    const outputFile = join(os.tmpdir(), `python_output_${Date.now()}.json`);
    
    // Command to run
    const pythonCommand = process.env.PYTHON_PATH || 'python3';
    const args = [scriptPath, '--output', outputFile, ...scriptArgs];
    
    console.log(`Running Python: ${pythonCommand} ${args.join(' ')}`);
    
    const pythonProcess = spawn(pythonCommand, args);
    
    let stdoutData = '';
    let stderrData = '';
    
    pythonProcess.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      stderrData += data.toString();
      console.error(`Python stderr: ${data}`);
    });
    
    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        console.error(`Python process exited with code ${code}`);
        console.error(`Python stderr: ${stderrData}`);
        return reject(new Error(`Python script execution failed with code ${code}`));
      }
      
      // Check if output file exists
      if (fs.existsSync(outputFile)) {
        try {
          const output = fs.readFileSync(outputFile, 'utf8');
          fs.unlinkSync(outputFile); // Clean up
          resolve(JSON.parse(output));
        } catch (error) {
          console.error('Error reading/parsing Python output:', error);
          reject(new Error('Error processing Python output'));
        }
      } else {
        console.error('Python output file not found');
        reject(new Error('Python output file not found'));
      }
    });
    
    pythonProcess.on('error', (error) => {
      console.error('Failed to start Python process:', error);
      reject(error);
    });
  });
}

// For this demo, implement in-memory project storage
let mockProjects = [
  {
    project_id: '1',
    project_title: 'Security System Upgrade',
    project_description: 'Implement enhanced security protocols across all communication channels',
    tech_stack: ['Python', 'Cryptography', 'Network Security'],
    start_date: new Date('2023-09-01'),
    end_date: new Date('2023-12-15'),
    department: 'IT Security',
    status: 'In Progress',
    priority: 'Critical',
    total_hours: 1200,
    employee_contributions: [
      { employee_id: '101', role: 'Project Lead', hours_per_week: 30, start_date: new Date('2023-09-01'), end_date: null, active: true },
      { employee_id: '102', role: 'Security Engineer', hours_per_week: 40, start_date: new Date('2023-09-01'), end_date: null, active: true },
    ],
    complexity_score: 85,
    impact_score: 95,
    risk_level: 'High',
    created_at: new Date('2023-08-15'),
    updated_at: new Date('2023-10-20')
  },
  {
    project_id: '2',
    project_title: 'Command Center Integration',
    project_description: 'Develop unified command center platform for cross-unit coordination',
    tech_stack: ['React', 'Node.js', 'WebRTC'],
    start_date: new Date('2023-10-15'),
    end_date: new Date('2024-03-30'),
    department: 'Operations',
    status: 'In Progress',
    priority: 'High',
    total_hours: 2400,
    employee_contributions: [
      { employee_id: '103', role: 'Technical Lead', hours_per_week: 35, start_date: new Date('2023-10-15'), end_date: null, active: true },
      { employee_id: '104', role: 'Frontend Developer', hours_per_week: 40, start_date: new Date('2023-10-15'), end_date: null, active: true },
      { employee_id: '105', role: 'Backend Developer', hours_per_week: 40, start_date: new Date('2023-10-15'), end_date: null, active: true },
    ],
    complexity_score: 78,
    impact_score: 90,
    risk_level: 'Medium',
    created_at: new Date('2023-09-20'),
    updated_at: new Date('2023-11-05')
  },
  {
    project_id: '3',
    project_title: 'Personnel Tracking System',
    project_description: 'GPS and biometric-based personnel tracking system for field operations',
    tech_stack: ['Java', 'Spring Boot', 'MongoDB', 'React Native'],
    start_date: new Date('2023-08-01'),
    end_date: new Date('2023-11-30'),
    department: 'Field Operations',
    status: 'Completed',
    priority: 'Medium',
    total_hours: 900,
    employee_contributions: [
      { employee_id: '106', role: 'Project Manager', hours_per_week: 20, start_date: new Date('2023-08-01'), end_date: new Date('2023-11-30'), active: false },
      { employee_id: '107', role: 'Mobile Developer', hours_per_week: 40, start_date: new Date('2023-08-01'), end_date: new Date('2023-11-30'), active: false },
      { employee_id: '108', role: 'Backend Developer', hours_per_week: 35, start_date: new Date('2023-08-01'), end_date: new Date('2023-11-30'), active: false },
    ],
    complexity_score: 65,
    impact_score: 75,
    risk_level: 'Low',
    created_at: new Date('2023-07-15'),
    updated_at: new Date('2023-12-01')
  },
  {
    project_id: '4',
    project_title: 'Secure Communication Protocol',
    project_description: 'Develop new encrypted communication protocol for sensitive information',
    tech_stack: ['C++', 'Cryptography', 'Protocol Design'],
    start_date: new Date('2024-01-15'),
    end_date: new Date('2024-06-30'),
    department: 'Research & Development',
    status: 'Planning',
    priority: 'Critical',
    total_hours: 3600,
    employee_contributions: [
      { employee_id: '109', role: 'Research Lead', hours_per_week: 30, start_date: new Date('2024-01-15'), end_date: null, active: true },
      { employee_id: '110', role: 'Cryptography Specialist', hours_per_week: 40, start_date: new Date('2024-01-15'), end_date: null, active: true },
      { employee_id: '111', role: 'Security Auditor', hours_per_week: 20, start_date: new Date('2024-03-01'), end_date: null, active: true },
    ],
    complexity_score: 95,
    impact_score: 98,
    risk_level: 'High',
    created_at: new Date('2023-11-10'),
    updated_at: new Date('2023-12-05')
  },
  {
    project_id: '5',
    project_title: 'Resource Allocation System',
    project_description: 'AI-powered system for optimal resource allocation in time-critical scenarios',
    tech_stack: ['Python', 'TensorFlow', 'React', 'FastAPI'],
    start_date: new Date('2023-12-01'),
    end_date: new Date('2024-08-31'),
    department: 'Strategic Planning',
    status: 'In Progress',
    priority: 'High',
    total_hours: 4800,
    employee_contributions: [
      { employee_id: '112', role: 'AI Specialist', hours_per_week: 40, start_date: new Date('2023-12-01'), end_date: null, active: true },
      { employee_id: '113', role: 'Data Scientist', hours_per_week: 35, start_date: new Date('2023-12-01'), end_date: null, active: true },
      { employee_id: '114', role: 'Frontend Developer', hours_per_week: 30, start_date: new Date('2024-01-15'), end_date: null, active: true },
      { employee_id: '115', role: 'Backend Developer', hours_per_week: 30, start_date: new Date('2024-01-15'), end_date: null, active: true },
    ],
    complexity_score: 88,
    impact_score: 92,
    risk_level: 'Medium',
    created_at: new Date('2023-11-01'),
    updated_at: new Date('2023-12-10')
  }
];

// MongoDB connection string from environment variable
const uri = process.env.MONGODB_URI || '';
const defaultDbName = 'org_sim_db';
const projectsCollection = 'projects'; // Use consistent collection name across all company DBs

// GET handler to retrieve projects
export async function GET(request: Request) {
  noStore();
  const client = new MongoClient(uri);
  
  try {
    console.log('GET /api/projects request received');
    await client.connect();
    
    const url = new URL(request.url);
    const projectId = url.searchParams.get('projectId');
    const userId = url.searchParams.get('userId') || '';
    const userEmail = url.searchParams.get('userEmail') || userId;
    const linkedToGoal = url.searchParams.get('linkedToGoal');
    const goalId = url.searchParams.get('goalId');
    
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
      console.error('Company code missing for project access');
      return NextResponse.json({ error: 'Company code required for project access' }, { status: 400 });
    }
    
    // Use company-specific database
    const dbName = `company_${companyCode.toLowerCase()}`;
    const db = client.db(dbName);
    const collection = db.collection(projectsCollection);
    
    console.log(`Using company-specific database: ${dbName}`);
    
    // Check if user is top management
    const isTopManagement = ['top_management_tier_1', 'top_management_tier_2', 'top_management_tier_3'].includes(dbUserRole || '') || (dbUserRole || '').toLowerCase() === 'admin';
    console.log(`User is top management: ${isTopManagement}`);
    
    console.log(`API Projects GET Request - projectId: ${projectId}, userEmail: ${userEmail}, userRole: ${dbUserRole}, companyCode: ${companyCode}`);

    if (projectId) {
      // Single project fetch
      let project: any = null;
      
      // Handle valid ObjectId 
      if (projectId && ObjectId.isValid(projectId)) {
        project = await collection.findOne({ _id: new ObjectId(projectId) });
      }
      // Fall back to string ID matching if needed
      if (!project && projectId) {
        project = await collection.findOne({ project_id: projectId });
      }

      if (!project) {
        console.log(`Project not found: ${projectId}`);
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }

      // Check if user has access to this project
      if (userEmail && dbUserRole) {
        const isTopManagement = ['top_management_tier_1', 'top_management_tier_2', 'top_management_tier_3'].includes(dbUserRole) || dbUserRole.toLowerCase() === 'admin';
        const isViewer = Array.isArray(project.viewers) && project.viewers.some((m: any) => 
          m.email === userEmail || m.user_email === userEmail);
        const isMember = Array.isArray(project.employees) && project.employees.some((e: any) => 
          e.email === userEmail || e.employee_email === userEmail);
        
        // User can access if:
        // 1. They are in top management (can see all projects), OR
        // 2. The project is marked visibleToAll, OR
        // 3. They are assigned as a member/employee (edit rights), OR 
        // 4. They are listed as a viewer of the project (view-only rights)
        if (!isTopManagement && !project.visibleToAll && !isViewer && !isMember) {
          console.log(`User ${userEmail} does not have access to project ${projectId}`);
          return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
      }

      // Format project ID
      if (!project.id && project._id) {
        project.id = project._id.toString();
      }
      
      // Map criticality to priority if needed
      if (project.criticality && !project.priority) {
        project.priority = project.criticality;
      }
      
      // Ensure isManagementProject flag is set correctly
      if (project.createdByRole && ['top_management_tier_1', 'top_management_tier_2', 'top_management_tier_3'].includes(project.createdByRole)) {
        project.isManagementProject = true;
      }
      
      // Populate linkedProjects with titles (support both legacy camelCase and new snake_case storage)
      const collectLinkedIds = () => {
        const ids: string[] = [];
        // If already stored as array of IDs
        if (Array.isArray(project.linkedProjects) && project.linkedProjects.length > 0) {
          for (const v of project.linkedProjects) {
            if (typeof v === 'string') ids.push(v);
            else if (v && (v.id || v._id || v.projectId)) ids.push(String(v.id || v._id || v.projectId));
          }
        }
        // If stored as normalized objects under linked_projects
        if (Array.isArray(project.linked_projects) && project.linked_projects.length > 0) {
          for (const v of project.linked_projects) {
            if (!v) continue;
            const idVal = typeof v === 'string' ? v : (v.projectId || v._id || v.id);
            if (idVal) ids.push(String(idVal));
          }
        }
        // Dedupe
        return Array.from(new Set(ids));
      };
      const linkedIds = collectLinkedIds();
      if (linkedIds.length > 0) {
        const lpIds = linkedIds.filter(ObjectId.isValid).map((id: string) => new ObjectId(id));
        const linkedDocs = lpIds.length > 0
          ? await collection.find({ _id: { $in: lpIds } }).toArray()
          : [];
        const linkedDocsMap = new Map<string, any>(linkedDocs.map(d => [d._id.toString(), d]));
        project.linkedProjects = linkedIds.map((id: string) => {
          const doc = linkedDocsMap.get(id);
          return { id, title: doc ? (doc.project_title || doc.name) : 'Project' };
        });
      } else {
        project.linkedProjects = [];
      }
      
      console.log(`Project found: ${project.project_title || project.title || 'Unnamed Project'}`);
      return NextResponse.json({ project });

    } else {
      // Fetch all projects with access control
      
      // Define the base query for projects in this company
      let query: any = {};
      
      // Add linkedToGoal filter if specified
      if (linkedToGoal === 'true') {
        query.linkedToGoal = true;
        
        // If goalId is also specified, filter by that specific goal
        if (goalId) {
          query['goalContext.goalId'] = goalId;
          console.log(`Filtering projects linked to goal: ${goalId}`);
        }
      } else if (userEmail) {
      // Apply filters based on user role and permissions
      
        // Users can see projects if:
        // 1. They are in top management (can see all projects), OR
        // 2. The project is marked visibleToAll, OR
        // 3. They are assigned as a member/employee (edit rights), OR 
        // 4. They are listed as a viewer of the project (view-only rights)
        if (!isTopManagement) {
          query = {
            $or: [
              { visibleToAll: true },
              { 'employees.email': userEmail },
              { 'employees.employee_email': userEmail },
              { 'viewers.email': userEmail },
              { 'viewers.user_email': userEmail }
            ]
          };
          
          console.log(`Applied access filter for user ${userEmail} with role ${dbUserRole}:`, JSON.stringify(query, null, 2));
        } else {
          console.log('User is top management, showing all projects');
        }
      }
      
      const projects = await collection.find(query).toArray();
      console.log(`Found ${projects.length} projects in company ${companyCode}`);
      
      // Format projects
      const formattedProjects = projects.map((p: any) => {
        // Format ID
        if (!p.id && p._id) p.id = p._id.toString();
        
        // Map criticality to priority if needed
        if (p.criticality && !p.priority) {
          p.priority = p.criticality;
        }
        
        // Ensure isManagementProject flag is always set correctly
        if (p.createdByRole && ['top_management_tier_1', 'top_management_tier_2', 'top_management_tier_3'].includes(p.createdByRole)) {
          p.isManagementProject = true;
        }
        
        // Name mapping
        if (p.project_title && !p.name) {
          p.name = p.project_title;
        }
        
        return p;
      });
      
      return NextResponse.json({ 
        projects, 
        meta: { 
          count: projects.length,
          companyCode
        } 
      });
    }
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch projects' },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}

// Task schema validation
const taskSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  assignees: z.array(z.string()).optional(),
  estimatedHours: z.number().min(0, "Hours cannot be negative").optional(),
  technologies: z.array(z.string()).optional(),
});

// Project schema validation
const projectSchema = z.object({
  name: z.string().min(2, "Project name must be at least 2 characters."),
  description: z.string().min(10, "Description must be at least 10 characters."),
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()),
  teamMembers: z.array(z.string()).min(1, "At least one team member is required."),
  tasks: z.array(taskSchema).optional(),
  technologies: z.array(z.string()).optional(),
});

// POST handler to create a new project
export async function POST(request: Request) {
  noStore(); // Ensure dynamic behavior
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    
    // Parse input data from JSON
    const requestData = await request.json();
    console.log('Received project creation request:', requestData);

    // Get creator info
    const url = new URL(request.url);
    const creatorId = url.searchParams.get('userId') || requestData.creatorId || '';
    const creatorEmail = url.searchParams.get('userEmail') || requestData.creatorEmail || '';
    
    // Get token from request headers
    const authHeader = request.headers.get('authorization');
    let companyCode = url.searchParams.get('companyCode') || requestData.companyCode || '';
    let creatorRole = '';
    
    // Get user data from token if available
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const payload = await verifyAuth(token);
      if (payload) {
        // Get company code from token
        companyCode = payload.companyCode || companyCode;
        creatorRole = payload.role || '';
        console.log(`User authenticated via token: ${payload.email}, Company: ${companyCode}, Role: ${creatorRole}`);
      }
    }
    
    // If no company code yet, try to get from user record
    if (!companyCode && creatorEmail) {
      const defaultDb = client.db(defaultDbName);
      const usersCol = defaultDb.collection('users');
      const userDoc = await usersCol.findOne({ email: creatorEmail });
      if (userDoc) {
        companyCode = (userDoc as any).companyCode || '';
        creatorRole = (userDoc as any).role || requestData.creatorRole || '';
      }
    }
    
    if (!companyCode) {
      console.error('Company code missing for project creation');
      return NextResponse.json({ error: 'Company code required for project creation' }, { status: 400 });
    }
    
    // Use company-specific database
    const dbName = `company_${companyCode.toLowerCase()}`;
    const db = client.db(dbName);
    const collection = db.collection(projectsCollection);
    
    console.log(`Using company-specific database for project creation: ${dbName}`);
    
    // Fall back to request data if not found in token or DB
    if (!creatorRole) {
      creatorRole = requestData.creatorRole || url.searchParams.get('userRole') || '';
    }
    
    const creatorName = requestData.creatorName || '';
    
    // Check if creator is top management
    const isTopManagementCreator = 
      ['top_management_tier_1', 'top_management_tier_2', 'top_management_tier_3'].includes(creatorRole);
    
    // Default visibleToAll to true if not specified
    const visibleToAll = requestData.visibleToAll !== false;
    
    // Prepare the document to be inserted
    const dataToInsert: any = {
      ...requestData, // Include all fields passed from frontend
      createdByRole: creatorRole, // Ensure createdByRole is set
      isManagementProject: isTopManagementCreator, // Flag if created by top management
      visibleToAll: visibleToAll, // Make visible by default
      companyCode: companyCode, // Store company code in the project document
      created_at: new Date(), // Add creation timestamp
      updated_at: new Date(), // Add initial update timestamp
      linked_projects: [], // Initialize empty array for linked projects
      linkedToGoal: false // Initialize linkedToGoal flag
    };
    
    // Normalize linked projects input from either camelCase (linkedProjects) or snake_case (linked_projects)
    if (requestData.linkedProjects !== undefined && Array.isArray(requestData.linkedProjects)) {
      dataToInsert.linked_projects = requestData.linkedProjects.map((p: any) => ({
        projectId: typeof p === 'string' ? p : (p?.projectId || p?._id || p?.id),
        linkedAt: new Date(),
        linkedBy: creatorEmail
      })).filter((lp: any) => !!lp.projectId);
      // Also maintain legacy field as array of IDs for frontend compatibility
      (dataToInsert as any).linkedProjects = dataToInsert.linked_projects.map((lp: any) => lp.projectId);
      delete dataToInsert.linkedProjects;
    } else if (requestData.linked_projects) {
      // If linked_projects is provided, ensure it's properly formatted
      dataToInsert.linked_projects = Array.isArray(requestData.linked_projects) 
        ? requestData.linked_projects.map((p: any) => ({
            projectId: typeof p === 'string' ? p : (p?.projectId || p?._id || p?.id),
            linkedAt: new Date(),
            linkedBy: creatorEmail
          })).filter((lp: any) => !!lp.projectId)
        : [];
      // Maintain legacy field
      (dataToInsert as any).linkedProjects = dataToInsert.linked_projects.map((lp: any) => lp.projectId);
    }

    // Handle field name mapping
    if (requestData.name && !requestData.project_title) {
        dataToInsert.project_title = requestData.name;
        delete dataToInsert.name;
    }
    if (requestData.description && !requestData.project_description) {
        dataToInsert.project_description = requestData.description;
        delete dataToInsert.description;
    }
    if (requestData.startDate && !requestData.start_date) {
        dataToInsert.start_date = requestData.startDate;
        delete dataToInsert.startDate;
    }
    if (requestData.endDate && !requestData.end_date) {
        dataToInsert.end_date = requestData.endDate;
        delete dataToInsert.endDate;
    }
    if (requestData.toolsUsed && !requestData.tools_used){
        dataToInsert.tools_used = requestData.toolsUsed;
        delete dataToInsert.toolsUsed;
    }
    if (requestData.criticality && !requestData.priority) {
        dataToInsert.priority = requestData.criticality;
        delete dataToInsert.criticality;
    }
    if (requestData.total_budget){ 
        dataToInsert.total_budget = parseFloat(requestData.total_budget) || 0;
    }
     
    // Ensure arrays are initialized
    dataToInsert.employees = requestData.employees || [];
    dataToInsert.viewers = requestData.viewers || [];
    
    // If "visibleToAll" is true and the viewers array doesn't contain all users,
    // we'll handle that at query time instead of storing all users
    
    // Ensure creator is added as a member (employee) if email is available
    if (creatorEmail) {
      // Add to employees if not already there
      if (!dataToInsert.employees.some((e: any) => e.email === creatorEmail)) {
        dataToInsert.employees.push({
          name: creatorName || creatorEmail,
          email: creatorEmail,
          role: 'Creator',
          department: requestData.department || 'Unknown'
        });
      }
    }
    
    console.log('Inserting project document into company database:', dataToInsert);
    
    // Insert the new project
    const result = await collection.insertOne(dataToInsert);
    console.log(`Project inserted with ID: ${result.insertedId} in company DB: ${dbName}`);
    
    // Create notifications and send emails to assigned members (including creator)
    try {
      // Ensure DB connection for Notification model
      await dbConnect(companyCode);

      // Build a unique set of member emails from various possible fields
      const memberEmailsSet = new Set<string>();
      const pushEmail = (val: any) => {
        if (!val) return;
        const email = (typeof val === 'string') ? val : (val.email || val.employee_email || val.user_email);
        if (email && typeof email === 'string') memberEmailsSet.add(email.toLowerCase());
      };

      // From employees array (this API uses employees for members)
      if (Array.isArray(dataToInsert.employees)) {
        dataToInsert.employees.forEach(pushEmail);
      }

      // From assignedEmployees or assigned_employees payloads
      if (Array.isArray(requestData.assignedEmployees)) {
        requestData.assignedEmployees.forEach(pushEmail);
      }
      if (Array.isArray(requestData.assigned_employees)) {
        requestData.assigned_employees.forEach(pushEmail);
      }

      // From team_members (some flows may provide this)
      if (Array.isArray(requestData.team_members)) {
        requestData.team_members.forEach(pushEmail);
      }

      // Include creator if available
      if (creatorEmail) pushEmail({ email: creatorEmail });

      const memberEmails = Array.from(memberEmailsSet);

      // Resolve userIds by email for Notification.userId (fallback to skipping if user not found)
      const defaultDb = client.db(defaultDbName);
      const usersCol = defaultDb.collection('users');

      // Helper to find user _id by email across known user stores
      const findUserIdByEmail = async (email: string) => {
        // 1) Try central auth_db linkage
        try {
          const authDb = client.db('auth_db');
          const authUsers = authDb.collection('authUsers');
          const authUser = await authUsers.findOne({ email });
          if (authUser?.userId) {
            // If authUser.userId is a valid ObjectId, prefer that
            try {
              return new ObjectId(String(authUser.userId));
            } catch {}
          }
        } catch {}

        // 2) Try default org users
        const defaultUser = await usersCol.findOne({ email });
        if (defaultUser?._id) return defaultUser._id;

        // 3) Try company-specific users collection
        try {
          const companyDb = client.db(dbName);
          const companyUsers = companyDb.collection('users');
          const companyUser = await companyUsers.findOne({ email });
          if (companyUser?._id) return companyUser._id;
        } catch {}

        return null;
      };

      const projectIdStr = result.insertedId.toString();
      const projectTitle = dataToInsert.project_title || dataToInsert.name || 'New Project';
      const subject = `You were added to a project: ${projectTitle}`;
      const linkPath = `/dashboard/projects/${projectIdStr}`;

      // Create notifications sequentially (keep it simple and reliable)
      for (const email of memberEmails) {
        try {
          const userId = await findUserIdByEmail(email);
          if (userId) {
            await Notification.create({
              userId,
              type: 'project',
              title: 'Added to a project',
              message: `You were added as a member to "${projectTitle}"`,
              link: linkPath,
              isRead: false,
            });
          }

          // Send email (best-effort; uses fallback logger if SMTP not configured)
          await sendNotificationEmail(
            email,
            subject,
            `You have been added as a member to the project "${projectTitle}". Click the button below to view the project details and get started.`,
            projectTitle,
            projectIdStr
          );
        } catch (notifErr) {
          console.error('[PROJECT CREATE] Failed to create/send notification for', email, notifErr);
        }
      }
    } catch (notifyError) {
      console.error('[PROJECT CREATE] Notification/email dispatch error:', notifyError);
      // Do not fail project creation because of notification issues
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Project created successfully',
      projectId: result.insertedId.toString(),
      companyCode: companyCode
    });

  } catch (error: any) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create project', details: error.message },
      { status: 500 }
    );
  } finally {
    await client.close();
  }
}

// Function to export project data to CSV format
function exportProjectToCSV(projectData: any, projectId: string) {
  try {
    // Prepare data for CSV
    const mainRecord = {
      project_id: projectId,
      project_title: projectData.project_title,
      project_description: projectData.project_description,
      start_date: projectData.start_date,
      end_date: projectData.end_date || '',
      department: projectData.department,
      status: projectData.status,
      priority: projectData.priority,
      total_hours: projectData.total_hours || 0,
      budget: projectData.budget || 0,
      tech_stack: Array.isArray(projectData.tech_stack) ? projectData.tech_stack.join(', ') : '',
      methodologies: Array.isArray(projectData.methodologies) ? projectData.methodologies.join(', ') : '',
      created_at: new Date().toISOString()
    };
    
    const csvData = [mainRecord];
    
    // Add employee contributions
    if (Array.isArray(projectData.employee_contributions)) {
      projectData.employee_contributions.forEach((contribution: any) => {
        // For each employee contribution
        if (Array.isArray(contribution.tasks)) {
          contribution.tasks.forEach((task: any) => {
            // Add a record for each task
            const taskRecord = {
              project_id: projectId,
              project_title: projectData.project_title,
              employee: contribution.employeeId || contribution.employee_id,
              employee_name: contribution.employeeName || contribution.name,
              role: contribution.role,
              task_description: task.description,
              task_hours: task.hours,
              task_status: task.status
            };
            // Use type assertion to avoid type checking for different record shapes
            csvData.push(taskRecord as any);
          });
        }
      });
    }
    
    // Convert to CSV string
    const csvString = stringify(csvData, {
      header: true,
      columns: Object.keys(csvData[0])
    });
    
    // In a real environment, this would write to a file system or cloud storage
    // For this example, we'll log the contents
    console.log('Project CSV data created:', csvString.substring(0, 200) + '...');
    
    // If we have filesystem access, try to write the file
    try {
      const filePath = join(process.cwd(), 'project_data');
      const fileName = `project_${projectId}.csv`;
      const fullPath = join(filePath, fileName);
      writeFileSync(fullPath, csvString);
      console.log(`CSV file saved to ${fullPath}`);
    } catch (fileError) {
      console.error('Could not write CSV file to filesystem:', fileError);
      // This is expected in many environments, so just log the error
    }
    
    return csvString;
  } catch (error) {
    console.error('Error exporting project to CSV:', error);
    throw error;
  }
}

// PUT handler for updating projects
export async function PUT(req: Request) {
  const client = new MongoClient(uri);
  await client.connect();
  const data = await req.json();
  const { projectId, ...updateData } = data;
  
  try {
    // Remove immutable fields if present
    delete (updateData as any)._id;
    delete (updateData as any).id;
    
    if (!projectId) {
      return NextResponse.json({ success: false, message: 'Project ID is required' }, { status: 400 });
    }
    
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId') || '';
    const userEmail = url.searchParams.get('userEmail') || userId;
    
    // Get token from request headers
    const authHeader = req.headers.get('authorization');
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
      console.error('Company code missing for project access');
      return NextResponse.json({ error: 'Company code required for project access' }, { status: 400 });
    }
    
    // Use company-specific database
    const dbName = `company_${companyCode.toLowerCase()}`;
    const db = client.db(dbName);
    const collection = db.collection(projectsCollection);
    
    console.log(`Using company-specific database: ${dbName}`);
    
    // Get the project first to check permissions
    const project = await collection.findOne({ _id: new ObjectId(projectId) });
    
    if (!project) {
      return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 });
    }
    
    // Check if user has edit permissions
    const isTopManagement = ['top_management_tier_1', 'top_management_tier_2', 'top_management_tier_3'].includes(dbUserRole) || (dbUserRole || '').toLowerCase() === 'admin';
    
    // Check if user is a member (employee) of the project
    const isMember = Array.isArray(project.employees) && project.employees.some((e: any) => 
      e.email === userEmail || e.employee_email === userEmail
    );
    
    // Only users with member status (employees) or top management can edit projects
    if (!isMember && !isTopManagement) {
      return NextResponse.json({ 
        success: false, 
        message: 'Access Denied - Only project members or top management can edit projects' 
      }, { status: 403 });
    }
    
    // Handle field mapping
    if (updateData.name && !updateData.project_title) {
      updateData.project_title = updateData.name;
      delete updateData.name;
    }
    if (updateData.description && !updateData.project_description) {
      updateData.project_description = updateData.description;
      delete updateData.description;
    }
    if (updateData.startDate && !updateData.start_date) {
      updateData.start_date = updateData.startDate;
      delete updateData.startDate;
    }
    if (updateData.endDate && !updateData.end_date) {
      updateData.end_date = updateData.endDate;
      delete updateData.endDate;
    }
    if (updateData.criticality && !updateData.priority) {
      updateData.priority = updateData.criticality;
      delete updateData.criticality;
    }
    
    // Accept camelCase linkedProjects from UI and normalize to linked_projects
    if ((updateData as any).linkedProjects !== undefined) {
      const arr: any[] = Array.isArray((updateData as any).linkedProjects) ? (updateData as any).linkedProjects : [];
      (updateData as any).linked_projects = arr.map((p: any) => ({
        projectId: typeof p === 'string' ? p : (p?.projectId || p?._id || p?.id),
        linkedAt: new Date(),
        linkedBy: userEmail
      })).filter((lp: any) => !!lp.projectId);
      // Also write legacy field for compatibility
      (updateData as any).linkedProjects = (updateData as any).linked_projects.map((lp: any) => lp.projectId);
      delete (updateData as any).linkedProjects;
    }

    // Handle linked_projects updates
    if (updateData.linked_projects !== undefined) {
      if (Array.isArray(updateData.linked_projects)) {
        updateData.linked_projects = updateData.linked_projects.map((p: any) => ({
          projectId: typeof p === 'string' ? p : (p?.projectId || p?._id || p?.id),
          linkedAt: (typeof p === 'string' ? undefined : p?.linkedAt) || new Date(),
          linkedBy: (typeof p === 'string' ? undefined : p?.linkedBy) || userEmail
        })).filter((lp: any) => !!lp.projectId);
        // Keep camelCase mirror for UI consumption
        (updateData as any).linkedProjects = updateData.linked_projects.map((lp: any) => lp.projectId);
      } else {
        updateData.linked_projects = [];
        (updateData as any).linkedProjects = [];
      }
    }
    
    // Collect existing member emails from current project for diffing
    const existingMemberEmailsSet = new Set<string>();
    if (Array.isArray((project as any).employees)) {
      for (const e of (project as any).employees) {
        const em = (e?.email || e?.employee_email || e?.user_email || '').toLowerCase();
        if (em) existingMemberEmailsSet.add(em);
      }
    }

    // Collect incoming member emails from various possible payload fields (if provided)
    const incomingMemberEmailsSet = new Set<string>();
    const pushEmail = (val: any) => {
      if (!val) return;
      const email = (typeof val === 'string') ? val : (val.email || val.employee_email || val.user_email);
      if (email && typeof email === 'string') incomingMemberEmailsSet.add(email.toLowerCase());
    };
    let memberFieldsProvided = false;
    if (Array.isArray((updateData as any).employees)) {
      memberFieldsProvided = true;
      (updateData as any).employees.forEach(pushEmail);
    }
    if (Array.isArray((updateData as any).assignedEmployees)) {
      memberFieldsProvided = true;
      (updateData as any).assignedEmployees.forEach(pushEmail);
    }
    if (Array.isArray((updateData as any).assigned_employees)) {
      memberFieldsProvided = true;
      (updateData as any).assigned_employees.forEach(pushEmail);
    }
    if (Array.isArray((updateData as any).team_members)) {
      memberFieldsProvided = true;
      (updateData as any).team_members.forEach(pushEmail);
    }

    // Update the project
    const result = await collection.updateOne(
      { _id: new ObjectId(projectId) }, 
      { $set: { ...updateData, updated_at: new Date() } }
    );
    
    if (result.matchedCount === 1) {
      // If member fields were provided, notify only newly added members
      if (memberFieldsProvided && incomingMemberEmailsSet.size > 0) {
        try {
          // Ensure DB connection for Notification model
          await dbConnect(companyCode);

          // Helper to find user _id by email across known user stores
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
              const companyDb = client.db(dbName);
              const companyUsers = companyDb.collection('users');
              const companyUser = await companyUsers.findOne({ email });
              if (companyUser?._id) return companyUser._id;
            } catch {}

            // 3) Try default org users as a last resort
            try {
              const defaultDb = client.db(defaultDbName);
              const usersCol = defaultDb.collection('users');
              const defaultUser = await usersCol.findOne({ email });
              if (defaultUser?._id) return defaultUser._id;
            } catch {}

            return null;
          };

          // Determine project details for messaging
          const projectIdStr = String(projectId);
          const projectTitle = (updateData as any).project_title || (updateData as any).name || (project as any).project_title || (project as any).name || 'Project';
          const subject = `You were added to a project: ${projectTitle}`;
          const linkPath = `/dashboard/projects/${projectIdStr}`;

          // Compute newly added emails = incoming - existing
          const newlyAdded = Array.from(incomingMemberEmailsSet).filter(e => !existingMemberEmailsSet.has(e));

          for (const email of newlyAdded) {
            try {
              const userId = await findUserIdByEmail(email);
              if (userId) {
                await Notification.create({
                  userId,
                  type: 'project',
                  title: 'Added to a project',
                  message: `You were added as a member to "${projectTitle}"`,
                  link: linkPath,
                  isRead: false,
                });
              }

              // Send email (best-effort)
              await sendNotificationEmail(
                email,
                subject,
                `You have been added as a member to the project "${projectTitle}". Click the button below to view the project details and get started.`,
                projectTitle,
                projectIdStr
              );
            } catch (notifErr) {
              console.error('[PROJECT UPDATE] Failed to create/send notification for', email, notifErr);
            }
          }
        } catch (notifyError) {
          console.error('[PROJECT UPDATE] Notification/email dispatch error:', notifyError);
          // Do not fail the update because of notification issues
        }
      }

      // If linked projects were provided, notify members of newly linked projects
      if ((updateData as any).linked_projects !== undefined) {
        try {
          // Build sets of existing and incoming linked project IDs
          const existingLinkedIds = new Set<string>();
          if (Array.isArray((project as any).linked_projects)) {
            for (const lp of (project as any).linked_projects) {
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

          // Compute newly linked = incoming - existing
          const newlyLinked = Array.from(incomingLinkedIds).filter(id => !existingLinkedIds.has(id));

          if (newlyLinked.length > 0) {
            // Ensure DB connection for Notification model
            await dbConnect(companyCode);

            // Helper to find user _id by email across known user stores
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
                const companyDb = client.db(dbName);
                const companyUsers = companyDb.collection('users');
                const companyUser = await companyUsers.findOne({ email });
                if (companyUser?._id) return companyUser._id;
              } catch {}

              // 3) Try default org users as a last resort
              try {
                const defaultDb = client.db(defaultDbName);
                const usersCol = defaultDb.collection('users');
                const defaultUser = await usersCol.findOne({ email });
                if (defaultUser?._id) return defaultUser._id;
              } catch {}

              return null;
            };

            // Helper to collect emails from a project document
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
            const currentTitle = (project as any).project_title || (project as any).name || (project as any).title || 'Project';

            for (const linkedId of newlyLinked) {
              try {
                let linkedDoc: any = null;
                if (ObjectId.isValid(linkedId)) {
                  linkedDoc = await collection.findOne({ _id: new ObjectId(linkedId) });
                }
                if (!linkedDoc) {
                  linkedDoc = await collection.findOne({ project_id: linkedId });
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
                    console.error('[PROJECT UPDATE] Failed to notify linked project member', email, lnErr);
                  }
                }
              } catch (linkErr) {
                console.error('[PROJECT UPDATE] Error processing linked project', linkedId, linkErr);
              }
            }
          }
        } catch (linkedNotifyErr) {
          console.error('[PROJECT UPDATE] Linked-project notification/email error:', linkedNotifyErr);
        }
      }

      return NextResponse.json({ success: true, message: 'Project updated successfully' });
    } else {
      return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 });
    }
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json({ success: false, error: 'Failed to update project' }, { status: 500 });
  } finally {
    await client.close();
  }
}

// DELETE handler for deleting projects
export async function DELETE(req: Request) {
  const client = new MongoClient(uri);
  await client.connect();
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');
  if (!projectId) {
    return NextResponse.json({ success: false, message: 'Project ID is required' }, { status: 400 });
  }
  // Delete from MongoDB
  const url = new URL(req.url);
  let companyCode = url.searchParams.get('companyCode') || '';
  if (!companyCode) {
    console.error('Company code missing for project deletion');
    return NextResponse.json({ success: false, message: 'Company code required for project deletion' }, { status: 400 });
  }
  // Use company-specific database
  const dbName = `company_${companyCode.toLowerCase()}`;
  const db = client.db(dbName);
  const collection = db.collection(projectsCollection);
  const deleteRes = await collection.deleteOne({ _id: new ObjectId(projectId) });
  await client.close();
  if (deleteRes.deletedCount === 1) {
    return NextResponse.json({ success: true, message: 'Project deleted successfully' });
  } else {
    return NextResponse.json({ success: false, message: 'Project not found' }, { status: 404 });
  }
} 