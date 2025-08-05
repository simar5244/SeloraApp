import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { verifyAuth } from '@/lib/auth';

// MongoDB connection
const uri = process.env.MONGODB_URI || '';
const notificationsCollection = 'notifications';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    
    // Get token from request headers
    const authHeader = request.headers.get('authorization');
    let companyCode = '';
    let userId = '';
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const payload = await verifyAuth(token);
      if (payload) {
        userId = payload.id;
        companyCode = payload.companyCode || '';
      }
    }
    
    if (!userId || !companyCode) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = client.db(`company_${companyCode}`);
    const collection = db.collection(notificationsCollection);

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(params.id), userId: new ObjectId(userId) },
      { $set: { isRead: true, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    await client.close();
    
    if (!result || !result.value) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
    }

    return NextResponse.json({ notification: result.value });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    await client.close();
    return NextResponse.json(
      { error: 'Failed to mark notification as read' },
      { status: 500 }
    );
  }
}