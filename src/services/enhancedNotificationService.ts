import { MongoClient, ObjectId } from 'mongodb';
import { sendNotificationEmail } from '@/services/emailService';

// MongoDB connection
const uri = process.env.MONGODB_URI || '';
const defaultDbName = 'org_sim_db';
const notificationsCollection = 'notifications';
const usersCollection = 'users';

export interface NotificationData {
  type: 'project_member' | 'profile_approved' | 'feedback_received' | 'user_limit_warning' | 'admin_new_content';
  title: string;
  message: string;
  link?: string;
  entityId?: string;
  entityType?: string;
}

export class EnhancedNotificationService {
  // Create and send notification (both UI and email)
  static async createAndSendNotification(
    userId: string | ObjectId,
    notificationData: NotificationData,
    companyCode: string,
    recipientEmail?: string
  ) {
    const client = new MongoClient(uri);
    
    try {
      await client.connect();
      
      // Create notification in company database
      const db = client.db(`company_${companyCode}`);
      const collection = db.collection(notificationsCollection);
      
      const notification = {
        userId: typeof userId === 'string' ? new ObjectId(userId) : userId,
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
      
      const result = await collection.insertOne(notification);

      // Send email notification
      if (recipientEmail) {
        await this.sendEmailNotification(recipientEmail, notificationData);
      } else {
        // Get user email if not provided
        const defaultDb = client.db(defaultDbName);
        const usersCol = defaultDb.collection(usersCollection);
        const user = await usersCol.findOne({ _id: typeof userId === 'string' ? new ObjectId(userId) : userId });
        if (user?.email) {
          await this.sendEmailNotification(user.email, notificationData);
        }
      }

      await client.close();
      return { ...notification, _id: result.insertedId };
    } catch (error) {
      console.error('Error creating and sending notification:', error);
      await client.close();
      throw error;
    }
  }

  // Send email notification with proper templates
  private static async sendEmailNotification(email: string, data: NotificationData) {
    try {
      const emailSubject = this.getEmailSubject(data.type, data.title);
      const emailHtml = this.getEmailHTML(data);

      await sendNotificationEmail(email, emailSubject, emailHtml);
    } catch (error) {
      console.error('Error sending email notification:', error);
      // Don't throw - notification should still be created even if email fails
    }
  }

  private static getEmailSubject(type: string, title: string): string {
    switch (type) {
      case 'project_member':
        return `🎯 ${title} - Selora`;
      case 'profile_approved':
        return `✅ ${title} - Selora`;
      case 'feedback_received':
        return `💬 ${title} - Selora`;
      case 'user_limit_warning':
        return `⚠️ ${title} - Selora`;
      case 'admin_new_content':
        return `📋 ${title} - Selora`;
      default:
        return `🔔 ${title} - Selora`;
    }
  }

  private static getEmailHTML(data: NotificationData): string {
    const baseURL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.selora.com';
    
    return `
      <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
        <!-- Header with brand color -->
        <div style="background-color: #6A0DAD; padding: 30px 20px; text-align: center; color: white;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 600;">${this.getEmailIcon(data.type)} ${data.title}</h1>
        </div>
        
        <!-- Email content -->
        <div style="padding: 30px; background-color: #ffffff;">
          <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 20px;">
            ${data.message}
          </p>
          
          ${data.link ? `
            <div style="text-align: center; margin: 30px 0;">
              <a href="${baseURL}${data.link}" 
                 style="display: inline-block; background-color: #6A0DAD; color: white; 
                        padding: 12px 28px; text-decoration: none; border-radius: 6px; 
                        font-weight: 600; font-size: 15px; transition: background-color 0.3s ease;">
                View Details
              </a>
            </div>
          ` : ''}
          
          <div style="background-color: #f9f5ff; border-left: 4px solid #6A0DAD; padding: 15px; margin: 20px 0; border-radius: 0 4px 4px 0;">
            <p style="margin: 0; color: #4a1d96; font-size: 14px; font-weight: 500;">
              💡 You can manage your notification preferences in your account settings.
            </p>
          </div>
          
          <p style="font-size: 14px; line-height: 1.6; color: #6b7280; margin: 30px 0 10px;">
            Need help? Just reply to this email and we'll assist you.
          </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; font-size: 14px; color: #6b7280;">
            &copy; 2025 Selora. All rights reserved.
          </p>
          <p style="margin: 10px 0 0; font-size: 13px; color: #9ca3af;">
            This is an automated notification.
          </p>
        </div>
      </div>
    `;
  }

  private static getEmailIcon(type: string): string {
    switch (type) {
      case 'project_member':
        return '👥';
      case 'profile_approved':
        return '✅';
      case 'feedback_received':
        return '💬';
      case 'user_limit_warning':
        return '⚠️';
      case 'admin_new_content':
        return '📋';
      default:
        return '🔔';
    }
  }

  // Specific notification methods for each type
  static async notifyProjectMember(
    userId: string | ObjectId,
    projectName: string,
    projectId: string,
    role: 'member' | 'viewer',
    companyCode: string,
    recipientEmail?: string
  ) {
    return this.createAndSendNotification(
      userId,
      {
        type: 'project_member',
        title: `Added to ${projectName}`,
        message: `You have been added as a ${role} to the project "${projectName}". Click to view the project details.`,
        link: `/dashboard/projects/${projectId}`,
        entityId: projectId,
        entityType: 'project'
      },
      companyCode,
      recipientEmail
    );
  }

  static async notifyGoalMember(
    userId: string | ObjectId,
    goalName: string,
    goalId: string,
    role: 'member' | 'viewer',
    companyCode: string,
    recipientEmail?: string
  ) {
    return this.createAndSendNotification(
      userId,
      {
        type: 'project_member',
        title: `Added to ${goalName}`,
        message: `You have been added as a ${role} to the goal "${goalName}". Click to view the goal details.`,
        link: `/dashboard/goals/${goalId}`,
        entityId: goalId,
        entityType: 'goal'
      },
      companyCode,
      recipientEmail
    );
  }

  static async notifyProfileApproval(
    userId: string | ObjectId,
    approved: boolean,
    approverName: string,
    companyCode: string,
    recipientEmail?: string
  ) {
    return this.createAndSendNotification(
      userId,
      {
        type: 'profile_approved',
        title: approved ? 'Profile Approved' : 'Profile Changes Requested',
        message: approved 
          ? `Your profile has been approved by ${approverName}. Your information is now visible to your team.`
          : `${approverName} has requested changes to your profile. Please review and update your information.`,
        link: '/dashboard/profile',
        entityType: 'profile'
      },
      companyCode,
      recipientEmail
    );
  }

  static async notifyFeedbackReceived(
    userId: string | ObjectId,
    giverName: string,
    rating: number,
    companyCode: string,
    recipientEmail?: string
  ) {
    return this.createAndSendNotification(
      userId,
      {
        type: 'feedback_received',
        title: 'New Feedback Received',
        message: `${giverName} has given you feedback with a ${rating}-star rating. Click to view your feedback history.`,
        link: '/dashboard/feedback',
        entityType: 'feedback'
      },
      companyCode,
      recipientEmail
    );
  }

  static async notifyUserLimitWarning(
    adminUserId: string | ObjectId,
    currentUsers: number,
    maxUsers: number,
    companyCode: string,
    recipientEmail?: string
  ) {
    const percentage = Math.round((currentUsers / maxUsers) * 100);
    return this.createAndSendNotification(
      adminUserId,
      {
        type: 'user_limit_warning',
        title: 'User Limit Warning',
        message: `You are using ${currentUsers} of ${maxUsers} allowed users (${percentage}%). Consider upgrading your plan to avoid service interruption.`,
        link: '/dashboard/billing',
        entityType: 'billing'
      },
      companyCode,
      recipientEmail
    );
  }

  static async notifyAdminNewContent(
    adminUserId: string | ObjectId,
    contentType: 'project' | 'goal',
    contentName: string,
    creatorName: string,
    contentId: string,
    companyCode: string,
    recipientEmail?: string
  ) {
    return this.createAndSendNotification(
      adminUserId,
      {
        type: 'admin_new_content',
        title: `New ${contentType.charAt(0).toUpperCase() + contentType.slice(1)} Created`,
        message: `${creatorName} has created a new ${contentType} called "${contentName}". Click to review the details.`,
        link: `/dashboard/${contentType}s/${contentId}`,
        entityId: contentId,
        entityType: contentType
      },
      companyCode,
      recipientEmail
    );
  }

  // Get all admins for notification
  static async getAdminUsers(companyCode?: string): Promise<any[]> {
    const client = new MongoClient(uri);
    
    try {
      await client.connect();
      const db = client.db(companyCode ? `company_${companyCode}` : defaultDbName);
      const collection = db.collection(usersCollection);
      
      const admins = await collection.find({ 
        role: { $in: ['admin', 'superadmin'] },
        status: 'active'
      }).toArray();
      
      await client.close();
      return admins;
    } catch (error) {
      console.error('Error fetching admin users:', error);
      await client.close();
      return [];
    }
  }

  // Get user count for billing warnings
  static async getCurrentUserCount(companyCode?: string): Promise<number> {
    const client = new MongoClient(uri);
    
    try {
      await client.connect();
      const db = client.db(companyCode ? `company_${companyCode}` : defaultDbName);
      const collection = db.collection(usersCollection);
      
      const filter: any = { status: 'active' };
      if (companyCode) {
        filter.companyCode = companyCode;
      }
      
      const count = await collection.countDocuments(filter);
      await client.close();
      return count;
    } catch (error) {
      console.error('Error getting user count:', error);
      await client.close();
      return 0;
    }
  }
}

export default EnhancedNotificationService;