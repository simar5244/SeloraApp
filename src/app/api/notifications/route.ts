import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';
import { verifyAuth } from '@/lib/auth';

// MongoDB connection
const uri = process.env.MONGODB_URI || '';
const defaultDbName = 'org_sim_db';
const notificationsCollection = 'notifications';

export async function GET(request: Request) {
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

    const notifications = await collection
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    await client.close();
    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    await client.close();
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
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

    const body = await request.json();
    const { type, title, message, link, entityId, entityType } = body;

    const db = client.db(`company_${companyCode}`);
    const collection = db.collection(notificationsCollection);

    const notification = {
      userId: new ObjectId(userId),
      type,
      title,
      message,
      link,
      entityId,
      entityType,
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await collection.insertOne(notification);
    await client.close();

    return NextResponse.json({ 
      notification: { ...notification, _id: result.insertedId } 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating notification:', error);
    await client.close();
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}