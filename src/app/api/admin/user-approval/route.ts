import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { verifyAuth } from '@/lib/auth';
import { cleanupMfaSessionsForUser } from '@/lib/mfa';
import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

// MongoDB connection string
const uri = process.env.MONGODB_URI || '';

export async function GET(request: NextRequest) {
  let client = null;
  
  try {
    // Get authentication token
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      console.log('[USER APPROVAL] Missing authorization token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify authentication
    const payload = await verifyAuth(token);
    if (!payload) {
      console.log('[USER APPROVAL] Invalid token or verification failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[USER APPROVAL] User requesting pending users:', {
      id: payload.id,
      email: payload.email,
      role: payload.role,
      company: payload.company,
      companyCode: payload.companyCode
    });

    // Check if user has permission to view pending users
    const allowedRoles = ['admin', 'superadmin'];
    if (!allowedRoles.includes(payload.role)) {
      console.log(`[USER APPROVAL] Access denied: User role "${payload.role}" is not authorized`);
      return NextResponse.json({ 
        error: 'Access denied', 
        message: 'Only admin and superadmin roles can access this endpoint',
        userRole: payload.role
      }, { status: 403 });
    }

    // Connect to MongoDB
    client = new MongoClient(uri);
    await client.connect();
    
    let pendingUsers = [];
    
    // For admin users, get pending users from their company database
    if (payload.role === 'admin' && payload.companyCode) {
      const companyCode = payload.companyCode.toLowerCase();
      console.log(`[USER APPROVAL] Fetching pending users for company: ${companyCode}`);
      
      const companyDb = client.db(`company_${companyCode}`);
      const usersCollection = companyDb.collection('users');
      
      // Get all users with pending status
      const users = await usersCollection.find({ status: 'pending' })
        .sort({ createdAt: -1 })
        .toArray();
      
      console.log(`[USER APPROVAL] Found ${users.length} pending users in company database`);
      
      // Format users for response
      pendingUsers = users.map(user => ({
        _id: user._id.toString(),
        id: user._id.toString(), // Include both for compatibility
        username: user.username,
        email: user.email,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        role: user.role,
        status: user.status,
        company: payload.company,
        companyCode: companyCode,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }));
    } else if (payload.role === 'superadmin') {
      // Superadmin can see pending users from all companies
      // For now, we'll implement this if needed
      console.log('[USER APPROVAL] Superadmin access - not implemented yet');
      pendingUsers = [];
    }

    console.log(`[USER APPROVAL] Returning ${pendingUsers.length} pending users`);
    
    return NextResponse.json({
      success: true,
      pendingUsers,
      message: `Found ${pendingUsers.length} pending users`
    });
    
  } catch (error: any) {
    console.error('[USER APPROVAL] Error fetching pending users:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Failed to fetch pending users',
      pendingUsers: []
    }, { status: 500 });
  } finally {
    if (client) {
      await client.close();
    }
  }
}

export async function POST(request: NextRequest) {
  let client = null;
  
  try {
    // Get authentication token
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      console.log('[USER APPROVAL] Missing authorization token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify authentication
    const payload = await verifyAuth(token);
    if (!payload) {
      console.log('[USER APPROVAL] Invalid token or verification failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has permission to approve/reject users
    const allowedRoles = ['admin', 'superadmin'];
    if (!allowedRoles.includes(payload.role)) {
      console.log(`[USER APPROVAL] Access denied: User role "${payload.role}" is not authorized`);
      return NextResponse.json({ 
        error: 'Access denied', 
        message: 'Only admin and superadmin roles can access this endpoint',
        userRole: payload.role
      }, { status: 403 });
    }

    // Parse request body
    const { userId, email, action, companyCode } = await request.json();
    
    console.log('[USER APPROVAL] Processing action:', {
      userId,
      email,
      action,
      companyCode: companyCode || payload.companyCode,
      requestedBy: payload.email
    });

    // Validate required fields
    if (!userId && !email) {
      return NextResponse.json({ 
        success: false,
        error: 'User ID or email is required' 
      }, { status: 400 });
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ 
        success: false,
        error: 'Valid action (approve or reject) is required' 
      }, { status: 400 });
    }

    // Use the company code from the request or payload
    const targetCompanyCode = (companyCode || payload.companyCode)?.toLowerCase();
    
    if (!targetCompanyCode) {
      return NextResponse.json({ 
        success: false,
        error: 'Company code is required' 
      }, { status: 400 });
    }

    // For admin users, ensure they can only approve users in their own company
    if (payload.role === 'admin' && payload.companyCode?.toLowerCase() !== targetCompanyCode) {
      console.log('[USER APPROVAL] Admin trying to approve user outside their company');
      return NextResponse.json({ 
        success: false,
        error: 'You can only approve users in your own company' 
      }, { status: 403 });
    }

    // Connect to MongoDB
    client = new MongoClient(uri);
    await client.connect();
    
    const companyDb = client.db(`company_${targetCompanyCode}`);
    const usersCollection = companyDb.collection('users');
    
    // Find the user to approve/reject
    let user = null;
    if (userId) {
      try {
        const { ObjectId } = require('mongodb');
        user = await usersCollection.findOne({ _id: new ObjectId(userId) });
      } catch (err) {
        console.log('[USER APPROVAL] Invalid ObjectId, trying string match');
        user = await usersCollection.findOne({ _id: userId });
      }
    }
    
    // If not found by ID, try by email
    if (!user && email) {
      user = await usersCollection.findOne({ email: email.toLowerCase() });
    }
    
    if (!user) {
      console.log('[USER APPROVAL] User not found:', { userId, email });
      return NextResponse.json({ 
        success: false,
        error: 'User not found' 
      }, { status: 404 });
    }

    // Check if user is in pending status
    if (user.status !== 'pending') {
      console.log('[USER APPROVAL] User is not in pending status:', user.status);
      return NextResponse.json({ 
        success: false,
        error: `User is not in pending status (current: ${user.status})` 
      }, { status: 400 });
    }

    // If approving, check user limits using EXACT same logic as user count API
    if (action === 'approve') {
      try {
        console.log('[USER APPROVAL] Checking user limits before approval');
        
        // Get current active user count
        const activeUserCount = await usersCollection.countDocuments({ status: 'active' });
        console.log('[USER APPROVAL] Current active users:', activeUserCount);
        
        // Use EXACT same stripe search logic as user count API
        const sanitizedCode = targetCompanyCode.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
        console.log(`[USER APPROVAL] Sanitized companyCode to: ${sanitizedCode}`);
        
        let subscription = null;
        
        // EXACT copy of stripeFirstSearch function
        const stripeFirstSearch = async (sanitizedCode: string) => {
          try {
            console.log(`[USER APPROVAL] Attempting Stripe-first lookup for company: ${sanitizedCode}`);
            
            // Search Stripe customers by metadata.companyCode
            const customers = await stripe.customers.search({
              query: `metadata['companyCode']:'${sanitizedCode}'`,
              limit: 1
            });
            
            if (customers.data.length === 0) {
              console.log(`[USER APPROVAL] No Stripe customer found for company: ${sanitizedCode}`);
              return null;
            }

            const customer = customers.data[0];
            console.log(`[USER APPROVAL] Found Stripe customer via metadata: ${customer.id}`);
            
            // Get all subscriptions for this customer
            const subsList = await stripe.subscriptions.list({ 
              customer: customer.id, 
              limit: 10,
              status: 'all' // Include all statuses initially
            });
            
            if (subsList.data.length === 0) {
              console.log(`[USER APPROVAL] No subscriptions found for customer: ${customer.id}`);
              return null;
            }

            // Sort by creation date to get the most recent
            const sortedSubs = subsList.data.sort((a, b) => (b.created || 0) - (a.created || 0));
            
            // First try to find an active subscription
            let targetSubscription = sortedSubs.find(sub => sub.status === 'active');
            
            // If no active subscription, use the most recent one
            if (!targetSubscription) {
              targetSubscription = sortedSubs[0];
              console.log(`[USER APPROVAL] No active subscription found, using most recent with status: ${targetSubscription.status}`);
            }
            
            // Retrieve full subscription with product expanded
            const stripeSub = await stripe.subscriptions.retrieve(targetSubscription.id, { 
              expand: ['items.data.price.product'] 
            });
            
            console.log(`[USER APPROVAL] Using subscription: ${targetSubscription.id} with status: ${stripeSub.status}`);
            
            const priceItem = stripeSub.items.data[0]?.price;
            if (!priceItem || typeof priceItem.product !== 'object') {
              console.log(`[USER APPROVAL] No valid price/product found for subscription: ${targetSubscription.id}`);
              return null;
            }

            const product = priceItem.product as Stripe.Product;
            
            // Determine planType from metadata or product name
            const metaPlan = product.metadata?.planType?.toLowerCase();
            let planType = ['Starter', 'standard', 'enterprise'].includes(metaPlan || '') ? metaPlan! :
              product.name.toLowerCase().includes('starter') ? 'starter' :
              product.name.toLowerCase().includes('enterprise') ? 'enterprise' : 'standard';
            
            // Determine userLimit from metadata or plan type
            const metaLimit = parseInt(product.metadata?.userLimit || '', 10);
            const userLimit = (!isNaN(metaLimit) && metaLimit > 0) ? metaLimit :
              planType === 'Starter' ? 20 : planType === 'standard' ? 100 : 200;

            // Fix the currentPeriodEnd date issue
            const currentPeriodEnd = stripeSub.current_period_end ? 
              new Date(stripeSub.current_period_end * 1000) : 
              new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

            const subscription = {
              _id: stripeSub.id,
              companyCode: sanitizedCode,
              planType,
              userLimit,
              status: stripeSub.status,
              currentPeriodEnd,
              stripePriceId: priceItem.id,
              productName: product.name || `${planType.charAt(0).toUpperCase() + planType.slice(1)} Plan`,
              stripeSubscriptionId: stripeSub.id
            };
            
            console.log('[USER APPROVAL] Stripe-first subscription:', subscription);
            return subscription;
            
          } catch (error) {
            console.warn('[USER APPROVAL] Stripe-first lookup failed:', error);
            return null;
          }
        };
        
        // Call the stripe search function
        console.log('[USER APPROVAL] Calling stripeFirstSearch for company:', sanitizedCode);
        subscription = await stripeFirstSearch(sanitizedCode);
        console.log('[USER APPROVAL] stripeFirstSearch returned:', JSON.stringify(subscription));
        
        // If no subscription found, DO NOT create default, just fail
        if (!subscription) {
          console.log('[USER APPROVAL] No subscription found, cannot determine limits');
          return NextResponse.json({ 
            success: false,
            error: 'Unable to determine subscription limits. Please contact support.'
          }, { status: 400 });
        }
        
        // Default user limits based on plan type (same as user count API)
        const defaultLimits: Record<string, number> = {
          starter: 20,
          standard: 100,
          enterprise: 200
        };
        
        // Get plan type and user limit with detailed logging
        const planType = subscription?.planType?.toLowerCase() || 'standard';
        console.log(`[USER APPROVAL] Plan type:`, planType);
        
        const userLimitFromSubscription = subscription?.userLimit;
        console.log(`[USER APPROVAL] User limit from subscription:`, userLimitFromSubscription);
        
        const userLimit = typeof userLimitFromSubscription === 'number' && userLimitFromSubscription > 0 ? 
          userLimitFromSubscription : 
          defaultLimits[planType] || defaultLimits.standard;
        
        console.log(`[USER APPROVAL] Final user limit:`, userLimit);
        
        // Check if limit has been reached
        const limitReached = activeUserCount >= userLimit;
        const remainingSlots = Math.max(0, userLimit - activeUserCount);
        
        console.log(`[USER APPROVAL] Limit reached: ${limitReached}, Remaining slots: ${remainingSlots}`);
        
        if (limitReached) {
          console.log('[USER APPROVAL] User limit reached, cannot approve');
          return NextResponse.json({ 
            success: false,
            error: `Cannot approve user. Maximum number of active users (${userLimit}) reached for ${planType} plan. Please upgrade your subscription to add more users.`
          }, { status: 400 });
        }
        
        console.log('[USER APPROVAL] User limit check passed, proceeding with approval');
        
      } catch (err) {
        console.warn('[USER APPROVAL] Error checking user limits:', err);
        // Continue with approval if we can't check limits
      }
    }

    if (action === 'approve') {
      // For approval, update the user status to active
      const updateData = {
        status: 'active',
        updatedAt: new Date(),
        approvedBy: payload.email,
        approvedAt: new Date()
      };

      const result = await usersCollection.updateOne(
        { _id: user._id },
        { $set: updateData }
      );

      if (result.modifiedCount === 0) {
        console.log('[USER APPROVAL] No user was updated');
        return NextResponse.json({ 
          success: false,
          error: 'Failed to update user status' 
        }, { status: 500 });
      }

      console.log('[USER APPROVAL] User approved successfully:', {
        userId: user._id,
        email: user.email,
        actionBy: payload.email
      });

      return NextResponse.json({
        success: true,
        message: 'User approved successfully',
        user: {
          _id: user._id.toString(),
          email: user.email,
          username: user.username,
          status: 'active'
        }
      });
    } else {
      // For reject, completely remove the user and their data from ALL databases
      console.log('[USER APPROVAL] Deleting user data for rejected user:', {
        userId: user._id,
        email: user.email
      });

      // Start a session for the transaction
      const session = client.startSession();

      try {
        await session.withTransaction(async () => {
          // 1. Delete from company database users collection
          const result = await usersCollection.deleteOne({ _id: user._id }, { session });

          if (result.deletedCount === 0) {
            throw new Error('Failed to delete user from company database');
          }

          console.log('[USER APPROVAL] ✅ User deleted from company database');

          // 2. Delete from central auth database
          try {
            const authDb = client.db('auth_db');
            const authUsersCollection = authDb.collection('authUsers');
            const authResult = await authUsersCollection.deleteMany({
              $or: [
                { originalId: user._id },
                { email: user.email.toLowerCase() }
              ]
            });
            console.log(`[USER APPROVAL] ✅ Deleted ${authResult.deletedCount} records from central auth database`);
          } catch (authError) {
            console.error('[USER APPROVAL] ⚠️ Warning: Failed to delete from central auth database:', authError);
          }

          // 3. Delete from company auth collection
          try {
            const companyAuthCollection = companyDb.collection('auth');
            const companyAuthResult = await companyAuthCollection.deleteMany({
              $or: [
                { originalId: user._id },
                { email: user.email.toLowerCase() }
              ]
            });
            console.log(`[USER APPROVAL] ✅ Deleted ${companyAuthResult.deletedCount} records from company auth collection`);
          } catch (companyAuthError) {
            console.error('[USER APPROVAL] ⚠️ Warning: Failed to delete from company auth collection:', companyAuthError);
          }

          // 4. Delete from legacy main database (fallback login source)
          try {
            const mainDb = client.db();
            const legacyUsersCollection = mainDb.collection('users');
            const legacyResult = await legacyUsersCollection.deleteMany({
              $or: [
                { _id: user._id },
                { email: user.email.toLowerCase() }
              ]
            });
            console.log(`[USER APPROVAL] ✅ Deleted ${legacyResult.deletedCount} records from legacy main database`);
          } catch (legacyError) {
            console.error('[USER APPROVAL] ⚠️ Warning: Failed to delete from legacy main database:', legacyError);
          }

          // 5. Clean up any active MFA sessions for this user
          try {
            const cleanedSessions = cleanupMfaSessionsForUser(user._id.toString(), user.email);
            console.log(`[USER APPROVAL] ✅ Cleaned up ${cleanedSessions} MFA sessions`);
          } catch (mfaError) {
            console.error('[USER APPROVAL] ⚠️ Warning: Failed to clean up MFA sessions:', mfaError);
          }

          console.log('[USER APPROVAL] ✅ User data deleted successfully from ALL databases and sessions cleaned up');
        });
        
        return NextResponse.json({
          success: true,
          message: 'User Rejected Successfully',
          user: {
            _id: user._id.toString(),
            email: user.email
          }
        });
        
      } catch (error: any) {
        console.error('[USER APPROVAL] Error during user deletion:', error);
        throw error; // This will trigger the outer catch block
      } finally {
        await session.endSession();
      }
    }

  } catch (error: any) {
    console.error('[USER APPROVAL] Error processing approval action:', error);
    return NextResponse.json({ 
      success: false,
      error: error.message || 'Failed to process approval action' 
    }, { status: 500 });
  } finally {
    if (client) {
      await client.close();
    }
  }
}