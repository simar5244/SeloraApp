import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/services/mongodb';
import User, { getUserModel } from '@/models/User';
import { verifyAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Connect to the database
    await connectToDatabase();

    // Extract and verify token
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || request.cookies.get('token')?.value;
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

    // Get company code from payload or header
    const rawCompanyCode = payload.companyCode || request.headers.get('x-company-code');
    const companyCode = Array.isArray(rawCompanyCode) ? rawCompanyCode[0] : rawCompanyCode;
    
    // Get company-specific user model
    const UserModel = getUserModel(companyCode);
    
    // Get the user from database (excluding password)
    console.log('🔍 [API Users Profile GET] Looking for user ID:', payload.id);
    console.log('🔍 [API Users Profile GET] Using company code:', companyCode);
    
    const user = await UserModel.findById(payload.id).select('-password');
    if (!user) {
      console.log('❌ [API Users Profile GET] User not found with ID:', payload.id);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    console.log('🔍 [API Users Profile GET] User found, onboarding field:', user.onboarding);
    console.log('🔍 [API Users Profile GET] User keys:', Object.keys(user.toObject ? user.toObject() : user));

    // Return user profile
    return NextResponse.json(user);
  } catch (error: any) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Connect to the database
    await connectToDatabase();

    // Extract and verify token
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || request.cookies.get('token')?.value;
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

    // Get company code from payload or header
    const rawCompanyCode = payload.companyCode || request.headers.get('x-company-code');
    const companyCode = Array.isArray(rawCompanyCode) ? rawCompanyCode[0] : rawCompanyCode;
    
    // Get company-specific user model
    const UserModel = getUserModel(companyCode);

    // Get request body
    const updatedProfile = await request.json();
    
    // Remove fields that users shouldn't be able to update directly
    // Allow onboarding, department, reportsTo and other profile fields
    const { password, role, ...allowedUpdates } = updatedProfile;

    // Get the user from database
    const user = await UserModel.findById(payload.id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // If user is trying to update email, check if it's already in use
    if (allowedUpdates.email && allowedUpdates.email !== user.email) {
      const existingUserWithEmail = await UserModel.findOne({ email: allowedUpdates.email });
      if (existingUserWithEmail) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
      }
    }

    // If user is trying to update username, check if it's already in use
    if (allowedUpdates.username && allowedUpdates.username !== user.username) {
      const existingUserWithUsername = await UserModel.findOne({ username: allowedUpdates.username });
      if (existingUserWithUsername) {
        return NextResponse.json({ error: 'Username already in use' }, { status: 409 });
      }
    }

    // Update the user profile
    Object.assign(user, allowedUpdates);
    await user.save();

    // Return updated profile without password
    const userObject = user.toObject();
    const { password: _, ...updatedUser } = userObject;

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    console.error('Error updating user profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 