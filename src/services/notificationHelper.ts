import { MongoClient, ObjectId } from 'mongodb';
import { sendNotificationEmail } from './emailService';

// MongoDB connection
const uri = process.env.MONGODB_URI || '';
const notificationsCollection = 'notifications';

export interface NotificationData {
  userId: string;
  type: 'project_member' | 'profile_approved' | 'feedback_received' | 'user_limit_warning' | 'admin_new_content';
  title: string;
  message: string;
  link?: string;
  entityId?: string;
  entityType?: string;
}

export interface UserData {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  username?: string;
}

/**
 * Send notification to a user (both in-app and email)
 */
export async function sendNotification(
  companyCode: string,
  userData: UserData,
  notificationData: NotificationData
): Promise<boolean> {
  try {
    // Save notification to database
    const client = new MongoClient(uri);
    await client.connect();
    
    const db = client.db(`company_${companyCode}`);
    const collection = db.collection(notificationsCollection);
    
    const notification = {
      userId: new ObjectId(notificationData.userId),
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      link: notificationData.link,
      entityId: notificationData.entityId,
      entityType: notificationData.entityType,
      isRead: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await collection.insertOne(notification);
    await client.close();
    
    // Send email notification
    const userName = userData.firstName || userData.username || 'User';
    await sendNotificationEmail(
      userData.email,
      notificationData.title,
      notificationData.message
    );
    
    console.log(`[NOTIFICATION] Sent to ${userData.email}: ${notificationData.title}`);
    return true;
  } catch (error) {
    console.error('[NOTIFICATION] Failed to send notification:', error);
    return false;
  }
}

/**
 * Send notification when user is added as project/goal member
 */
export async function notifyProjectMemberAdded(
  companyCode: string,
  userData: UserData,
  projectName: string,
  projectId: string,
  type: 'project' | 'goal' = 'project'
): Promise<boolean> {
  return sendNotification(companyCode, userData, {
    userId: userData._id,
    type: 'project_member',
    title: `Added to ${type}`,
    message: `You have been added as a member to ${type}: ${projectName}`,
    link: `/${type}s/${projectId}`,
    entityId: projectId,
    entityType: type
  });
}

/**
 * Send notification when user is added as project/goal viewer
 */
export async function notifyProjectViewerAdded(
  companyCode: string,
  userData: UserData,
  projectName: string,
  projectId: string,
  type: 'project' | 'goal' = 'project'
): Promise<boolean> {
  return sendNotification(companyCode, userData, {
    userId: userData._id,
    type: 'project_member',
    title: `Added as viewer to ${type}`,
    message: `You have been added as a viewer to ${type}: ${projectName}`,
    link: `/${type}s/${projectId}`,
    entityId: projectId,
    entityType: type
  });
}

/**
 * Send notification when profile is approved/rejected
 */
export async function notifyProfileApproval(
  companyCode: string,
  userData: UserData,
  approved: boolean,
  approverName: string
): Promise<boolean> {
  return sendNotification(companyCode, userData, {
    userId: userData._id,
    type: 'profile_approved',
    title: approved ? 'Profile Approved' : 'Profile Changes Requested',
    message: approved 
      ? `Your profile has been approved by ${approverName}`
      : `${approverName} has requested changes to your profile`,
    link: '/dashboard/profile'
  });
}

/**
 * Send notification when user receives feedback
 */
export async function notifyFeedbackReceived(
  companyCode: string,
  userData: UserData,
  feedbackGiver: string
): Promise<boolean> {
  return sendNotification(companyCode, userData, {
    userId: userData._id,
    type: 'feedback_received',
    title: 'New Feedback Received',
    message: `You have received new feedback from ${feedbackGiver}`,
    link: '/dashboard/feedback'
  });
}

/**
 * Send notification to admin when approaching user limit
 */
export async function notifyUserLimitWarning(
  companyCode: string,
  adminData: UserData,
  currentUsers: number,
  maxUsers: number
): Promise<boolean> {
  const percentage = Math.round((currentUsers / maxUsers) * 100);
  
  return sendNotification(companyCode, adminData, {
    userId: adminData._id,
    type: 'user_limit_warning',
    title: 'User Limit Warning',
    message: `You are at ${percentage}% of your user limit (${currentUsers}/${maxUsers}). Consider upgrading your plan.`,
    link: '/dashboard/billing'
  });
}

/**
 * Send notification to admin when new content is created
 */
export async function notifyAdminNewContent(
  companyCode: string,
  adminData: UserData,
  contentType: 'goal' | 'project',
  contentName: string,
  creatorName: string,
  contentId: string
): Promise<boolean> {
  return sendNotification(companyCode, adminData, {
    userId: adminData._id,
    type: 'admin_new_content',
    title: `New ${contentType} created`,
    message: `${creatorName} created a new ${contentType}: ${contentName}`,
    link: `/${contentType}s/${contentId}`,
    entityId: contentId,
    entityType: contentType
  });
}
