import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/auth';
import { MongoClient } from 'mongodb';
import connectDB from '@/lib/dbConnect';
import { getFeedbackModel } from '@/models/Feedback';

const MONGODB_URI = process.env.MONGODB_URI!;

/**
 * GET /api/evaluation-metrics/employee-profile
 * Get detailed employee profile with feedback details, charts data, and performance metrics
 */
export async function GET(req: NextRequest) {
  console.log('[EvaluationMetrics Profile API] Starting employee profile request...');
  
  // Authenticate and enforce multi-tenancy
  const authResult = await authMiddleware(req);
  if (authResult) {
    console.log('[EvaluationMetrics Profile API] Authentication failed:', authResult);
    return authResult;
  }
  
  const user = (req as any).user;
  if (!user?.companyCode) {
    console.error('[EvaluationMetrics Profile API] No company code found in user context');
    return NextResponse.json({ error: 'Company not found' }, { status: 403 });
  }

  // Check if user has permission to access evaluation metrics
  const allowedRoles = ['admin', 'superadmin', 'top_management_tier_1', 'top_management_tier_2', 'top_management_tier_3'];
  if (!allowedRoles.includes(user.role)) {
    console.error('[EvaluationMetrics Profile API] Access denied for role:', user.role);
    return NextResponse.json({
      error: 'Access denied',
      message: 'This feature is only available to admin and top management users',
      userRole: user.role
    }, { status: 403 });
  }
  
  // Get email from URL parameters
  const searchParams = req.nextUrl.searchParams;
  const email = searchParams.get('email');
  
  if (!email) {
    console.error('[EvaluationMetrics Profile API] No email provided');
    return NextResponse.json({ error: 'Employee email is required' }, { status: 400 });
  }
  
  console.log('[EvaluationMetrics Profile API] Authenticated user:', user.email, 'Company:', user.companyCode);
  console.log('[EvaluationMetrics Profile API] Requested employee email:', email);
  
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('[EvaluationMetrics Profile API] Connected to MongoDB');
    
    // Use company-specific database
    const dbName = `company_${user.companyCode.toLowerCase()}`;
    const db = client.db(dbName);
    const usersCollection = db.collection('users');
    
    console.log('[EvaluationMetrics Profile API] Using database:', dbName);
    
    // Find the employee
    const employee = await usersCollection.findOne({ 
      email: { $regex: `^${email}$`, $options: 'i' } 
    });
    
    if (!employee) {
      console.log('[EvaluationMetrics Profile API] Employee not found:', email);
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }
    
    console.log('[EvaluationMetrics Profile API] Found employee:', employee.email);
    
    // Connect to feedback model to get detailed feedback
    await connectDB(user.companyCode);
    const FeedbackModel = getFeedbackModel(user.companyCode);
    
    console.log('[EvaluationMetrics Profile API] Fetching detailed feedback for employee...');
    
    // Get all feedback received by this employee
    const feedbackReceived = await FeedbackModel.find({
      documentType: 'feedback',
      evaluatedEmail: { $regex: `^${email}$`, $options: 'i' }
    }).lean();
    
    console.log('[EvaluationMetrics Profile API] Found', feedbackReceived.length, 'feedback records');
    
    // Get evaluator details for each feedback
    const feedbackDetails = [];
    
    for (const feedback of feedbackReceived) {
      console.log('[EvaluationMetrics Profile API] Processing feedback from:', feedback.evaluatorEmail);
      
      // Find evaluator details
      const evaluator = await usersCollection.findOne({
        email: { $regex: `^${feedback.evaluatorEmail}$`, $options: 'i' }
      });
      
      const feedbackDetail = {
        evaluatorName: feedback.evaluatorName || 
          (evaluator ? `${evaluator.firstName || ''} ${evaluator.lastName || ''}`.trim() : 'Unknown'),
        evaluatorEmail: feedback.evaluatorEmail,
        evaluatorJobTitle: evaluator?.jobTitle || 'Not specified',
        evaluatorInternalRole: feedback.evaluatorInternalRole || evaluator?.role || 'Not specified',
        relationshipType: feedback.relationshipType || 'Not specified',
        averageRating: feedback.averageRating || 0,
        weightedRating: feedback.weightedRating || 0,
        quarter: feedback.quarter || 'Not specified',
        ratings: feedback.ratings || {},
        topSkills: feedback.topSkills || '',
        createdAt: feedback.createdAt
      };
      
      feedbackDetails.push(feedbackDetail);
      
      console.log('[EvaluationMetrics Profile API] Added feedback detail from:', feedbackDetail.evaluatorName);
    }
    
    // Sort feedback by date (most recent first)
    feedbackDetails.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateB.getTime() - dateA.getTime();
    });
    
    console.log('[EvaluationMetrics Profile API] Sorted feedback details by date');
    
    // Calculate performance trends and analytics
    const performanceAnalytics = calculatePerformanceAnalytics(feedbackDetails);
    
    console.log('[EvaluationMetrics Profile API] Calculated performance analytics');
    
    // Format the complete employee profile
    const displayName = employee.firstName && employee.lastName 
      ? `${employee.firstName} ${employee.lastName}`
      : employee.username || 'Unknown';
    
    const employeeProfile = {
      id: employee._id.toString(),
      name: displayName,
      email: employee.email,
      jobTitle: employee.jobTitle || 'Not specified',
      department: employee.department || 'Not specified',
      feedbackMetrics: employee.feedbackMetrics || {
        received: { count: 0, averageRating: 0, weightedAverageRating: 0 }
      },
      feedbackDetails,
      performanceAnalytics,
      attritionScore: employee.attritionAssessment?.attrition_score || 0,
      attritionRisk: employee.attritionAssessment?.attrition_risk || 'Unknown',
      utilization_score: employee.utilization_score || 0,
      strengths: employee.strengths || [],
      developmentAreas: employee.developmentAreas || [],
      // Additional profile data from succession planning
      skillsFeedback: employee.skillsFeedback || { given: [], received: [] },
      toolsProficient: employee.toolsProficient || '',
      workMode: employee.workMode || 'Not specified',
      officeLocation: employee.officeLocation || 'Not specified',
      salary: employee.salary || 'Not disclosed'
    };
    
    console.log('[EvaluationMetrics Profile API] Complete employee profile prepared');
    console.log('[EvaluationMetrics Profile API] Profile summary:');
    console.log('[EvaluationMetrics Profile API] - Name:', employeeProfile.name);
    console.log('[EvaluationMetrics Profile API] - Total feedback records:', feedbackDetails.length);
    console.log('[EvaluationMetrics Profile API] - Average rating:', employeeProfile.feedbackMetrics?.received?.averageRating);
    console.log('[EvaluationMetrics Profile API] - Weighted rating:', employeeProfile.feedbackMetrics?.received?.weightedAverageRating);
    console.log('[EvaluationMetrics Profile API] - Attrition risk:', employeeProfile.attritionRisk);
    
    return NextResponse.json(employeeProfile);
    
  } catch (error: any) {
    console.error('[EvaluationMetrics Profile API] Error fetching employee profile:', error);
    console.error('[EvaluationMetrics Profile API] Error stack:', error.stack);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch employee profile',
        details: error.message 
      },
      { status: 500 }
    );
  } finally {
    await client.close();
    console.log('[EvaluationMetrics Profile API] MongoDB connection closed');
  }
}

/**
 * Calculate performance analytics from feedback details
 */
function calculatePerformanceAnalytics(feedbackDetails: any[]) {
  console.log('[EvaluationMetrics Profile API] Calculating performance analytics...');
  
  if (feedbackDetails.length === 0) {
    console.log('[EvaluationMetrics Profile API] No feedback data for analytics');
    return {
      quarterlyTrends: [],
      ratingDistribution: {},
      relationshipAnalysis: {},
      skillsAnalysis: []
    };
  }
  
  // Group feedback by quarter
  const quarterlyData: { [key: string]: any[] } = {};
  const relationshipData: { [key: string]: any[] } = {};
  const ratingCategories = ['accountability', 'teamContribution', 'adaptability', 'communication', 'confidence'];
  const ratingDistribution: { [key: string]: number } = {};
  
  feedbackDetails.forEach(feedback => {
    // Quarterly trends
    const quarter = feedback.quarter || 'Unknown';
    if (!quarterlyData[quarter]) {
      quarterlyData[quarter] = [];
    }
    quarterlyData[quarter].push(feedback);
    
    // Relationship analysis
    const relationship = feedback.relationshipType || 'Unknown';
    if (!relationshipData[relationship]) {
      relationshipData[relationship] = [];
    }
    relationshipData[relationship].push(feedback);
    
    // Rating distribution
    if (feedback.ratings) {
      ratingCategories.forEach(category => {
        const rating = feedback.ratings[category];
        if (rating) {
          const key = `${category}_${rating}`;
          ratingDistribution[key] = (ratingDistribution[key] || 0) + 1;
        }
      });
    }
  });
  
  // Calculate quarterly trends
  const quarterlyTrends = Object.keys(quarterlyData).map(quarter => {
    const quarterFeedback = quarterlyData[quarter];
    const avgRating = quarterFeedback.reduce((sum, fb) => sum + (fb.averageRating || 0), 0) / quarterFeedback.length;
    const avgWeightedRating = quarterFeedback.reduce((sum, fb) => sum + (fb.weightedRating || 0), 0) / quarterFeedback.length;
    
    return {
      quarter,
      count: quarterFeedback.length,
      averageRating: avgRating,
      weightedAverageRating: avgWeightedRating
    };
  });
  
  // Calculate relationship analysis
  const relationshipAnalysis = Object.keys(relationshipData).map(relationship => {
    const relationshipFeedback = relationshipData[relationship];
    const avgRating = relationshipFeedback.reduce((sum, fb) => sum + (fb.averageRating || 0), 0) / relationshipFeedback.length;
    
    return {
      relationshipType: relationship,
      count: relationshipFeedback.length,
      averageRating: avgRating
    };
  });
  
  // Extract and analyze skills
  const skillsAnalysis = feedbackDetails
    .filter(fb => fb.topSkills && fb.topSkills.trim())
    .map(fb => ({
      skill: fb.topSkills,
      evaluator: fb.evaluatorName,
      quarter: fb.quarter
    }));
  
  console.log('[EvaluationMetrics Profile API] Performance analytics calculated');
  console.log('[EvaluationMetrics Profile API] - Quarterly trends:', quarterlyTrends.length);
  console.log('[EvaluationMetrics Profile API] - Relationship analysis:', relationshipAnalysis.length);
  console.log('[EvaluationMetrics Profile API] - Skills analysis:', skillsAnalysis.length);
  
  return {
    quarterlyTrends,
    ratingDistribution,
    relationshipAnalysis,
    skillsAnalysis
  };
}
