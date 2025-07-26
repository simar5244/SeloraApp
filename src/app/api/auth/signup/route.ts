import { NextRequest, NextResponse } from 'next/server';
import { generateRandomToken, generateToken } from '@/lib/auth';
import connectDB from '@/lib/dbConnect';
import { getDBConnection } from '@/lib/companyDBConnect';
import { getUserModel } from '@/models/User';
import { MongoClient } from 'mongodb';
import { getAuthUserModel } from '@/models/AuthUser';
import { getCompanyAuthModel } from '@/models/CompanyAuth';
import Subscription from '@/models/Subscription';
import { createAndSendMfaCode, sendWelcomeEmailToNewUser, storeMfaSession } from '@/lib/mfa';
import bcrypt from 'bcryptjs';
import Stripe from 'stripe';

// MongoDB connection string
const uri = process.env.MONGODB_URI || '';

export async function POST(req: NextRequest) {
  let client: MongoClient | null = null;
  
  try {
    console.log('[SIGNUP] Starting user signup process');
    
    // Parse request body
    const { username, email, password, firstName, lastName, company, companyCode } = await req.json();
    console.log(`[SIGNUP] Received signup request for email: ${email}, company code: ${companyCode}`);

    // Validate input
    if (!username || !email || !password || !companyCode) {
      console.log('[SIGNUP] Missing required fields');
      return NextResponse.json(
        { success: false, message: 'Username, email, password, and company code are required' },
        { status: 400 }
      );
    }

    // Sanitize and normalize company code: remove non-alphanumeric and lowercase
    const sanitizedCompanyCode = companyCode.trim().replace(/[^a-zA-Z0-9]/g, '');
    const normalizedCompanyCode = sanitizedCompanyCode.toLowerCase();
    console.log(`[SIGNUP] Normalized company code: ${normalizedCompanyCode}`);

    // Connect to MongoDB directly first to verify company exists
    client = new MongoClient(uri);
    await client.connect();
    console.log('[SIGNUP] Connected to MongoDB');

    // Step 1: Check if the database physically exists first
    let companyExists = false;
    let companyDbName = `company_${normalizedCompanyCode}`;
    let companyInfo = null;

    // List all databases and check if our company database exists
    const adminDb = client.db('admin');
    const dbList = await adminDb.admin().listDatabases();
    const databaseNames = dbList.databases.map((db: any) => db.name);
    
    console.log(`[SIGNUP] Checking if database ${companyDbName} exists among:`, databaseNames);
    
    if (databaseNames.includes(companyDbName)) {
      console.log(`[SIGNUP] Company database ${companyDbName} exists!`);
      companyExists = true;
    }

    // Step 2: If database doesn't exist, check organization collection as before
    if (!companyExists) {
      console.log(`[SIGNUP] Database not found directly, checking organizations collection`);
      
      // Check if company exists in main DB
      const mainDb = client.db('org_sim_db');
      const organizationsCollection = mainDb.collection('organizations');
      
      console.log(`[SIGNUP] Searching for company with code: ${normalizedCompanyCode}`);
      
      let companyRecord = await organizationsCollection.findOne({ 
        $or: [
          { companyCode: normalizedCompanyCode },
          { companyCode: companyCode } // Try original case too
        ]
      });
      
      if (!companyRecord) {
        console.log(`[SIGNUP] Company with code ${normalizedCompanyCode} not found in organizations collection`);
        
        // Try a broader search with case-insensitive regex
        const companyRecordAlt = await organizationsCollection.findOne({
          companyCode: { $regex: `^${normalizedCompanyCode}$`, $options: 'i' }
        });
        
        if (!companyRecordAlt) {
          console.log(`[SIGNUP] Company not found with case-insensitive search either`);
          
          if (!companyExists) {
            return NextResponse.json(
              { success: false, message: 'Invalid company code' },
              { status: 404 }
            );
          }
        } else {
          console.log(`[SIGNUP] Found company with case-insensitive search: ${companyRecordAlt.companyCode}`);
          companyRecord = companyRecordAlt;
          companyExists = true;
          companyInfo = companyRecord;
        }
      } else {
        console.log(`[SIGNUP] Found company in organizations: ${companyRecord.name}, code: ${companyRecord.companyCode}`);
        companyExists = true;
        companyInfo = companyRecord;
      }
    }

    // If we've confirmed the company exists (either in database list or organizations collection)
    if (companyExists) {
      console.log(`[SIGNUP] Company exists, proceeding with signup`);
      
      // Use the verified company code for all operations
      const verifiedCompanyCode = normalizedCompanyCode;
      
      // If we didn't get company info from organizations, create minimal info
      if (!companyInfo) {
        companyInfo = {
          name: company || normalizedCompanyCode,
          companyCode: normalizedCompanyCode
        };
        
        // Try to add this company to organizations if it doesn't exist there
        try {
          const mainDb = client.db('org_sim_db');
          const organizationsCollection = mainDb.collection('organizations');
          
          // Check if it exists first
          const existingOrg = await organizationsCollection.findOne({ companyCode: normalizedCompanyCode });
          
          if (!existingOrg) {
            // Add it to organizations for future consistency
            await organizationsCollection.insertOne({
              name: company || normalizedCompanyCode,
              companyCode: normalizedCompanyCode,
              createdAt: new Date(),
              autoCreated: true  // Flag that this was auto-created
            });
            console.log(`[SIGNUP] Auto-created organization record for ${normalizedCompanyCode}`);
          }
        } catch (err) {
          console.error(`[SIGNUP] Failed to auto-create organization:`, err);
          // Continue anyway since the database exists
        }
      }
      
      // Now connect to company database using the verified code to check user existence
      try {
        console.log(`[SIGNUP] Connecting to company database to check user existence: company_${verifiedCompanyCode}`);
        const companyConn = await getDBConnection(verifiedCompanyCode);
        console.log(`[SIGNUP] Successfully connected to company database`);
        
        const User = getUserModel(verifiedCompanyCode);
        console.log(`[SIGNUP] Got User model for company: ${verifiedCompanyCode}`);

        // MOVED THIS CHECK TO BEFORE MFA GENERATION
        // Check if user with email or username already exists
        const existingUser = await User.findOne({ 
          $or: [
            { email: email.toLowerCase() },
            { username }
          ]
        });

        if (existingUser) {
          console.log(`[SIGNUP] User with email ${email} or username ${username} already exists`);
          return NextResponse.json(
            { success: false, message: 'User with this email or username already exists' },
            { status: 400 }
          );
        }

        // Check subscription limits
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2025-05-28.basil' });
        const PLAN_LIMITS: Record<string, number> = { starter: 20, standard: 100, enterprise: 200 };
        await connectDB('org_sim_db');
        let stripeSubscription: Stripe.Subscription | null = null;
        try {
          const customers = await stripe.customers.search({ query: `metadata['companyCode']:'${verifiedCompanyCode}'`, limit: 1 });
          if (customers.data.length) {
            const cust = customers.data[0];
            const subs = await stripe.subscriptions.list({ customer: cust.id, status: 'active', limit: 1 });
            stripeSubscription = subs.data[0] || null;
          }
        } catch (err) {
          console.error('[SIGNUP] Stripe subscription lookup failed, falling back:', err);
        }
 
        let userLimit = 0;
        let planType = '';
        const localSub = await Subscription.findOne({ companyCode: verifiedCompanyCode });
        if (localSub) {
          userLimit = localSub.userLimit;
          planType = localSub.planType;
        }
        
        if (userLimit > 0) {
          const companyDb = client.db(`company_${verifiedCompanyCode}`);
          const usersCollection = companyDb.collection('users');
          const userCount = await usersCollection.countDocuments({ status: 'active' });
          if (userCount >= userLimit) {
            return NextResponse.json({ success: false, message: `User limit reached for ${planType}`, planLimitReached: true, currentPlan: planType }, { status: 403 });
          }
        }

        // Generate email verification token
        const emailVerificationToken = generateRandomToken();

        // Always store company name in lowercase
        const companyName = company ? company.toLowerCase() : (companyInfo.name || '').toLowerCase();

        // Store password as plaintext temporarily - it will be hashed by the User model's pre-save hook
        // This prevents double-hashing which causes login issues
        const passwordToStore = password;

        // Generate a temporary user ID for MFA session
        const tempUserId = generateRandomToken();

        console.log(`[SIGNUP] Preparing user data for temporary storage: ${email}`);

        // Create user record immediately but with emailVerified: false
        console.log(`[SIGNUP] Creating user record immediately with unverified status`);
        
        const newUser = new User({
          username,
          email: email.toLowerCase(),
          password: passwordToStore, // Will be hashed by User model pre-save hook
          firstName: firstName || '',
          lastName: lastName || '',
          company: companyName,
          companyCode: verifiedCompanyCode,
          role: 'employee_tier_3',
          status: 'pending', // User is pending until admin approval
          emailVerified: false, // This is key - not verified until MFA passes
          emailVerificationToken,
          createdAt: new Date(),
          isActive: false // Not active until both email verified and admin approved
        });

        const savedUser = await newUser.save();
        const userId = String(savedUser._id);
        console.log(`[SIGNUP] ✅ User created with ID: ${userId}, but not verified yet`);

        // Generate MFA session ID
        const mfaSessionId = crypto.randomUUID();

        // Generate MFA code and store it
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const mfaStored = storeMfaSession(userId, code, email, username, mfaSessionId);

        if (!mfaStored) {
          console.error(`[SIGNUP] Failed to store MFA session`);
          // Clean up the created user
          await User.findByIdAndDelete(savedUser._id);
          return NextResponse.json(
            { success: false, message: 'Failed to create verification session. Please try again.' },
            { status: 500 }
          );
        }

        // Send the email with the code
        const { sendOTPVerificationEmail } = await import('@/services/emailService');
        const emailSent = await sendOTPVerificationEmail(email, code, username);

        if (!emailSent) {
          console.error(`[SIGNUP] Failed to send OTP verification email to ${email}`);
          // Clean up the created user and MFA session
          await User.findByIdAndDelete(savedUser._id);
          return NextResponse.json(
            { success: false, message: 'Failed to send verification email. Please try again.' },
            { status: 500 }
          );
        }

        console.log(`[SIGNUP] ✅ User created and verification email sent`);

         // Return success with MFA session (no token until verification)
         return NextResponse.json({
          success: true,
          message: 'Please verify your email with the code we sent to complete registration.',
          requireMFA: true,
          mfaSession: mfaSessionId,
          tempUser: {
            id: userId,
            email: savedUser.email,
            username: savedUser.username,
            firstName: savedUser.firstName,
            lastName: savedUser.lastName,
            company: companyName,
            companyCode: verifiedCompanyCode
          }
        });
      } catch (dbError: any) {
        console.error(`[SIGNUP] Database error: ${dbError.message}`, dbError);
        return NextResponse.json(
          { success: false, message: `Database error: ${dbError.message}` },
          { status: 500 }
        );
      }
    } else {
      console.log(`[SIGNUP] Company does not exist with code: ${normalizedCompanyCode}`);
      return NextResponse.json(
        { success: false, message: 'Invalid company code' },
        { status: 404 }
      );
    }
  } catch (error: any) {
    console.error('[SIGNUP] Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'An error occurred during signup' },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.close();
      console.log('[SIGNUP] MongoDB client closed');
    }
  }
}