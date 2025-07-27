import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import connectDB from '@/lib/dbConnect';
import User, { getUserModel } from '@/models/User';
import { MongoClient } from 'mongodb';
import mongoose from 'mongoose';

// Helper function to extract token from Authorization header
const extractToken = (request: NextRequest): string | null => {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.split(' ')[1];
};

// Helper function to check if user has management permissions
const hasManagementPermissions = (userRole: string): boolean => {
  return ['admin', 'top_management_tier_1', 'top_management_tier_2', 'top_management_tier_3'].includes(userRole);
};

// GET /api/department-management/users/[userId]/details - Get user feedback and successors
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { userId } = params;
    
    // Extract and verify token
    const token = extractToken(request) || request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - No token provided' },
        { status: 401 }
      );
    }
    
    const payload = await verifyAuth(token);
    if (!payload || !payload.id) {
      return NextResponse.json(
        { error: 'Unauthorized - Invalid token' },
        { status: 401 }
      );
    }
    
    // Check if user has management permissions
    if (!hasManagementPermissions(payload.role)) {
      return NextResponse.json(
        { error: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      );
    }
    
    // Get company code from payload
    const companyCode = payload.companyCode?.toLowerCase();
    
    // Connect to database
    await connectDB();
    
    // Choose the appropriate user model based on company code
    const UserModel = companyCode ? getUserModel(companyCode) : User;
    
    // Find the user
    let user: any = null;
    
    // Try to find by valid ObjectId
    if (mongoose.Types.ObjectId.isValid(userId)) {
      user = await UserModel.findById(userId)
        .select('email firstName lastName jobTitle feedbackMetrics skillsFeedback')
        .lean();
    }
    
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Get additional data from MongoDB collections
    try {
      const uri = process.env.MONGODB_URI || '';
      const client = new MongoClient(uri);
      await client.connect();
      
      const dbToUse = companyCode ? `company_${companyCode}` : 'org_sim_db';
      const db = client.db(dbToUse);
      
      // Get feedback data
      let feedbackData = null;
      let successorData = null;
      
      // Try to get feedback from feedback collection
      try {
        const feedbackCollection = db.collection('feedback');
        const receivedFeedback = await feedbackCollection.find({
          evaluatedEmail: user.email
        }).toArray();
        
        // Calculate feedback metrics
        if (receivedFeedback.length > 0) {
          const ratings = receivedFeedback.map(f => {
            const avgRating = (
              (ratingToNumber(f.ratings?.accountability) +
               ratingToNumber(f.ratings?.teamContribution) +
               ratingToNumber(f.ratings?.adaptability) +
               ratingToNumber(f.ratings?.communication) +
               ratingToNumber(f.ratings?.confidence)) / 5
            );
            return avgRating;
          });
          
          const averageRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
          
          feedbackData = {
            totalFeedbacks: receivedFeedback.length,
            averageRating: averageRating,
            recentFeedback: receivedFeedback.slice(-5).map(f => ({
              evaluatorEmail: f.evaluatorEmail,
              quarter: f.quarter,
              relationshipType: f.relationshipType,
              ratings: f.ratings,
              topSkills: f.topSkills,
              createdAt: f.createdAt
            }))
          };
        }
      } catch (feedbackError) {
        console.error('Error fetching feedback data:', feedbackError);
      }
      
      // Try to get successor data from succession analysis
      try {
        const mergedData = await db.collection('merged_output').findOne({ email: user.email });
        if (mergedData?.successors) {
          successorData = {
            successors: mergedData.successors.map((s: any) => ({
              id: s.id,
              name: s.name,
              email: s.email,
              jobTitle: s.jobTitle,
              score: s.score,
              isViable: s.isViable,
              explanation: s.explanation,
              viableExplanation: s.viableExplanation,
              strengths: s.strengths || [],
              developmentAreas: s.developmentAreas || []
            }))
          };
        }
      } catch (successorError) {
        console.error('Error fetching successor data:', successorError);
      }
      
      await client.close();
      
      // Prepare response
      const response = {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          jobTitle: user.jobTitle
        },
        feedback: feedbackData || {
          totalFeedbacks: user.feedbackMetrics?.received?.count || 0,
          averageRating: user.feedbackMetrics?.received?.averageRating || 0,
          recentFeedback: []
        },
        successors: successorData || { successors: [] },
        skillsFeedback: user.skillsFeedback || { given: [], received: [] }
      };
      
      return NextResponse.json(response);
      
    } catch (error) {
      console.error('Error fetching additional user data:', error);
      
      // Return basic data if enhanced data fetch fails
      return NextResponse.json({
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          jobTitle: user.jobTitle
        },
        feedback: {
          totalFeedbacks: user.feedbackMetrics?.received?.count || 0,
          averageRating: user.feedbackMetrics?.received?.averageRating || 0,
          recentFeedback: []
        },
        successors: { successors: [] },
        skillsFeedback: user.skillsFeedback || { given: [], received: [] }
      });
    }
    
  } catch (error) {
    console.error('Error fetching user details:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to convert rating text to number
function ratingToNumber(rating: string): number {
  switch (rating?.toLowerCase()) {
    case 'outstanding': return 5;
    case 'excellent': return 4;
    case 'very good': return 3;
    case 'good': return 2;
    case 'average': return 1;
    default: return 1;
  }
}