import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Notification from '@/models/Notification';
import { verifyAuth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

// POST /api/notifications/mark-all-read - Mark all notifications as read
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    const payload = await verifyAuth(token);
    if (!payload || !payload.id || !payload.companyCode) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect(payload.companyCode);

    // Update all unread notifications for this user
    let userObjectId: ObjectId;
    try { userObjectId = new ObjectId(payload.id); } catch { return NextResponse.json({ error: 'Invalid user id' }, { status: 400 }); }
    const result = await Notification.updateMany(
      { userId: userObjectId, isRead: false },
      { $set: { isRead: true } }
    );
    
    return NextResponse.json({
      message: 'All notifications marked as read',
      count: result.modifiedCount
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark all notifications as read' },
      { status: 500 }
    );
  }
} 