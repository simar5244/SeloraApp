import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import connectDB from '@/lib/dbConnect';
import mongoose from 'mongoose';
import { MongoClient, ObjectId } from 'mongodb';

// MongoDB connection string from environment variable
const uri = process.env.MONGODB_URI || '';

export async function GET(request: NextRequest) {
  try {
    // 1. Get token from Authorization header
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      console.log('[GET /api/auth/check-role] Missing authorization token');
      return NextResponse.json({ 
        authenticated: false, 
        authorized: false, 
        user: null 
      });
    }

    // 2. Verify the token
    const payload = await verifyAuth(token);
    console.log('[GET /api/auth/check-role] Token payload:', payload);
    if (!payload || !payload.id) {
      console.log('[GET /api/auth/check-role] Invalid token or payload missing ID');
      return NextResponse.json({ 
        authenticated: false, 
        authorized: false, 
        user: null 
      });
    }

    // 3. Connect to the database
    await connectDB(process.env.MONGODB_URI as string);

    // 4. Check for company-specific database
    const companyCode = 
      request.headers.get('X-Company-Code') || 
      payload.companyCode || 
      '';
      
    // Create MongoDB client for direct queries
    const client = new MongoClient(uri);
    
    console.log(`[GET /api/auth/check-role] Looking for user ${payload.id} with company code: ${companyCode || 'none'}`);
    
    // 5. Find the user
    let user;
    
    try {
      await client.connect();
      
      // First, try with company code if available
      if (companyCode) {
        try {
          console.log(`[GET /api/auth/check-role] Using direct MongoDB query for user ID: ${payload.id}`);
          const dbName = `company_${companyCode}`;
          const db = client.db(dbName);
          const usersCollection = db.collection('users');
          
          // Try to find by email or ID
          const userDoc = await usersCollection.findOne({
            $or: [
              { email: payload.email },
              { id: payload.id },
              { userId: payload.id }
            ]
          }, { projection: { password: 0 } });
          
          if (userDoc) {
            console.log(`[GET /api/auth/check-role] Found user in company database: ${companyCode}`);
            user = userDoc;
          } else if (mongoose.isValidObjectId && mongoose.isValidObjectId(payload.id)) {
            // If not found and ID is valid ObjectId, try with _id field
            const userByObjectId = await usersCollection.findOne({
              _id: new ObjectId(payload.id)
            }, { projection: { password: 0 } });
            
            if (userByObjectId) {
              console.log(`[GET /api/auth/check-role] Found user in company database by ObjectId: ${companyCode}`);
              user = userByObjectId;
            }
          }
        } catch (err) {
          console.warn(`[GET /api/auth/check-role] Error querying company database: ${companyCode}`, err);
        }
      }
      
      // If user not found in company DB, try main database
      if (!user) {
        try {
          console.log(`[GET /api/auth/check-role] Using direct MongoDB query on main database`);
          const db = client.db('org_sim_db');
          const usersCollection = db.collection('users');
          
          // Try to find by email or ID
          const userDoc = await usersCollection.findOne({
            $or: [
              { email: payload.email },
              { id: payload.id },
              { userId: payload.id }
            ]
          }, { projection: { password: 0 } });
          
          if (userDoc) {
            console.log(`[GET /api/auth/check-role] Found user in main database`);
            user = userDoc;
          } else if (mongoose.isValidObjectId && mongoose.isValidObjectId(payload.id)) {
            // If not found and ID is valid ObjectId, try with _id field
            const userByObjectId = await usersCollection.findOne({
              _id: new ObjectId(payload.id)
            }, { projection: { password: 0 } });
            
            if (userByObjectId) {
              console.log(`[GET /api/auth/check-role] Found user in main database by ObjectId`);
              user = userByObjectId;
            }
          }
        } catch (err) {
          console.warn(`[GET /api/auth/check-role] Error querying main database:`, err);
        }
      }
    } finally {
      await client.close();
    }

    if (!user) {
      console.log(`[GET /api/auth/check-role] User not found for ID: ${payload.id}`);
      return NextResponse.json({ 
        authenticated: false, 
        authorized: false, 
        user: null 
      });
    }

    // 6. Return authentication status with user info
    console.log(`[GET /api/auth/check-role] Successfully authenticated user: ${user.email}, role: ${user.role}`);
    return NextResponse.json({
      authenticated: true,
      authorized: true, // Let the client-side code handle role authorization
      user: {
        id: user.id || user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        companyCode: user.companyCode || companyCode,
        organizationName: user.organizationName,
        department: user.department,
        status: user.status
      }
    });

  } catch (error: any) {
    console.error('[GET /api/auth/check-role] Error checking role:', error);
    return NextResponse.json({ 
      authenticated: false, 
      authorized: false, 
      user: null 
    });
  }
}
