import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/auth';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI!;

/**
 * GET /api/evaluation-metrics/search
 * Search for a specific employee by name or email
 */
export async function GET(req: NextRequest) {
  console.log('[EvaluationMetrics Search API] Starting employee search request...');
  
  // Authenticate and enforce multi-tenancy
  const authResult = await authMiddleware(req);
  if (authResult) {
    console.log('[EvaluationMetrics Search API] Authentication failed:', authResult);
    return authResult;
  }
  
  const user = (req as any).user;
  if (!user?.companyCode) {
    console.error('[EvaluationMetrics Search API] No company code found in user context');
    return NextResponse.json({ error: 'Company not found' }, { status: 403 });
  }

  // Check if user has permission to access evaluation metrics
  const allowedRoles = ['admin', 'superadmin', 'top_management_tier_1', 'top_management_tier_2', 'top_management_tier_3'];
  if (!allowedRoles.includes(user.role)) {
    console.error('[EvaluationMetrics Search API] Access denied for role:', user.role);
    return NextResponse.json({
      error: 'Access denied',
      message: 'This feature is only available to admin and top management users',
      userRole: user.role
    }, { status: 403 });
  }
  
  // Get search query from URL parameters
  const searchParams = req.nextUrl.searchParams;
  const query = searchParams.get('query');
  
  if (!query) {
    console.error('[EvaluationMetrics Search API] No search query provided');
    return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
  }
  
  console.log('[EvaluationMetrics Search API] Authenticated user:', user.email, 'Company:', user.companyCode);
  console.log('[EvaluationMetrics Search API] Search query:', query);
  
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    console.log('[EvaluationMetrics Search API] Connected to MongoDB');
    
    // Use company-specific database
    const dbName = `company_${user.companyCode.toLowerCase()}`;
    const db = client.db(dbName);
    const usersCollection = db.collection('users');
    
    console.log('[EvaluationMetrics Search API] Using database:', dbName);
    
    // Build search criteria - search by name (firstName + lastName) or email
    const searchRegex = new RegExp(query, 'i'); // Case-insensitive search
    
    const searchCriteria = {
      $or: [
        { email: searchRegex },
        { username: searchRegex },
        { firstName: searchRegex },
        { lastName: searchRegex },
        {
          $expr: {
            $regexMatch: {
              input: { $concat: ['$firstName', ' ', '$lastName'] },
              regex: query,
              options: 'i'
            }
          }
        }
      ]
    };
    
    console.log('[EvaluationMetrics Search API] Search criteria:', JSON.stringify(searchCriteria, null, 2));
    
    // Find matching employees
    const employees = await usersCollection.find(searchCriteria).toArray();
    
    console.log('[EvaluationMetrics Search API] Found', employees.length, 'matching employees');
    
    if (employees.length === 0) {
      console.log('[EvaluationMetrics Search API] No employees found matching query:', query);
      return NextResponse.json({ error: 'No employee found' }, { status: 404 });
    }
    
    // If multiple employees found, try to find the best match
    let selectedEmployee = employees[0];
    
    if (employees.length > 1) {
      console.log('[EvaluationMetrics Search API] Multiple employees found, selecting best match...');
      
      // Prioritize exact email match
      const exactEmailMatch = employees.find(emp => 
        emp.email && emp.email.toLowerCase() === query.toLowerCase()
      );
      
      if (exactEmailMatch) {
        selectedEmployee = exactEmailMatch;
        console.log('[EvaluationMetrics Search API] Selected exact email match:', selectedEmployee.email);
      } else {
        // Prioritize exact name match
        const exactNameMatch = employees.find(emp => {
          const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim();
          return fullName.toLowerCase() === query.toLowerCase();
        });
        
        if (exactNameMatch) {
          selectedEmployee = exactNameMatch;
          console.log('[EvaluationMetrics Search API] Selected exact name match:', selectedEmployee.firstName, selectedEmployee.lastName);
        } else {
          console.log('[EvaluationMetrics Search API] Using first match:', selectedEmployee.email);
        }
      }
    }
    
    // Format the employee data
    const displayName = selectedEmployee.firstName && selectedEmployee.lastName 
      ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}`
      : selectedEmployee.username || 'Unknown';
    
    const formattedEmployee = {
      id: selectedEmployee._id.toString(),
      name: displayName,
      email: selectedEmployee.email,
      jobTitle: selectedEmployee.jobTitle || 'Not specified',
      department: selectedEmployee.department || 'Not specified',
      feedbackMetrics: selectedEmployee.feedbackMetrics || {
        received: {
          count: 0,
          averageRating: 0,
          weightedAverageRating: 0
        }
      }
    };
    
    console.log('[EvaluationMetrics Search API] Formatted employee data:');
    console.log('[EvaluationMetrics Search API] Name:', formattedEmployee.name);
    console.log('[EvaluationMetrics Search API] Email:', formattedEmployee.email);
    console.log('[EvaluationMetrics Search API] Job Title:', formattedEmployee.jobTitle);
    console.log('[EvaluationMetrics Search API] Department:', formattedEmployee.department);
    console.log('[EvaluationMetrics Search API] Feedback Count:', formattedEmployee.feedbackMetrics?.received?.count || 0);
    console.log('[EvaluationMetrics Search API] Average Rating:', formattedEmployee.feedbackMetrics?.received?.averageRating || 0);
    
    console.log('[EvaluationMetrics Search API] Successfully found and formatted employee');
    
    return NextResponse.json(formattedEmployee);
    
  } catch (error: any) {
    console.error('[EvaluationMetrics Search API] Error searching for employee:', error);
    console.error('[EvaluationMetrics Search API] Error stack:', error.stack);
    
    return NextResponse.json(
      { 
        error: 'Failed to search for employee',
        details: error.message 
      },
      { status: 500 }
    );
  } finally {
    await client.close();
    console.log('[EvaluationMetrics Search API] MongoDB connection closed');
  }
}
