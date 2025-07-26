import { NextRequest, NextResponse } from 'next/server';
import { verifyMfaSession, listActiveSessions, sendWelcomeEmailToNewUser } from '@/lib/mfa';
import { generateToken } from '@/lib/auth';
import { getDBConnection } from '@/lib/companyDBConnect';
import { getUserModel } from '@/models/User';
import { getAuthUserModel } from '@/models/AuthUser';
import { getCompanyAuthModel } from '@/models/CompanyAuth';
import { getTempUserData, removeTempUserData } from '@/lib/tempUserStorage';
import mongoose from 'mongoose';

// Enable debug mode
const DEBUG_MFA = true;

// Mock users from login/route.ts
const mockUsers = [
  {
    id: '1',
    username: 'admin',
    email: 'admin@organizationgalaxy.com',
    role: 'admin',
  },
  {
    id: '2',
    username: 'testuser',
    email: 'test@example.com',
    role: 'admin',
  }
];

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
      // List all active sessions for debugging
      listActiveSessions();
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

    // First, check for temporary user data (new signups) before verifying MFA
    const tempUserData = getTempUserData(mfaSession);

    // Verify MFA code regardless of whether it's new signup or existing user
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

    if (DEBUG_MFA) {
      console.log(`[MFA-VERIFY] Successfully verified session ${mfaSession} with code ${mfaCode} for user ${userId}`);
      if (tempUserData) {
        console.log(`[MFA-VERIFY] This is a new signup for: ${tempUserData.email}`);
      } else {
        console.log(`[MFA-VERIFY] This is an existing user login`);
      }
    }

    // Handle the flow based on whether we have temporary user data
    try {

      if (tempUserData) {
        // This is a new signup - create the user in MongoDB now
        console.log(`[MFA-VERIFY] Found temporary user data for new signup: ${tempUserData.email}`);

        const companyCode = tempUserData.companyCode;

        // Connect to company database
        const companyConn = await getDBConnection(companyCode);
        const User = getUserModel(companyCode);

        // Check if user already exists (shouldn't happen, but safety check)
        const existingUser = await User.findOne({
          $or: [
            { email: tempUserData.email },
            { username: tempUserData.username }
          ]
        });

        if (existingUser) {
          console.error(`[MFA-VERIFY] User already exists: ${tempUserData.email}`);
          removeTempUserData(mfaSession); // Clean up temp data
          return NextResponse.json(
            { success: false, message: 'User already exists' },
            { status: 409 }
          );
        }

        // Create new user in company database
        const newUser = new User({
          username: tempUserData.username,
          email: tempUserData.email,
          password: tempUserData.password, // Already hashed
          firstName: tempUserData.firstName,
          lastName: tempUserData.lastName,
          company: tempUserData.company,
          companyCode: tempUserData.companyCode,
          emailVerificationToken: tempUserData.emailVerificationToken,
          status: 'pending',
          role: tempUserData.role,
          emailVerified: true // Mark as verified since they passed MFA
        });

        await newUser.save();
        console.log(`[MFA-VERIFY] Created new user in company database: ${newUser._id}`);
        const userId = String(newUser._id);

        // Sync to central auth database
        const AuthUserModel = await getAuthUserModel();
        await AuthUserModel.create({
          userId: userId,
          originalId: newUser._id,
          username: newUser.username,
          email: newUser.email,
          password: newUser.password,
          role: newUser.role,
          status: newUser.status,
          companyCode: companyCode,
          companyName: newUser.company,
          databaseName: `company_${companyCode}`,
          emailVerified: true
        });

        // Sync to company auth collection
        const CompanyAuth = await getCompanyAuthModel(companyCode);
        await CompanyAuth.create({
          userId: userId,
          originalId: newUser._id,
          username: newUser.username,
          email: newUser.email,
          password: newUser.password,
          role: newUser.role,
          status: newUser.status,
          companyCode: companyCode,
          companyName: newUser.company,
          emailVerified: true
        });

        // Send welcome email now that user is verified
        await sendWelcomeEmailToNewUser(newUser.email, newUser.username);

        // Clean up temporary data
        removeTempUserData(mfaSession);

        // Generate token for the new user
        const token = generateToken({
          id: userId,
          email: newUser.email,
          role: newUser.role,
          company: newUser.company,
          companyCode: companyCode,
          status: 'pending'
        });

        const res = NextResponse.json({
          success: true,
          token,
          user: {
            id: userId,
            username: newUser.username,
            email: newUser.email,
            firstName: newUser.firstName,
            lastName: newUser.lastName,
            role: newUser.role,
            company: newUser.company,
            companyCode: companyCode,
            status: 'pending',
            emailVerified: true
          }
        });

        // Set cookies
        res.cookies.set('token', token, { httpOnly: true, path: '/', secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
        res.cookies.set('userRole', newUser.role, { path: '/', secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });

        return res;
      }

      // No temporary user data - this is an existing user login
      // FIXED: The issue is here - userId might be a string that can't be cast to ObjectId
      console.log(`[MFA-VERIFY] Looking for existing user with userId: ${userId} (type: ${typeof userId})`);
      
      // First, find the user in the auth database to get their company code
      const AuthUserModel = await getAuthUserModel();
      
      // FIX: Only search by userId field (string), not _id (ObjectId)
      // The userId field in AuthUser should contain the string representation
      const authUser = await AuthUserModel.findOne({ userId: userId });

      if (!authUser) {
        // Fallback: try to find by _id if userId is a valid ObjectId
        let authUserById = null;
        if (mongoose.Types.ObjectId.isValid(userId)) {
          authUserById = await AuthUserModel.findById(userId);
        }
        
        if (!authUserById) {
          console.error(`[MFA-VERIFY] User not found with userId ${userId} in auth database`);
          return NextResponse.json(
            { success: false, message: 'User not found' },
            { status: 404 }
          );
        }
        
        // Use the found user
        const authUser = authUserById;
      }

      const companyCode = authUser.companyCode;

      if (DEBUG_MFA) {
        console.log(`[MFA-VERIFY] Found existing user ${userId} in auth database with company code ${companyCode}`);
      }

      // Now get the user from their company database
      // FIX: Use the correct field to find the user
      const User = getUserModel(companyCode);
      let user;
      
      // Try to find by the userId first (string field in company DB)
      if (authUser.userId) {
        user = await User.findOne({ _id: authUser.originalId });
      } else {
        user = await User.findById(userId);
      }

      if (!user) {
        console.error(`[MFA-VERIFY] User ${userId} not found in company database ${companyCode}`);
        return NextResponse.json(
          { success: false, message: 'User not found in company database' },
          { status: 404 }
        );
      }
      
      // Update user status if needed (for new signups)
      if (user.status === 'pending') {
        // The user is still pending admin approval, but we can mark them as email verified
        user.emailVerified = true;
        await user.save();
        
        if (DEBUG_MFA) {
          console.log(`[MFA-VERIFY] Updated user ${userId} to emailVerified=true in company database`);
        }
        
        // Also update in auth databases
        await AuthUserModel.updateOne({ 
          userId: authUser.userId || String(authUser._id)
        }, { emailVerified: true });
        
        const CompanyAuth = await getCompanyAuthModel(companyCode);
        await CompanyAuth.updateOne({ 
          userId: authUser.userId || String(authUser._id)
        }, { emailVerified: true });
      }
      
      // Generate token with user data
      const token = generateToken({
        id: String(user._id),
        email: user.email,
        role: user.role,
        company: user.company,
        companyCode: user.companyCode,
        status: user.status
      });
      
      const res = NextResponse.json({
        success: true,
        message: 'Email verification successful',
        token,
        user: {
          id: String(user._id),
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          company: user.company,
          companyCode: user.companyCode,
          status: user.status
        },
        pendingApproval: user.status === 'pending'
      });
      
      // Set cookies
      res.cookies.set('token', token, { httpOnly: true, path: '/', secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
      res.cookies.set('userRole', user.role, { path: '/', secure: process.env.NODE_ENV === 'production', sameSite: 'lax' });
      
      return res;
    } catch (dbError) {
      console.error('Database error during MFA verification:', dbError);
      return NextResponse.json(
        { success: false, message: 'Database error' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('MFA verification error:', error);
    return NextResponse.json(
      { success: false, message: 'MFA verification failed' },
      { status: 500 }
    );
  }
}