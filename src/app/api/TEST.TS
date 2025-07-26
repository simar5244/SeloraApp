// app/api/webhook/route.ts
export async function POST() {
    return new Response('Webhook endpoint exists', { status: 200 });
}

export async function GET() {
    return new Response('Webhook GET works', { status: 200 });
}