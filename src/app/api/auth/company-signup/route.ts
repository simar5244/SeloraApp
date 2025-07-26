import { NextRequest, NextResponse } from 'next/server';
import { generateToken } from '@/lib/auth';
import connectDB from '@/lib/dbConnect';
import { getDBConnection, connectToCompanyDB } from '@/lib/companyDBConnect';
import { getUserModel } from '@/models/User';
import { SubscriptionModel } from '@/models/Subscription';
import Stripe from 'stripe';
import { Types } from 'mongoose';
import { getAuthUserModel } from '@/models/AuthUser';
import { sendWelcomeEmailToNewUser } from '@/lib/mfa';

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-05-28.basil',
});

interface UserDocument extends Document {
  _id: Types.ObjectId;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  company: string;
  companyCode: string;
  emailVerified: boolean;
  isActive: boolean;
  status: string;
  stripeCustomerId?: string;
  save(): Promise<this>;
}

// MongoDB connection string
const uri = process.env.MONGODB_URI || '';

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body = await req.json();
    console.log('[COMPANY SIGNUP] Received signup data:', body);
    console.log('Company signup body:', body);
    
    // Extract and validate required fields
    const {
      companyName,
      companyCode,
      adminEmail,
      adminPassword,
      adminFirstName = '',
      adminLastName = '',
      priceId,
      promoCode,
      paymentMethodId // new field from frontend for payment
    } = body;

    if (!companyName || !companyCode || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Connect to main database with company code
    await connectDB(companyCode);
    
    // Connect to the company-specific database
    await connectToCompanyDB(companyCode);
    const User = getUserModel(companyCode);
    const Subscription = SubscriptionModel;

    // Check if email is already in use
    const existingUser = await User.findOne({ email: adminEmail.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already in use' },
        { status: 400 }
      );
    }

    // Generate username from email by taking the part before @
    const generatedUsername = adminEmail.split('@')[0].toLowerCase();

    // Create admin user
    const adminUser = new User({
      email: adminEmail.toLowerCase(),
      username: generatedUsername, // Auto-generate username from email
      password: adminPassword,
      firstName: adminFirstName,
      lastName: adminLastName,
      role: 'admin',
      company: companyName,
      companyCode,
      emailVerified: true,
      status: 'active',
      isActive: true,
      stripeCustomerId: '', // Will be set after Stripe customer creation
    }) as any; // Using any to bypass TypeScript checks for now

    // Save the user to get the _id
    const savedUser = await adminUser.save();
    const userId = savedUser._id.toString();

    // Create Stripe customer
    const customer = await stripe.customers.create({
      email: adminEmail.toLowerCase(),
      name: `${adminFirstName} ${adminLastName}`.trim() || companyName,
      metadata: {
        companyCode,
        companyName,
        userId,
        role: 'admin'
      },
    });

    // If a payment method is provided, attach and set as default
    if (paymentMethodId) {
      await stripe.paymentMethods.attach(paymentMethodId, { customer: customer.id });
      await stripe.customers.update(customer.id, {
        invoice_settings: { default_payment_method: paymentMethodId }
      });
    }

    // Only create a subscription immediately if we already have a payment method
    let subscription = null;
    let clientSecret: string | null = null;
    if (priceId && paymentMethodId) {
      try {
        // Create default_incomplete subscription and invoice
        subscription = await stripe.subscriptions.create({
          customer: customer.id,
          items: [{ price: priceId }],
          default_payment_method: paymentMethodId,
          payment_behavior: 'default_incomplete',
          expand: ['latest_invoice.payment_intent'],
          metadata: { companyCode, companyName, adminEmail: adminEmail.toLowerCase(), promoCode: promoCode || '' }
        });
        // Extract PaymentIntent client secret for confirmation on frontend
        clientSecret = (subscription.latest_invoice as any).payment_intent.client_secret;
        // Confirm the PaymentIntent immediately to finalize payment
        const paymentIntentId = (subscription.latest_invoice as any).payment_intent.id;
        if (paymentIntentId) {
          await stripe.paymentIntents.confirm(paymentIntentId);
        }
      } catch (error) {
        console.error('Error creating subscription:', error);
      }
    }

    // Update user with Stripe customer ID
    savedUser.stripeCustomerId = customer.id;
    await savedUser.save();

    // Create AuthUser record in central auth database for login
    try {
      const AuthUserModel = await getAuthUserModel();
      // Delete any existing auth user with same email to prevent duplicates
      await AuthUserModel.deleteMany({ email: savedUser.email.toLowerCase() });
      
      // Create new auth user with explicit admin role
      const authUser = await AuthUserModel.create({
        userId,
        originalId: savedUser._id,
        username: savedUser.username,
        email: savedUser.email.toLowerCase(),
        password: savedUser.password, // already hashed from User model
        role: 'admin', // Explicitly set role to admin
        status: 'active',
        companyCode,
        companyName,
        databaseName: `company_${companyCode.toLowerCase()}`,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log('Created AuthUser record for', savedUser.email, 'in auth_db with ID:', authUser._id);
      
      // Add a small delay to ensure the auth record is fully committed
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (authErr) {
      console.error('Error creating AuthUser record:', authErr);
      // Don't fail the entire signup if auth user creation fails
      // The user can still log in with email/password which will create the auth record
    }

    // Generate JWT token with explicit admin role
    const token = generateToken({
      id: userId,
      email: savedUser.email,
      role: 'admin', // Explicitly set role to admin
      companyCode: savedUser.companyCode,
      status: 'active' // Ensure status is set
    });

    console.log('Generated token with role: admin for user:', savedUser.email);

    // Helper function to get the correct base URL (matching working Stripe flows)
    const getBaseUrl = (request: NextRequest) => {
      console.log('\n=== DEBUG: getBaseUrl called ===');
      console.log('NODE_ENV:', process.env.NODE_ENV);
      
      // Use the same approach as the working billing portal
      const origin = request.headers.get('origin');
      if (origin && !origin.includes('localhost:8080')) {
        console.log(`[DEBUG] Using origin header: ${origin}`);
        return origin;
      }
      
      // 1. First check NEXT_PUBLIC_APP_URL (should be set in .env.local for development)
      if (process.env.NEXT_PUBLIC_APP_URL) {
        console.log(`[DEBUG] Using NEXT_PUBLIC_APP_URL: ${process.env.NEXT_PUBLIC_APP_URL}`);
        return process.env.NEXT_PUBLIC_APP_URL;
      }
      
      // 2. Check if we're in development mode
      const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
      if (isDev) {
        const devUrl = 'http://localhost:3000';
        console.log(`[DEBUG] Development mode, using: ${devUrl}`);
        return devUrl;
      }
      
      // 3. Try to get from request headers
      const host = request.headers.get('host');
      const proto = request.headers.get('x-forwarded-proto') || 'https';
      
      if (host && !host.includes('localhost') && !host.includes('0.0.0.0')) {
        const url = `${proto}://${host}`;
        console.log(`[DEBUG] Using request headers for URL: ${url}`);
        return url;
      }
      
      // 4. Fallback to BASE_URL or default production URL
      const fallbackUrl = process.env.BASE_URL || 'https://app.seloraa.com';
      console.log(`[DEBUG] Using fallback URL: ${fallbackUrl}`);
      return fallbackUrl;
    };

    // Get the base URL for the current environment
    console.log('\n=== DEBUG: Getting base URL for checkout session ===');
    const baseUrl = getBaseUrl(req);
    console.log('\n[DEBUG] Final baseUrl being used for redirects:', baseUrl);
    console.log('Current request URL:', req.url);
    console.log('Request headers:', JSON.stringify(Object.fromEntries(req.headers.entries()), null, 2));

    try {
      // Create Stripe checkout session with detailed logging
      console.log('\n=== DEBUG: Creating Stripe checkout session ===');
      console.log('Customer ID:', customer.id);
      console.log('Price ID:', priceId);
      
      const successUrl = `${baseUrl}/api/auth/verify-session?session_id={CHECKOUT_SESSION_ID}&company_code=${companyCode}&email=${encodeURIComponent(adminEmail)}`;
      const cancelUrl = `${baseUrl}/company-signup?canceled=true`;
      
      console.log('\n[DEBUG] Success URL:', successUrl);
      console.log('[DEBUG] Cancel URL:', cancelUrl);
      
      const sessionParams = {
        mode: 'subscription' as const,
        customer: customer.id,
        line_items: [{ price: priceId, quantity: 1 }],
        payment_method_types: ['card'],
        subscription_data: { 
          metadata: { 
            companyCode, 
            companyName, 
            userId: userId.toString() 
          } 
        },
        success_url: successUrl,
        cancel_url: cancelUrl,
        // Add these to prevent URL overrides
        allow_promotion_codes: true,
        billing_address_collection: 'auto',
      };
      
      console.log('\n[DEBUG] Stripe session params:', JSON.stringify(sessionParams, null, 2));
      
      const session = await stripe.checkout.sessions.create(sessionParams as any);
      
      console.log('\n[DEBUG] Stripe session created successfully:', {
        id: session.id,
        url: session.url,
        success_url: session.success_url,
        cancel_url: session.cancel_url
      });

      console.log('\n[DEBUG] Final session details:', {
        id: session.id,
        url: session.url,
        success_url: session.success_url,
        cancel_url: session.cancel_url,
        customer: session.customer,
        client_reference_id: session.client_reference_id,
        metadata: session.metadata
      });

      // Return session URL to frontend
      return NextResponse.json({ 
        success: true, 
        message: 'Signup pending payment', 
        data: { 
          user: savedUser, 
          token, 
          sessionUrl: session.url 
        } 
      });
    } catch (error: any) {
      console.error('Error in company signup:', error);
      return NextResponse.json(
        { error: error.message || 'Internal server error' },
        { status: 500 }
      );
    } finally {
      // Removed the if (client) condition as it was not defined anywhere in the code
    }
  } catch (error: any) {
    console.error('Error in company signup:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  } finally {
    // Removed the if (client) condition as it was not defined anywhere in the code
  }
}