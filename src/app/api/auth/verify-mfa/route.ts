import { NextRequest, NextResponse } from 'next/server';
import { verifyMfaSession, sendWelcomeEmailToNewUser } from '@/lib/mfa';
import { generateToken } from '@/lib/auth';
import { getDBConnection } from '@/lib/companyDBConnect';
import { getUserModel } from '@/models/User';
import { getAuthUserModel } from '@/models/AuthUser';
import { getCompanyAuthModel } from '@/models/CompanyAuth';
import mongoose from 'mongoose';
import { MongoClient } from 'mongodb';

// Enable debug mode
const DEBUG_MFA = true;

export async function POST(request: NextRequest) {
  try {
    const { mfaCode, mfaSession, provider } = await request.json();

    if (!mfaCode || !mfaSession) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (DEBUG_MFA) {
      console.log(`[MFA-VERIFY] Attempting to verify code ${mfaCode} for session ${mfaSession}`);
    }

    // Handle Google OAuth MFA verification
    if (provider === 'google') {
      const mfaSessions = globalThis as any;
      const googleSession = mfaSessions._googleMfaSessions?.get(mfaSession);

      if (!googleSession || 
          googleSession.code !== mfaCode || 
          googleSession.expires < new Date()) {
        return NextResponse.json(
          { success: false, message: 'Invalid or expired verification code' },
          { status: 401 }
        );
      }

      // Delete the session to prevent reuse
      mfaSessions._googleMfaSessions?.delete(mfaSession);

      // Assuming googleSession.userInfo contains id, role, company
      const { userId, userInfo } = googleSession;
      const token = generateToken({
        id: userId,
        role: userInfo.role,
        company: userInfo.company,
        companyCode: userInfo.companyCode,
        email: userInfo.email
      });

      const res = NextResponse.json({
        success: true,
        message: 'Google authentication successful',
        token,
        user: userInfo // Contains id, role, etc.
      });
      // Set cookies
      res.cookies.set('token', token, { httpOnly: true, path: '/', secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
      res.cookies.set('userRole', userInfo.role, { path: '/', secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
      return res;
    }

    // Verify MFA code first
    console.log(`[MFA-VERIFY] 🔍 Verifying MFA code for session: ${mfaSession}`);
    
    const userId = verifyMfaSession(mfaSession, mfaCode);

    if (!userId) {
      if (DEBUG_MFA) {
        console.log(`[MFA-VERIFY] Failed to verify session ${mfaSession} with code ${mfaCode}`);
      }
      return NextResponse.json(
        { success: false, message: 'Invalid or expired verification code' },
        { status: 401 }
      );
    }

    console.log(`[MFA-VERIFY] ✅ MFA code verified for user ID: ${userId}`);

    // Now find the user in the database and mark them as verified
    try {
      // Try to find the user across all company databases
      const client = new MongoClient(process.env.MONGODB_URI!);
      await client.connect();

      let foundUser = null;
      let companyCode = null;
      let companyDbName = null;

      // Search all company databases for the user
      const adminDb = client.db().admin();
      const databases = await adminDb.listDatabases();

      for (const db of databases.databases) {
        if (db.name.startsWith('company_')) {
          const companyDb = client.db(db.name); 
          const collection = companyDb.collection('users');

          const user = await collection.findOne({ _id: new mongoose.Types.ObjectId(userId) });

          if (user) {
            foundUser = user;
            companyCode = db.name.replace('company_', '');
            companyDbName = db.name;
            console.log(`[MFA-VERIFY] 🔍 Found user in database: ${db.name}`);
            break;
          }
        }
      }

      await client.close();

      if (!foundUser) {
        console.error(`[MFA-VERIFY] ❌ User with ID ${userId} not found in any database`);
        return NextResponse.json(
          { success: false, message: 'User account not found. Please sign up again.' },
          { status: 404 }
        );
      }

      // Now connect to the specific company database to update the user
      const companyConn = await getDBConnection(companyCode!);
      const User = getUserModel(companyCode!);

      // Update user to mark email as verified
      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { 
          emailVerified: true,
          // Keep status as 'pending' until admin approves
        },
        { new: true }
      );

      if (!updatedUser) {
        console.error(`[MFA-VERIFY] ❌ Failed to update user verification status`);
        return NextResponse.json(
          { success: false, message: 'Failed to update user account. Please try again.' },
          { status: 500 }
        );
      }

      console.log(`[MFA-VERIFY] ✅ User email verified: ${updatedUser.email}`);

      // Sync to central auth database
      try {
        const AuthUserModel = await getAuthUserModel();
        
        // Check if auth record exists, create or update
        const existingAuth = await AuthUserModel.findOne({ userId: userId });
        
        if (existingAuth) {
          await AuthUserModel.findOneAndUpdate(
            { userId: userId },
            { emailVerified: true },
            { new: true }
          );
        } else {
          await AuthUserModel.create({
            userId: userId,
            originalId: updatedUser._id,
            username: updatedUser.username,
            email: updatedUser.email,
            password: updatedUser.password,
            role: updatedUser.role,
            status: updatedUser.status,
            companyCode: companyCode,
            companyName: updatedUser.company,
            databaseName: companyDbName,
            emailVerified: true
          });
        }
        console.log(`[MFA-VERIFY] ✅ Successfully synced user to central auth database`);
      } catch (authDbError) {
        console.error(`[MFA-VERIFY] ⚠️ Warning: Failed to sync to central auth database:`, authDbError);
        // Don't fail the entire process
      }

      // Sync to company auth collection
      try {
        const CompanyAuth = await getCompanyAuthModel(companyCode!);
        
        const existingCompanyAuth = await CompanyAuth.findOne({ userId: userId });
        
        if (existingCompanyAuth) {
          await CompanyAuth.findOneAndUpdate(
            { userId: userId },
            { emailVerified: true },
            { new: true }
          );
        } else {
          await CompanyAuth.create({
            userId: userId,
            originalId: updatedUser._id,
            username: updatedUser.username,
            email: updatedUser.email,
            password: updatedUser.password,
            role: updatedUser.role,
            status: updatedUser.status,
            companyCode: companyCode,
            companyName: updatedUser.company,
            emailVerified: true
          });
        }
        console.log(`[MFA-VERIFY] ✅ Successfully synced user to company auth collection`);
      } catch (companyAuthError) {
        console.error(`[MFA-VERIFY] ⚠️ Warning: Failed to sync to company auth collection:`, companyAuthError);
        // Don't fail the entire process
      }

      // Send welcome email now that user is verified
      await sendWelcomeEmailToNewUser(updatedUser.email, updatedUser.username);

      // Generate token for the verified user
      const token = generateToken({
        id: userId,
        email: updatedUser.email,
        role: updatedUser.role,
        company: updatedUser.company,
        companyCode: companyCode!,
        status: updatedUser.status
      });

      const res = NextResponse.json({
        success: true,
        message: 'Email verified successfully! Your account is pending admin approval.',
        token,
        user: {
          id: userId,
          username: updatedUser.username,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          role: updatedUser.role,
          status: updatedUser.status,
          company: updatedUser.company,
          companyCode: companyCode,
          emailVerified: true
        }
      });

      // Set cookies
      res.cookies.set('token', token, { httpOnly: true, path: '/', secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
      res.cookies.set('userRole', updatedUser.role, { path: '/', secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });

      return res;

    } catch (error: any) {
      console.error('[MFA-VERIFY] Database error:', error);
      return NextResponse.json(
        { success: false, message: 'Database error occurred. Please try again.' },
        { status: 500 }
      );
    }

  } catch (error: any) {
    console.error('[MFA-VERIFY] General error:', error);
    return NextResponse.json(
      { success: false, message: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}