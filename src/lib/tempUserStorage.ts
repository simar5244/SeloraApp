/**
 * Temporary storage for unverified user data during signup process
 * Users are only saved to MongoDB after successful MFA verification
 */

export interface TempUserData {
  username: string;
  email: string;
  password: string; // Will be hashed
  firstName: string;
  lastName: string;
  company: string;
  companyCode: string;
  role: string;
  status: string;
  emailVerificationToken: string;
  createdAt: Date;
  expiresAt: Date; // Temp data expires after 1 hour
}

// In-memory storage for temporary user data
// In production, this should be replaced with Redis or similar
const tempUserStorage = new Map<string, TempUserData>();

// Cleanup expired entries every 10 minutes
setInterval(() => {
  const now = new Date();
  for (const [sessionId, userData] of tempUserStorage.entries()) {
    if (userData.expiresAt < now) {
      tempUserStorage.delete(sessionId);
      console.log(`[TEMP-STORAGE] Cleaned up expired temp user data for session: ${sessionId}`);
    }
  }
}, 10 * 60 * 1000); // 10 minutes

/**
 * Store temporary user data during signup process
 * @param sessionId MFA session ID to link with user data
 * @param userData User data to store temporarily
 */
export const storeTempUserData = (sessionId: string, userData: TempUserData): void => {
  tempUserStorage.set(sessionId, userData);
  console.log(`[TEMP-STORAGE] Stored temp user data for session: ${sessionId}, email: ${userData.email}`);
};

/**
 * Retrieve temporary user data by session ID
 * @param sessionId MFA session ID
 * @returns User data if found and not expired, null otherwise
 */
export const getTempUserData = (sessionId: string): TempUserData | null => {
  console.log(`[TEMP-STORAGE] 🔍 Looking for temp user data with session: ${sessionId}`);
  console.log(`[TEMP-STORAGE] 📋 Available sessions (${tempUserStorage.size}): ${Array.from(tempUserStorage.keys()).join(', ')}`);

  // List all sessions with details
  tempUserStorage.forEach((data, id) => {
    console.log(`[TEMP-STORAGE] 📝 Session ${id}: ${data.email}, expires: ${data.expiresAt.toISOString()}`);
  });

  const userData = tempUserStorage.get(sessionId);

  if (!userData) {
    console.log(`[TEMP-STORAGE] ❌ No temp user data found for session: ${sessionId}`);
    console.log(`[TEMP-STORAGE] 🚨 THIS IS THE PROBLEM! Temp data is missing for signup MFA!`);
    return null;
  }
  
  // Check if expired
  if (userData.expiresAt < new Date()) {
    tempUserStorage.delete(sessionId);
    console.log(`[TEMP-STORAGE] Temp user data expired for session: ${sessionId}`);
    return null;
  }
  
  console.log(`[TEMP-STORAGE] Retrieved temp user data for session: ${sessionId}, email: ${userData.email}`);
  return userData;
};

/**
 * Remove temporary user data after successful verification
 * @param sessionId MFA session ID
 */
export const removeTempUserData = (sessionId: string): void => {
  const removed = tempUserStorage.delete(sessionId);
  if (removed) {
    console.log(`[TEMP-STORAGE] Removed temp user data for session: ${sessionId}`);
  }
};

/**
 * Get count of stored temporary user data (for debugging)
 */
export const getTempUserDataCount = (): number => {
  return tempUserStorage.size;
};

/**
 * List all active temporary user sessions (for debugging)
 */
export const listTempUserSessions = (): void => {
  console.log(`[TEMP-STORAGE] Active temp user sessions: ${tempUserStorage.size}`);
  for (const [sessionId, userData] of tempUserStorage.entries()) {
    console.log(`  - Session: ${sessionId}, Email: ${userData.email}, Expires: ${userData.expiresAt.toISOString()}`);
  }
};
