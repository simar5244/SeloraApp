import { NextRequest, NextResponse } from 'next/server';
import { unstable_noStore as noStore } from 'next/cache';
import { verifyAuth } from '@/lib/auth';
import connectDB from '@/lib/dbConnect';
import { getFeedbackModel } from '@/models/Feedback';
import { extractSkillsFromFeedback } from '@/app/dashboard/org-chart/utils/extractKeywords';

export async function GET(request: NextRequest) {
  noStore();
  
  try {
    // Get email from query params
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      );
    }

    // Extract company code from auth token
    const token = request.headers.get('authorization')?.split(' ')[1];
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = await verifyAuth(token);
    if (!payload?.companyCode) {
      return NextResponse.json(
        { error: 'Company context required' },
        { status: 403 }
      );
    }

    await connectDB(payload.companyCode);
    const Feedback = getFeedbackModel(payload.companyCode);

    // Find all feedback where this user is the evaluator (given) or evaluated (received)
    const [givenFeedback, receivedFeedback] = await Promise.all([
      Feedback.find({ evaluatorEmail: email.toLowerCase() }),
      Feedback.find({ evaluatedEmail: email.toLowerCase() })
    ]);

    // Extract skills from feedback text using our keyword extractor
    const extractSkills = (feedbacks: any[]) => {
      const skills = new Set<string>();
      
      feedbacks.forEach(feedback => {
        // First check for explicitly provided topSkills
        if (feedback.topSkills) {
          const skillsList = Array.isArray(feedback.topSkills) 
            ? feedback.topSkills 
            : typeof feedback.topSkills === 'string' 
              ? feedback.topSkills.split(',').map((s: string) => s.trim())
              : [];
              
          skillsList.forEach((skill: string) => {
            if (skill) skills.add(skill);
          });
        }
        
        // Then extract skills from feedback text
        if (feedback.feedback) {
          const extractedSkills = extractSkillsFromFeedback(feedback.feedback);
          extractedSkills.forEach(skill => skills.add(skill));
        }
      });
      
      return Array.from(skills);
    };

    return NextResponse.json({
      given: extractSkills(givenFeedback),
      received: extractSkills(receivedFeedback)
    });

  } catch (error: any) {
    console.error('Error fetching skills feedback:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch skills feedback' },
      { status: 500 }
    );
  }
}
