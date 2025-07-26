import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { connectToCompanyDb } from '@/lib/companyDb';

export async function GET(request: NextRequest) {
  try {
    // Get token from cookies or authorization header
    const cookieToken = request.cookies.get('token')?.value;
    const headerToken = request.headers.get('authorization')?.split(' ')[1];
    const token = cookieToken || headerToken || '';
    
    if (!token) {
      return NextResponse.json({ error: 'No authentication token provided' }, { status: 401 });
    }
    
    // Verify authentication and get user info
    const authResult = await verifyAuth(token);
    if (!authResult) {
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }
    
    const { companyCode, email, userId, sub } = authResult;
    if (!companyCode || !email) {
      return NextResponse.json({ error: 'Company code or user email not found' }, { status: 400 });
    }
    
    // Connect to the company-specific database
    const { client, companyDb } = await connectToCompanyDb(companyCode);
    
    try {
      // Get the user's scheduled reports, sorted by creation date (newest first)
      const currentUserId = userId || sub;
      const scheduledReports = await companyDb.collection('scheduled_reports')
        .find({ userId: currentUserId })
        .sort({ createdAt: -1 })
        .toArray();
      
      // Map the reports to the format expected by the dashboard
      const mappedReports = scheduledReports.map(report => ({
        _id: report._id,
        name: report.reportTopic || 'Untitled Report',
        title: report.reportTopic || 'Untitled Report',
        type: 'scheduled',
        createdAt: report.createdAt,
        createdBy: {
          name: 'You', // Since these are user's own reports
          email: email
        },
        nextRun: report.nextExecution,
        frequency: report.scheduleFrequency,
        status: report.isActive ? 'Active' : 'Canceled',
        // Include original fields for compatibility
        reportTopic: report.reportTopic,
        nextExecution: report.nextExecution,
        scheduleFrequency: report.scheduleFrequency,
        isActive: report.isActive,
        company: report.company,
        location: report.location,
        website: report.website,
        additionalContext: report.additionalContext,
        wordCount: report.wordCount,
        stakeholders: report.stakeholders,
        targetAudience: report.targetAudience,
        timeframe: report.timeframe,
        deliveryFormat: report.deliveryFormat,
        includeVisuals: report.includeVisuals,
        scheduleCustomMinutes: report.scheduleCustomMinutes,
        scheduleCustomHours: report.scheduleCustomHours,
        lastExecuted: report.lastExecuted,
        generatedReportIds: report.generatedReportIds
      }));
      
      const count = mappedReports.length;
      const recentScheduled = mappedReports.slice(0, 5); // Show up to 5 most recent
      
      return NextResponse.json({
        count,
        recent: recentScheduled
      });
      
    } finally {
      await client.close();
    }
    
  } catch (error: any) {
    console.error('Error fetching user scheduled reports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scheduled reports', details: error.message },
      { status: 500 }
    );
  }
}
