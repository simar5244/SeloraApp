import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/auth';
import { MongoClient } from 'mongodb';

const MONGODB_URI = process.env.MONGODB_URI!;

// GET /api/users/search?term=...
export async function GET(request: NextRequest) {
  try {
    console.log('[Users Search API] Starting employee search request...');

    // Authenticate and enforce multi-tenancy
    const authResult = await authMiddleware(request);
    if (authResult) {
      console.log('[Users Search API] Authentication failed:', authResult);
      return authResult;
    }

    const user = (request as any).user;
    if (!user?.companyCode) {
      console.error('[Users Search API] No company code found in user context');
      return NextResponse.json({ error: 'Company not found' }, { status: 403 });
    }

    console.log('[Users Search API] Authenticated user:', user.email, 'Company:', user.companyCode);

    // Get search term from query parameters
    const searchParams = request.nextUrl.searchParams;
    const term = searchParams.get('term');

    if (!term || term.length < 2) {
      return NextResponse.json(
        { error: 'Search term must be at least 2 characters' },
        { status: 400 }
      );
    }

    console.log('[Users Search API] Search term:', term);

    const client = new MongoClient(MONGODB_URI);
    await client.connect();

    try {
      // Use company-specific database
      const dbName = `company_${user.companyCode}`;
      const db = client.db(dbName);
      const usersCollection = db.collection('users');

      console.log('[Users Search API] Searching in database:', dbName);

      // Search for users by email, firstName, lastName, or name
      const searchRegex = new RegExp(term, 'i');
      const users = await usersCollection.find({
        $or: [
          { email: searchRegex },
          { firstName: searchRegex },
          { lastName: searchRegex },
          { name: searchRegex },
          { username: searchRegex }
        ]
      })
        .project({
          _id: 1,
          email: 1,
          firstName: 1,
          lastName: 1,
          name: 1,
          role: 1,
          department: 1,
          jobTitle: 1
        })
        .limit(10)
        .toArray();

      console.log('[Users Search API] Found users:', users.length);

      // Format users for consistent response
      const formattedUsers = users.map(user => ({
        _id: user._id,
        email: user.email,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email.split('@')[0],
        role: user.role || '',
        department: user.department || '',
        jobTitle: user.jobTitle || ''
      }));

      return NextResponse.json(formattedUsers);

    } finally {
      await client.close();
    }

  } catch (error) {
    console.error('[Users Search API] Error searching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}