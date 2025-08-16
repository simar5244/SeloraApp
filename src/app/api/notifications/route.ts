import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import dbConnect from '@/lib/dbConnect';
import Notification from '@/models/Notification';
import { verifyAuth } from '@/lib/auth';

// Helper to parse pagination query params
function parsePagination(url: URL) {
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
  const limit = Math.max(1, Math.min(100, parseInt(url.searchParams.get('limit') || '20', 10)));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

// GET /api/notifications - Get notifications for authenticated user
export async function GET(request: NextRequest) {
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

    const url = new URL(request.url);
    const { page, limit, skip } = parsePagination(url);

    // Convert user id to ObjectId if possible
    let userObjectId: ObjectId | null = null;
    try {
      userObjectId = new ObjectId(payload.id);
    } catch {}
    if (!userObjectId) {
      return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
    }

    const [items, total] = await Promise.all([
      Notification.find({ userId: userObjectId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments({ userId: userObjectId })
    ]);

    return NextResponse.json({
      notifications: items.map((n: any) => ({
        id: n._id,
        userId: n.userId,
        type: n.type,
        title: n.title,
        message: n.message,
        isRead: n.isRead,
        link: n.link || null,
        createdAt: n.createdAt,
      })),
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

// POST /api/notifications - Create a new notification (for current or specified user)
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    const payload = await verifyAuth(token);
    if (!payload || !payload.companyCode) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect(payload.companyCode);
    const body = await request.json();

    const {
      userId, // optional; defaults to current user
      title,
      message,
      type = 'system',
      link = null
    } = body || {};

    if (!title || !message) {
      return NextResponse.json({ error: 'title and message are required' }, { status: 400 });
    }

    let targetUserId = userId || payload.id;
    let userObjectId: ObjectId;
    try {
      userObjectId = new ObjectId(targetUserId);
    } catch {
      return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
    }

    const created = await Notification.create({
      userId: userObjectId,
      type,
      title,
      message,
      link,
      isRead: false,
    });

    return NextResponse.json({ success: true, id: created._id }, { status: 201 });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}

// DELETE /api/notifications - Delete single or multiple notifications for current user
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    const payload = await verifyAuth(token);
    if (!payload || !payload.companyCode) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect(payload.companyCode);
    const url = new URL(request.url);
    const idParam = url.searchParams.get('id');
    const body = request.method === 'DELETE' ? await request.json().catch(() => null) : null;
    const ids: string[] = body?.ids || (idParam ? [idParam] : []);

    if (!ids.length) {
      return NextResponse.json({ error: 'No notification ids provided' }, { status: 400 });
    }

    let userObjectId: ObjectId;
    try { userObjectId = new ObjectId(payload.id); } catch { return NextResponse.json({ error: 'Invalid user id' }, { status: 400 }); }

    const objectIds: ObjectId[] = [];
    for (const id of ids) {
      try { objectIds.push(new ObjectId(id)); } catch {}
    }
    if (!objectIds.length) {
      return NextResponse.json({ error: 'Invalid notification ids' }, { status: 400 });
    }

    const res = await Notification.deleteMany({ _id: { $in: objectIds }, userId: userObjectId });
    return NextResponse.json({ success: true, deleted: res.deletedCount || 0 });
  } catch (error) {
    console.error('Error deleting notifications:', error);
    return NextResponse.json(
      { error: 'Failed to delete notifications' },
      { status: 500 }
    );
  }
}
 