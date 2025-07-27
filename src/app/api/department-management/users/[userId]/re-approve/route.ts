import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import connectDB from '@/lib/dbConnect';
import { getUserModel } from '@/models/User';
import User from '@/models/User';

// Helper function to extract token from request
function extractToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}

// Helper function to check if user has management permissions
function hasManagementPermissions(role: string): boolean {
  const managementRoles = [
    'admin',
    'top_management_tier_1',
    'top_management_tier_2',
    'top_management_tier_3'
  ];
  return managementRoles.includes(role);
}

// POST /api/department-management/users/[userId]/re-approve - Submit profile for re-approval
export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;
    
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
    
    // Check if user has management permissions (admin/top management can submit for re-approval)
    if (!hasManagementPermissions(payload.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      );
    }
    
    // Get company code from payload
    const companyCode = payload.companyCode?.toLowerCase();
    
    // Connect to database
    await connectDB();
    
    // Choose the appropriate user model based on company code
    const UserModel = companyCode ? getUserModel(companyCode) : User;
    
    // Find the user to submit for re-approval
    const userToUpdate = await UserModel.findById(userId);
    if (!userToUpdate) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check if user is currently approved
    if (!userToUpdate.profileApproved) {
      return NextResponse.json(
        { error: 'Profile is not currently approved' },
        { status: 400 }
      );
    }
    
    // Update approval status to pending re-approval (only change approved status)
    const updateData: any = {
      profileApproved: false,
      updatedAt: new Date()
    };

    const updatedUser = await UserModel.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password -__v');
    
    if (!updatedUser) {
      return NextResponse.json(
        { error: 'Failed to update user' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      user: updatedUser,
      message: 'Profile submitted for re-approval successfully'
    });
    
  } catch (error) {
    console.error('Error submitting profile for re-approval:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
