import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import Notification from '@/models/Notification';
import User from '@/models/User';
import { dbConnect } from '@/lib/dbConnect';
import jwt from 'jsonwebtoken';

async function getUserFromToken(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return null;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    const user = await User.findById(decoded.userId);
    return user;
  } catch (error) {
    console.error('Error getting user from token:', error);
    return null;
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await dbConnect();

    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await Notification.updateMany(
      { userId: user._id, isRead: false },
      { isRead: true }
    );

    return NextResponse.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark all notifications as read' },
      { status: 500 }
    );
  }
}