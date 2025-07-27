import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import connectDB from '@/lib/dbConnect';
import User, { getUserModel } from '@/models/User';
import { MongoClient } from 'mongodb';
import mongoose from 'mongoose';

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

// GET /api/department-management/users/[userId] - Get specific user details
export async function GET(
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
    
    // Check if user has management permissions
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
    
    // Find the user
    let user: any = null;
    
    // Try to find by valid ObjectId
    if (mongoose.Types.ObjectId.isValid(userId)) {
      user = await UserModel.findById(userId)
        .select('-password -__v')
        .populate('profileApprovedBy', 'firstName lastName email')
        .lean();
    }
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Enhance user with additional data from merged_output
    try {
      const uri = process.env.MONGODB_URI || '';
      const client = new MongoClient(uri);
      await client.connect();
      
      const dbToUse = companyCode ? `company_${companyCode}` : 'org_sim_db';
      const db = client.db(dbToUse);
      
      const mergedData = await db.collection('merged_output').findOne({ email: user.email });
      
      await client.close();
      
      const enhancedUser = {
        ...user,
        department: mergedData?.department || 'Unknown',
        utilization_score: mergedData?.utilization_score || 0,
        // Include additional fields for editing
        successors: mergedData?.successors || [],
        projects: mergedData?.projects || []
      };
      
      return NextResponse.json(enhancedUser);
      
    } catch (error) {
      console.error('Error enhancing user data:', error);
      return NextResponse.json({
        ...user,
        department: 'Unknown',
        utilization_score: 0,
        successors: [],
        projects: []
      });
    }
    
  } catch (error) {
    console.error('Error fetching user details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/department-management/users/[userId] - Update user job profile
export async function PATCH(
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
    
    // Check if user has management permissions
    if (!hasManagementPermissions(payload.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      );
    }
    
    // Get update data from request
    const updateData = await request.json();
    console.log('Updating user job profile with data:', JSON.stringify(updateData));
    
    // Get company code from payload
    const companyCode = payload.companyCode?.toLowerCase();
    
    // Connect to database
    await connectDB();
    
    // Choose the appropriate user model based on company code
    const UserModel = companyCode ? getUserModel(companyCode) : User;
    
    // Find the user to update
    let user: any = null;
    
    if (mongoose.Types.ObjectId.isValid(userId)) {
      user = await UserModel.findById(userId).select('-password -__v');
    }
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Prepare update object with job profile fields
    const profileUpdate: any = {
      updatedAt: new Date()
    };

    // Only update allowed fields that department managers can edit
    const allowedFields = [
      'jobTitle',
      'department',
      'jobResponsibilities',
      'toolsProficient',
      'salary',
      'totalduration',
      'currentroleduration',
      'workMode',
      'officeLocation',
      'industry',
      'reportsTo'
    ];

    let hasChanges = false;
    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        profileUpdate[field] = updateData[field];
        hasChanges = true;
      }
    });

    // Special handling for reportsTo field (backward compatibility)
    if (updateData.reportsTo !== undefined) {
      profileUpdate.reportsTo = updateData.reportsTo;
      profileUpdate['reports.To'] = updateData.reportsTo;
      hasChanges = true;
    }

    // If there are changes and the profile was previously approved, require re-approval
    if (hasChanges && user.profileApproved) {
      profileUpdate.profileApproved = false;
      profileUpdate.profileApprovedBy = null;
      profileUpdate.profileApprovedAt = null;
    }
    
    console.log(`Updating job profile for user ${user._id.toString()}:`, JSON.stringify(profileUpdate));
    
    // Update the user document
    const updatedUser = await UserModel.findByIdAndUpdate(
      user._id,
      { $set: profileUpdate },
      { new: true, runValidators: true }
    ).select('-password -__v').populate('profileApprovedBy', 'firstName lastName email');
    
    if (!updatedUser) {
      return NextResponse.json(
        { error: 'User not found or update failed' },
        { status: 404 }
      );
    }
    
    // Also update the merged_output collection if it exists (for compatibility)
    try {
      const uri = process.env.MONGODB_URI || '';
      const client = new MongoClient(uri);
      await client.connect();
      
      const dbToUse = companyCode ? `company_${companyCode}` : 'org_sim_db';
      const db = client.db(dbToUse);
      
      // Check if the collection exists
      const collections = await db.listCollections({ name: 'merged_output' }).toArray();
      if (collections.length > 0) {
        const mergedUpdateData: any = {};
        
        // Map fields for merged_output collection
        if (profileUpdate.jobTitle) mergedUpdateData.jobTitle = profileUpdate.jobTitle;
        if (profileUpdate.jobResponsibilities) mergedUpdateData.jobResponsibilities = profileUpdate.jobResponsibilities;
        if (profileUpdate.toolsProficient) mergedUpdateData.toolsProficient = profileUpdate.toolsProficient;
        if (profileUpdate.salary) mergedUpdateData.salary = profileUpdate.salary;
        if (profileUpdate.totalduration) mergedUpdateData.totalduration = profileUpdate.totalduration;
        if (profileUpdate.currentroleduration) mergedUpdateData.currentroleduration = profileUpdate.currentroleduration;
        if (profileUpdate.workMode) mergedUpdateData.workMode = profileUpdate.workMode;
        if (profileUpdate.officeLocation) mergedUpdateData.officeLocation = profileUpdate.officeLocation;
        if (profileUpdate.industry) mergedUpdateData.industry = profileUpdate.industry;
        if (profileUpdate.reportsTo) mergedUpdateData.reportsTo = profileUpdate.reportsTo;
        
        mergedUpdateData.updatedAt = profileUpdate.updatedAt;
        
        await db.collection('merged_output').updateOne(
          { email: updatedUser.email },
          { $set: mergedUpdateData }
        );
        console.log('Also updated merged_output collection');
      }
      
      await client.close();
    } catch (e) {
      console.error('Error updating merged_output:', e);
      // Don't fail the request if merged_output update fails
    }
    
    return NextResponse.json({
      user: updatedUser,
      message: 'User profile updated successfully'
    });
    
  } catch (error) {
    console.error('Error updating user profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}