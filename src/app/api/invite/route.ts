import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { sendCompanyInvitationEmail } from '@/services/emailService';

export async function POST(request: NextRequest) {
  try {
    // 1. Get token from Authorization header
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      console.log('[POST /api/invite] Missing authorization token');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Verify the token and check admin permissions
    const payload = await verifyAuth(token);
    console.log('[POST /api/invite] Token payload:', payload);
    if (!payload || !payload.id) {
      console.log('[POST /api/invite] Invalid token or payload missing ID');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 3. Check if user is admin
    if (payload.role !== 'admin' && payload.role !== 'superadmin') {
      console.log('[POST /api/invite] User is not admin:', payload.role);
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // 4. Parse request body
    const body = await request.json();
    const { emails, adminName, companyCode, organizationName } = body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json({ error: 'Email list is required' }, { status: 400 });
    }

    if (!adminName || !companyCode) {
      return NextResponse.json({ error: 'Admin name and company code are required' }, { status: 400 });
    }

    console.log(`[POST /api/invite] Sending invitations to ${emails.length} recipients`);

    // 5. Send invitations to all emails
    const results = [];
    for (const email of emails) {
      try {
        const success = await sendCompanyInvitationEmail(
          email.trim(),
          adminName,
          companyCode,
          organizationName || 'your organization'
        );
        
        results.push({
          email: email.trim(),
          success,
          error: success ? null : 'Failed to send email'
        });
      } catch (error) {
        console.error(`[POST /api/invite] Error sending to ${email}:`, error);
        results.push({
          email: email.trim(),
          success: false,
          error: 'Failed to send email'
        });
      }
    }

    // 6. Return results
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    console.log(`[POST /api/invite] Invitation results: ${successCount} sent, ${failureCount} failed`);

    return NextResponse.json({
      message: `Invitations processed: ${successCount} sent, ${failureCount} failed`,
      results,
      summary: {
        total: results.length,
        sent: successCount,
        failed: failureCount
      }
    });

  } catch (error: any) {
    console.error('[POST /api/invite] Error processing invitations:', error);
    return NextResponse.json(
      { error: 'Failed to process invitations' },
      { status: 500 }
    );
  }
}
