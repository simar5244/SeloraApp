import { NextRequest, NextResponse } from 'next/server';
import { getAuthUserModel } from '@/models/AuthUser';
import connectDB from '@/lib/db';
import bcrypt from 'bcryptjs';
import { MongoClient } from 'mongodb';


export async function POST(request: NextRequest) {
  try {
    const { email, otp, newPassword } = await request.json();

    if (!email || !otp || !newPassword) {
      return NextResponse.json(
        { success: false, message: 'Email, verification code and new password are required' },
        { status: 400 }
      );
    }

    console.log(`[PASSWORD-RESET] Verifying OTP for ${email}`);

    try {
      // Use the same database search logic as request-password-reset
      const client = new MongoClient(process.env.MONGODB_URI!);
      await client.connect();

      let user = null;
      let userDatabase = null;
      let usersCollection = null;

      // Search for user in all company databases (same as request-password-reset)
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
          { success: false, message: 'Invalid email address' },
          { status: 404 }
        );
      }
      
      // Check if reset token exists and is not expired
      if (!user.resetPasswordToken || !user.resetPasswordExpires) {
        console.log(`[PASSWORD-RESET] No active reset request for ${email}`);
        await client.close();
        return NextResponse.json(
          { success: false, message: 'Password reset request has expired or does not exist' },
          { status: 400 }
        );
      }

      // Check if token is expired
      const now = new Date();
      if (now > new Date(user.resetPasswordExpires)) {
        console.log(`[PASSWORD-RESET] Reset token expired for ${email}`);
        await client.close();
        return NextResponse.json(
          { success: false, message: 'Password reset link has expired' },
          { status: 400 }
        );
      }
      
      // Verify the OTP directly against the stored token
      const otpTrim = otp.trim();
      console.log(`[PASSWORD-RESET] Stored token: ${user.resetPasswordToken}, Received OTP: ${otpTrim}`);
      if (String(user.resetPasswordToken).trim() !== otpTrim) {
        console.log(`[PASSWORD-RESET] Invalid OTP for ${email}`);
        await client.close();
        return NextResponse.json(
          { success: false, message: 'Invalid verification code' },
          { status: 400 }
        );
      }
      
      // Hash the new password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(newPassword, salt);

      // Update password and clear reset token in the company database
      await usersCollection!.updateOne(
        { _id: user._id },
        {
          $set: {
            password: hashedPassword
          },
          $unset: {
            resetPasswordToken: "",
            resetPasswordExpires: ""
          }
        }
      );

      // Also update the auth database if the user exists there
      try {
        await connectDB();
        const AuthUserModel = await getAuthUserModel();
        const authUser = await AuthUserModel.findOne({ email });
        if (authUser) {
          authUser.password = hashedPassword;
          authUser.resetPasswordToken = undefined;
          authUser.resetPasswordExpires = undefined;
          await authUser.save();
          console.log(`[PASSWORD-RESET] Auth database also updated for ${email}`);
        }
      } catch (authError) {
        console.log(`[PASSWORD-RESET] Auth database update failed (non-critical): ${authError}`);
      }

      await client.close();
      console.log(`[PASSWORD-RESET] Password reset successful for ${email}`);

      return NextResponse.json({
        success: true,
        message: 'Password has been reset successfully'
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