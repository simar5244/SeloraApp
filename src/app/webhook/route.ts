import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

// Initialize Stripe with the latest API version
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-05-28.basil',
  typescript: true,
  timeout: 10000,
  maxNetworkRetries: 2,
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

// Validate required environment variables
if (!webhookSecret) {
  console.error('❌ STRIPE_WEBHOOK_SECRET is not set');
  process.exit(1);
}

export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper to read raw body as string
async function getRawBody(readable: ReadableStream<Uint8Array> | null): Promise<string> {
  if (!readable) return '';
  const reader = readable.getReader();
  const chunks: Uint8Array[] = [];
  let result;
  
  do {
    result = await reader.read();
    if (!result.done && result.value) {
      chunks.push(result.value);
    }
  } while (!result.done);

  return Buffer.concat(chunks).toString('utf-8');
}

export async function POST(req: NextRequest) {
  try {
    // 1. Get raw body and signature
    const rawBody = await getRawBody(req.body);
    const signature = req.headers.get('stripe-signature') || '';

    console.log('=== Webhook Debug ===');
    console.log('Raw body:', rawBody);

    if (!signature) {
      throw new Error('No Stripe-Signature header found');
    }

    // 2. Verify webhook signature
    const event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
      300 // 5 minute tolerance
    );

    console.log('✅ Webhook verified:', event.type);

    // Forward the event to Python webhook service
    try {
      const pythonWebhookUrl = 'http://0.0.0.0:3333/webhook'; // or 'http://localhost:3333/webhook'???;
      console.log(`Forwarding event to Python webhook at ${pythonWebhookUrl}`);
      
      // Forward the exact same payload and headers
      await fetch(pythonWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Stripe-Signature': signature
        },
        body: rawBody
      });
      
      console.log('✅ Successfully forwarded to Python webhook');
    } catch (error) {
      console.error('❌ Failed to forward to Python webhook:', error);
      // Don't fail the main webhook if forwarding fails
    }

    // 3. Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        console.log('💰 Payment succeeded!', event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });

  } catch (err: any) {
    console.error('❌ Webhook error:', err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }
}

// Add OPTIONS method for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Stripe-Signature',
    },
  });
}
