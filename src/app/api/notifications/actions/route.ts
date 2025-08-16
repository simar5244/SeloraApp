import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Notification from '@/models/Notification';
import { verifyAuth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

// POST /api/notifications/actions - Handle actions for notifications
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
    const userId = new ObjectId(payload.id);

    const body = await request.json();
    const { action, ids } = body as { action: string; ids?: string[] };

    if (action === 'markAllAsRead') {
      const res = await Notification.updateMany({ userId, isRead: false }, { $set: { isRead: true } });
      return NextResponse.json({ message: 'All notifications marked as read', count: res.modifiedCount || 0 });
    }

    if (action === 'markAsRead' && Array.isArray(ids) && ids.length > 0) {
      const objectIds = ids.map((id) => new ObjectId(id));
      const res = await Notification.updateMany({ _id: { $in: objectIds }, userId }, { $set: { isRead: true } });
      return NextResponse.json({ message: 'Notifications marked as read', count: res.modifiedCount || 0 });
    }

    if (action === 'delete' && Array.isArray(ids) && ids.length > 0) {
      const objectIds = ids.map((id) => new ObjectId(id));
      const res = await Notification.deleteMany({ _id: { $in: objectIds }, userId });
      return NextResponse.json({ message: 'Notifications deleted', count: res.deletedCount || 0 });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error processing notification action:', error);
    return NextResponse.json({ error: 'Failed to process notification action' }, { status: 500 });
  }
}
 