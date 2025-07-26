import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { generateAndSendPasswordResetOtp } from '@/lib/mfa';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      );
    }

    console.log(`[PASSWORD-RESET] Request received for ${email}`);

    // Validate email format server-side
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format' },
        { status: 400 }
      );
    }

    try {
      const client = new MongoClient(process.env.MONGODB_URI!);
      await client.connect();

      let user = null;
      let userDatabase = null;
      let usersCollection = null;

      // Search for user in all company databases
      const adminDb = client.db().admin();
      const databases = await adminDb.listDatabases();

      for (const db of databases.databases) {
        if (db.name.startsWith('company_')) {
          const companyDb = client.db(db.name);
          const collection = companyDb.collection('users');

          const foundUser = await collection.findOne({
            email: email.toLowerCase()
          });

          if (foundUser) {
            user = foundUser;
            userDatabase = db.name;
            usersCollection = collection;
            console.log(`[PASSWORD-RESET] User found in database: ${db.name}`);
            break;
          }
        }
      }

      if (!user) {
        console.log(`[PASSWORD-RESET] User not found with email ${email}`);
        await client.close();
        return NextResponse.json(
          { success: false, message: 'User not found with this email address' },
          { status: 404 }
        );
      }

      // Generate and send a stateless OTP code
      const username = user.username || user.firstName || email.split('@')[0];

      const code = await generateAndSendPasswordResetOtp(email, username);
      if (!code) {
        console.error(`[PASSWORD-RESET] Failed to send OTP to ${email}`);
        await client.close();
        return NextResponse.json(
          { success: false, message: 'Failed to send verification code' },
          { status: 500 }
        );
      }

      console.log(`[PASSWORD-RESET] OTP code ${code} sent to ${email}`);

      // Store the code and expiration in the user document
      await usersCollection!.updateOne(
        { _id: user._id },
        {
          $set: {
            resetPasswordToken: code,
            resetPasswordExpires: new Date(Date.now() + 3600000) // 1 hour
          }
        }
      );

      await client.close();

      return NextResponse.json({
        success: true,
        message: 'Password reset email sent'
      });
    } catch (error) {
      console.error('[PASSWORD-RESET] Database error:', error);
      return NextResponse.json(
        { success: false, message: 'An error occurred while processing your request' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[PASSWORD-RESET] Request error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred' },
      { status: 500 }
    );
  }
} 