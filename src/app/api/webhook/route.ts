import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { 
      status: 'success',
      message: 'Webhook received successfully',
      timestamp: new Date().toISOString()
    },
    { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Status': 'OK'
      }
    }
  );
}

export async function GET() {
  return NextResponse.json(
    { 
      status: 'success',
      message: 'Webhook endpoint is live',
      timestamp: new Date().toISOString(),
      methods: ['POST', 'GET', 'OPTIONS']
    },
    { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Status': 'OK'
      }
    }
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Stripe-Signature',
      'X-Webhook-Status': 'CORS-OK'
    }
  });
}
