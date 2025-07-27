import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import connectDB from '@/lib/dbConnect';
import { getUserModel } from '@/models/User';

// GET - Get user's tutorial preferences
export async function GET(request: NextRequest) {
  try {
    // Get authentication token
    const token = request.headers.get('authorization')?.split(' ')[1] || 
                  request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify authentication
    const payload = await verifyAuth(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Connect to database
    await connectDB(payload.companyCode);
    const User = getUserModel(payload.companyCode);

    // Get user's tutorial preferences
    const user = await User.findById(payload.userId).select('tutorialPreferences');
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Return tutorial preferences with defaults if not set
    const tutorialPreferences = user.tutorialPreferences || {
      enabled: true,
      completedTutorials: [],
      lastUpdated: new Date()
    };

    return NextResponse.json({
      success: true,
      tutorialPreferences
    });

  } catch (error) {
    console.error('Error fetching tutorial preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update user's tutorial preferences
export async function PUT(request: NextRequest) {
  try {
    // Get authentication token
    const token = request.headers.get('authorization')?.split(' ')[1] || 
                  request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify authentication
    const payload = await verifyAuth(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Parse request body
    const { enabled, completedTutorials } = await request.json();

    // Validate input
    if (typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'Invalid enabled value' }, { status: 400 });
    }

    // Connect to database
    await connectDB(payload.companyCode);
    const User = getUserModel(payload.companyCode);

    // Update user's tutorial preferences
    const updateData = {
      'tutorialPreferences.enabled': enabled,
      'tutorialPreferences.lastUpdated': new Date()
    };

    // Add completed tutorials if provided
    if (Array.isArray(completedTutorials)) {
      updateData['tutorialPreferences.completedTutorials'] = completedTutorials;
    }

    const user = await User.findByIdAndUpdate(
      payload.userId,
      { $set: updateData },
      { new: true, upsert: false }
    ).select('tutorialPreferences');

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      tutorialPreferences: user.tutorialPreferences
    });

  } catch (error) {
    console.error('Error updating tutorial preferences:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Mark tutorial as completed
export async function POST(request: NextRequest) {
  try {
    // Get authentication token
    const token = request.headers.get('authorization')?.split(' ')[1] || 
                  request.cookies.get('token')?.value;
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify authentication
    const payload = await verifyAuth(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Parse request body
    const { tutorialName } = await request.json();

    if (!tutorialName || typeof tutorialName !== 'string') {
      return NextResponse.json({ error: 'Invalid tutorial name' }, { status: 400 });
    }

    // Connect to database
    await connectDB(payload.companyCode);
    const User = getUserModel(payload.companyCode);

    // Add tutorial to completed list if not already there
    const user = await User.findByIdAndUpdate(
      payload.userId,
      { 
        $addToSet: { 'tutorialPreferences.completedTutorials': tutorialName },
        $set: { 'tutorialPreferences.lastUpdated': new Date() }
      },
      { new: true, upsert: false }
    ).select('tutorialPreferences');

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      tutorialPreferences: user.tutorialPreferences
    });

  } catch (error) {
    console.error('Error marking tutorial as completed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
