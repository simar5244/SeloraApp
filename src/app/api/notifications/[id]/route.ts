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

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect();

    const user = await getUserFromToken(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const notification = await Notification.findOneAndDelete({
      _id: params.id,
      userId: user._id
    });

    if (!notification) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    );
  }
}