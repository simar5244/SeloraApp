import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/auth';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI!;

/**
 * GET /api/evaluation-metrics/top-bottom
 * Fetch top 5 and bottom 5 employees based on feedback ratings
 */
export async function GET(req: NextRequest) {
  console.log('[EvaluationMetrics API] Starting top-bottom performers request...');
  
  // Authenticate and enforce multi-tenancy
  const authResult = await authMiddleware(req);
  if (authResult) {
    console.log('[EvaluationMetrics API] Authentication failed:', authResult);
    return authResult;
  }
  
  const user = (req as any).user;
  if (!user?.companyCode) {
    console.error('[EvaluationMetrics API] No company code found in user context');
    return NextResponse.json({ error: 'Company not found' }, { status: 403 });
  }

  // Check if user has permission to access evaluation metrics
  const allowedRoles = ['admin', 'superadmin', 'top_management_tier_1', 'top_management_tier_2', 'top_management_tier_3'];
  if (!allowedRoles.includes(user.role)) {
    console.error('[EvaluationMetrics API] Access denied for role:', user.role);
    console.error('[EvaluationMetrics API] Allowed roles:', allowedRoles);
    return NextResponse.json({
      error: 'Access denied',
      message: 'This feature is only available to admin and top management users',
      userRole: user.role,
      allowedRoles: allowedRoles
    }, { status: 403 });
  }

  console.log('[EvaluationMetrics API] Authenticated user:', user.email, 'Role:', user.role, 'Company:', user.companyCode);
  
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('[EvaluationMetrics API] Connected to MongoDB');
    
    // Use company-specific database
    const dbName = `company_${user.companyCode.toLowerCase()}`;
    const db = client.db(dbName);
    const usersCollection = db.collection('users');
    
    console.log('[EvaluationMetrics API] Using database:', dbName);
    
    // Build aggregation pipeline to get employees with feedback metrics
    const pipeline = [
      {
        $match: {
          'feedbackMetrics.received.count': { $gt: 0 }, // Only employees with feedback
          'feedbackMetrics.received.averageRating': { $exists: true, $ne: null }
        }
      },
      {
        $addFields: {
          // Ensure we have proper names
          displayName: {
            $cond: {
              if: { $and: [{ $ne: ['$firstName', null] }, { $ne: ['$lastName', null] }] },
              then: { $concat: ['$firstName', ' ', '$lastName'] },
              else: { $ifNull: ['$username', 'Unknown'] }
            }
          }
        }
      },
      {
        $project: {
          _id: 1,
          name: '$displayName',
          email: 1,
          jobTitle: { $ifNull: ['$jobTitle', 'Not specified'] },
          department: { $ifNull: ['$department', 'Not specified'] },
          feedbackMetrics: 1,
          averageRating: '$feedbackMetrics.received.averageRating',
          weightedRating: '$feedbackMetrics.received.weightedAverageRating',
          feedbackCount: '$feedbackMetrics.received.count'
        }
      }
    ];
    
    console.log('[EvaluationMetrics API] Executing aggregation pipeline...');
    const employees = await usersCollection.aggregate(pipeline).toArray();
    
    console.log('[EvaluationMetrics API] Found', employees.length, 'employees with feedback data');
    
    if (employees.length === 0) {
      console.log('[EvaluationMetrics API] No employees with feedback found');
      return NextResponse.json({
        topPerformers: [],
        bottomPerformers: [],
        message: 'No employees with feedback data found'
      });
    }
    
    // Sort by average rating (descending for top, ascending for bottom)
    const sortedByRating = employees.sort((a, b) => {
      const ratingA = a.averageRating || 0;
      const ratingB = b.averageRating || 0;
      return ratingB - ratingA; // Descending order
    });
    
    console.log('[EvaluationMetrics API] Employees sorted by rating');
    console.log('[EvaluationMetrics API] Highest rating:', sortedByRating[0]?.averageRating);
    console.log('[EvaluationMetrics API] Lowest rating:', sortedByRating[sortedByRating.length - 1]?.averageRating);
    
    // Get top 5 performers
    const topPerformers = sortedByRating.slice(0, 5).map(emp => ({
      id: emp._id.toString(),
      name: emp.name,
      email: emp.email,
      jobTitle: emp.jobTitle,
      department: emp.department,
      feedbackMetrics: emp.feedbackMetrics
    }));
    
    // Get bottom 5 performers (reverse the array and take first 5)
    const bottomPerformers = sortedByRating.slice(-5).reverse().map(emp => ({
      id: emp._id.toString(),
      name: emp.name,
      email: emp.email,
      jobTitle: emp.jobTitle,
      department: emp.department,
      feedbackMetrics: emp.feedbackMetrics
    }));
    
    console.log('[EvaluationMetrics API] Top performers:');
    topPerformers.forEach((emp, index) => {
      console.log(`[EvaluationMetrics API] ${index + 1}. ${emp.name} - Rating: ${emp.feedbackMetrics?.received?.averageRating}`);
    });
    
    console.log('[EvaluationMetrics API] Bottom performers:');
    bottomPerformers.forEach((emp, index) => {
      console.log(`[EvaluationMetrics API] ${index + 1}. ${emp.name} - Rating: ${emp.feedbackMetrics?.received?.averageRating}`);
    });
    
    const response = {
      topPerformers,
      bottomPerformers,
      totalEmployeesWithFeedback: employees.length
    };
    
    console.log('[EvaluationMetrics API] Successfully prepared response');
    console.log('[EvaluationMetrics API] Response summary:', {
      topPerformersCount: topPerformers.length,
      bottomPerformersCount: bottomPerformers.length,
      totalEmployeesWithFeedback: employees.length
    });
    
    return NextResponse.json(response);
    
  } catch (error: any) {
    console.error('[EvaluationMetrics API] Error fetching top/bottom performers:', error);
    console.error('[EvaluationMetrics API] Error stack:', error.stack);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch performance data',
        details: error.message 
      },
      { status: 500 }
    );
  } finally {
    await client.close();
    console.log('[EvaluationMetrics API] MongoDB connection closed');
  }
}
