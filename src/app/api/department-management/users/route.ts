import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import connectDB from '@/lib/dbConnect';
import User, { getUserModel } from '@/models/User';
import { connectToMongoDB } from '@/lib/dbConnect';
import { MongoClient } from 'mongodb';

// Helper function to extract token from Authorization header
const extractToken = (request: NextRequest): string | null => {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.split(' ')[1];
};

// Helper function to check if user has management permissions
const hasManagementPermissions = (userRole: string): boolean => {
  return ['admin', 'top_management_tier_1', 'top_management_tier_2', 'top_management_tier_3'].includes(userRole);
};

// Helper function to get user's department based on their data
const getUserDepartment = async (userEmail: string, companyCode?: string): Promise<string | null> => {
  try {
    // Connect to MongoDB to check merged_output collection for department info
    const uri = process.env.MONGODB_URI || '';
    const client = new MongoClient(uri);
    await client.connect();
    
    const dbToUse = companyCode ? `company_${companyCode}` : 'org_sim_db';
    const db = client.db(dbToUse);
    
    // Try to find department info in merged_output collection
    const mergedData = await db.collection('merged_output').findOne({ email: userEmail });
    
    await client.close();
    
    return mergedData?.department || null;
  } catch (error) {
    console.error('Error getting user department:', error);
    return null;
  }
};

// GET /api/department-management/users - Get users in department
export async function GET(request: NextRequest) {
  try {
    // Extract and verify token
    const token = extractToken(request) || request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }
    
    const payload = await verifyAuth(token);
    if (!payload || !payload.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }
    
    // Check if user has management permissions
    if (!hasManagementPermissions(payload.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      );
    }
    
    // Get company code from payload
    const companyCode = payload.companyCode?.toLowerCase();
    console.log(`[Department Management API] User ${payload.id} with company code: ${companyCode || 'none'}`);
    
    // Connect to database
    await connectDB();
    
    // Choose the appropriate user model based on company code
    const UserModel = companyCode ? getUserModel(companyCode) : User;
    
    // Get search parameters
    const url = new URL(request.url);
    const searchTerm = url.searchParams.get('search') || '';
    const departmentFilter = url.searchParams.get('department') || '';
    
    // Get current user's department if filtering is needed
    let currentUserDepartment = await getUserDepartment(payload.email, companyCode);
    console.log(`Current user department from getUserDepartment: ${currentUserDepartment}`);
    
    // Build query based on role and department access
    let query: any = {
      status: { $ne: 'pending' }, // Exclude pending users
      role: { $in: ['employee_tier_1', 'employee_tier_2', 'employee_tier_3', 'top_management_tier_1', 'top_management_tier_2', 'top_management_tier_3'] }
    };
    
    // For non-admin users, restrict to their department only
    if (payload.role !== 'admin' && currentUserDepartment) {
      // Add department filter - case insensitive matching
      query.department = { $regex: new RegExp(`^${currentUserDepartment}$`, 'i') };
    }
    
    // Apply search filter
    if (searchTerm) {
      query.$or = [
        { username: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } },
        { firstName: { $regex: searchTerm, $options: 'i' } },
        { lastName: { $regex: searchTerm, $options: 'i' } },
        { jobTitle: { $regex: searchTerm, $options: 'i' } }
      ];
    }
    
    // Get users
    const users = await UserModel.find(query)
      .select('-password -__v')
      .populate({
        path: 'profileApprovedBy',
        select: 'firstName lastName email',
        options: { strictPopulate: false } // Allow population even if field doesn't exist
      })
      .sort({ firstName: 1, lastName: 1 })
      .lean();
    
    // Enhance users with department info from merged_output if available
    const uri = process.env.MONGODB_URI || '';
    const client = new MongoClient(uri);
    await client.connect();
    
    const dbToUse = companyCode ? `company_${companyCode}` : 'org_sim_db';
    const db = client.db(dbToUse);
    
    // Get all merged_output data in one query for better performance
    const allMergedData = await db.collection('merged_output').find({}).toArray();
    console.log(`Found ${allMergedData.length} records in merged_output collection`);

    // Create a map for quick lookup
    const mergedDataMap = new Map();
    allMergedData.forEach(data => {
      if (data.email) {
        mergedDataMap.set(data.email.toLowerCase(), data);
      }
    });

    // Get current user's department from merged_output if available
    const currentUserMergedData = mergedDataMap.get(payload.email.toLowerCase());
    if (currentUserMergedData?.department) {
      currentUserDepartment = currentUserMergedData.department;
      console.log(`Updated current user department from merged_output: ${currentUserDepartment}`);
    }

    const enhancedUsers = users.map((user: any) => {
      try {
        // Get merged data for this user
        const mergedData = mergedDataMap.get(user.email?.toLowerCase());

        const enhancedUser = {
          ...user,
          department: mergedData?.department || user.department || 'Unknown',
          reportsTo: user.reportsTo || mergedData?.reportsTo || '',
          utilization_score: mergedData?.utilization_score || 0,
          // Include feedback metrics
          feedbackRating: user.feedbackMetrics?.received?.averageRating || 0,
          feedbackCount: user.feedbackMetrics?.received?.count || 0
        };

        console.log(`Enhanced user ${user.email}: department = ${enhancedUser.department}`);
        return enhancedUser;
      } catch (error) {
        console.error(`Error enhancing user ${user.email}:`, error);
        return {
          ...user,
          department: 'Unknown',
          reportsTo: user.reportsTo || '',
          utilization_score: 0,
          feedbackRating: 0,
          feedbackCount: 0
        };
      }
    });

    // Log department distribution for debugging
    const departmentCounts = enhancedUsers.reduce((acc: any, user: any) => {
      const dept = user.department || 'Unknown';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {});
    console.log('Department distribution:', departmentCounts);
    console.log(`Current user (${payload.email}) department: ${currentUserDepartment}`);

    await client.close();
    
    // Filter users to only show those in the same department as the current user
    let filteredUsers = enhancedUsers;

    if (currentUserDepartment && currentUserDepartment !== 'Unknown') {
      filteredUsers = enhancedUsers.filter(user => {
        const userDept = user.department?.toLowerCase() || '';
        const currentDept = currentUserDepartment.toLowerCase();
        const matches = userDept === currentDept;

        if (!matches) {
          console.log(`User ${user.email} filtered out - department: '${user.department}', expected: '${currentUserDepartment}'`);
        }

        return matches;
      });

      console.log(`Filtered users count: ${filteredUsers.length}`);

      // If no users match the department filter, log for debugging
      if (filteredUsers.length === 0) {
        console.log('No users matched the department filter. Showing all users for debugging.');
        // For debugging, return all users but log the issue
        filteredUsers = enhancedUsers;
      }
    }

    // Apply additional search filter if provided
    if (departmentFilter && departmentFilter !== 'all') {
      filteredUsers = filteredUsers.filter(user =>
        user.department?.toLowerCase().includes(departmentFilter.toLowerCase())
      );
    }

    return NextResponse.json({
      users: filteredUsers,
      total: filteredUsers.length,
      currentUserDepartment
    });
    
  } catch (error) {
    console.error('Error fetching department users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/department-management/users - Approve user profile
export async function PATCH(request: NextRequest) {
  try {
    // Extract and verify token
    const token = extractToken(request) || request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }
    
    const payload = await verifyAuth(token);
    if (!payload || !payload.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }
    
    // Check if user has management permissions
    if (!hasManagementPermissions(payload.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      );
    }
    
    // Get request data
    const { userId, action } = await request.json();
    
    if (!userId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, action' },
        { status: 400 }
      );
    }
    
    if (action !== 'approve' && action !== 'unapprove') {
      return NextResponse.json(
        { error: 'Invalid action. Must be "approve" or "unapprove"' },
        { status: 400 }
      );
    }
    
    // Get company code from payload
    const companyCode = payload.companyCode?.toLowerCase();
    
    // Connect to database
    await connectDB();
    
    // Choose the appropriate user model based on company code
    const UserModel = companyCode ? getUserModel(companyCode) : User;
    
    // Find the user to approve
    const userToUpdate = await UserModel.findById(userId);
    if (!userToUpdate) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Update approval status
    const updateData: any = {
      profileApproved: action === 'approve',
      profileApprovedBy: action === 'approve' ? payload.id : null,
      profileApprovedAt: action === 'approve' ? new Date() : null
    };
    
    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password -__v').populate('profileApprovedBy', 'firstName lastName email');
    
    if (!updatedUser) {
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      user: updatedUser,
      message: `Profile ${action === 'approve' ? 'approved' : 'unapproved'} successfully`
    });
    
  } catch (error) {
    console.error('Error updating user approval:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}