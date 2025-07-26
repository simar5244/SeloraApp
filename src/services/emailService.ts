import nodemailer from 'nodemailer';

// Configuration for email service using environment variables
const getEmailConfig = () => {
  console.log('[EMAIL] Getting email configuration');
  
  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '587');
  
  // For port 465, secure should always be true
  const secure = port === 465 || 
                process.env.SMTP_SECURE === 'true' || 
                process.env.EMAIL_SECURE === 'true';
  
  const config = {
    host,
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER || process.env.EMAIL_USER || '',
      pass: process.env.SMTP_PASS || process.env.EMAIL_PASS || ''
    }
  };
  
  // Log config but hide password
  console.log('[EMAIL] Configuration:', {
    ...config,
    auth: {
      user: config.auth.user,
      pass: config.auth.pass ? '********' : 'not set'
    }
  });
  
  return config;
};

// Create a fallback transporter that logs but doesn't send actual emails
const createFallbackTransporter = () => {
  return {
    sendMail: async (mailOptions: any) => {
      console.log('[EMAIL] Email sending attempted (log only):', mailOptions);
      return { 
        messageId: `log_${Date.now()}`,
        response: 'Email logged successfully (not sent)'
      };
    }
  };
};

// Get the appropriate transporter
const getTransporter = () => {
  // Check if we have credentials
  if (!process.env.SMTP_USER && !process.env.EMAIL_USER) {
    console.log('[EMAIL] No email credentials found, using fallback logger');
    return createFallbackTransporter();
  }
  
  try {
    // Use nodemailer transporter with configuration
    console.log('[EMAIL] Creating email transporter');
    const transporter = nodemailer.createTransport(getEmailConfig());
    
    // Verify connection configuration
    transporter.verify(function(error, success) {
      if (error) {
        console.error('[EMAIL] SMTP connection error:', error);
      } else {
        console.log('[EMAIL] SMTP connection successful, server is ready to send emails');
      }
    });
    
    return transporter;
  } catch (error) {
    console.error('[EMAIL] Failed to create email transporter:', error);
    console.log('[EMAIL] Using fallback logger');
    return createFallbackTransporter();
  }
};

// Send a welcome email to a new user
export const sendWelcomeEmail = async (to: string, username: string): Promise<boolean> => {
  try {
    console.log(`[EMAIL] Sending welcome email to ${to}`);
    const transporter = getTransporter();
    
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"Selora" <${process.env.SMTP_USER || process.env.EMAIL_USER || 'noreply@selora.com'}>`,
      to,
      subject: 'Welcome to Selora',
      html: `
        <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
          <!-- Header with brand color -->
          <div style="background-color: #6A0DAD; padding: 30px 20px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 28px; font-weight: 600;">Welcome to Selora, ${username}!</h1>
          </div>
          
          <!-- Email content -->
          <div style="padding: 30px; background-color: #ffffff;">
            <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 20px;">
              Thank you for joining Selora! We're thrilled to have you as part of our community.
            </p>
            
            <div style="background-color: #f9f5ff; border-left: 4px solid #6A0DAD; padding: 15px; margin: 20px 0; border-radius: 0 4px 4px 0;">
              <p style="margin: 0; color: #4a1d96; font-size: 15px; font-weight: 500;">
                You can now log in to your account and start exploring all the features we have to offer.
              </p>
            </div>
            
            <p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin: 25px 0;">
              Get started by completing your profile and setting up your preferences to make the most of your experience.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://app.selora.com'}" 
                 style="display: inline-block; background-color: #6A0DAD; color: white; 
                        padding: 12px 28px; text-decoration: none; border-radius: 6px; 
                        font-weight: 600; font-size: 15px; transition: background-color 0.3s ease;">
                Go to Dashboard
              </a>
            </div>
            
            <p style="font-size: 14px; line-height: 1.6; color: #6b7280; margin-bottom: 5px;">
              If you have any questions or need assistance, our support team is here to help. Just hit reply.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; font-size: 14px; color: #6b7280;">
              &copy; 2025 Selora. All rights reserved.
            </p>
          </div>
        </div>
      `
    });
    
    console.log(`[EMAIL] Welcome email sent successfully to ${to}`);
    return true;
  } catch (error) {
    console.error('[EMAIL] Failed to send welcome email:', error);
    return false;
  }
};

// Interface for invitation email data
interface InvitationEmailData {
  fullName: string;
  organizationName: string;
}

// Send an invitation email to an employee
export const sendInvitationEmail = async (
  to: string, 
  token: string, 
  data: InvitationEmailData
): Promise<boolean> => {
  try {
    console.log(`[EMAIL] Sending invitation email to ${to}`);
    const transporter = getTransporter();
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/invite?token=${token}`;
    
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"Selora" <${process.env.SMTP_USER || process.env.EMAIL_USER || 'noreply@selora.com'}>`,
      to,
      subject: `Invitation to join ${data.organizationName} on Selora`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Hello ${data.fullName},</h2>
          <p>You have been invited to join <strong>${data.organizationName}</strong> on Selora.</p>
          <p>Please click the button below to accept the invitation and create your account:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteLink}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-align: center; text-decoration: none; display: inline-block; border-radius: 4px; font-weight: bold;">
              Accept Invitation
            </a>
          </div>
          <p>This invitation link will expire in 7 days.</p>
          <p>If you believe this invitation was sent to you by mistake, please disregard this email.</p>
          <p>The Selora Team</p>
        </div>
      `
    });
    
    console.log(`[EMAIL] Invitation email sent successfully to ${to}`);
    return true;
  } catch (error) {
    console.error('[EMAIL] Failed to send invitation email:', error);
    return false;
  }
};

// Send a password reset email
export const sendPasswordResetEmail = async (to: string, token: string, companyCode: string): Promise<boolean> => {
  try {
    console.log(`[EMAIL] Sending password reset email to ${to}`);
    const transporter = getTransporter();
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${token}&email=${encodeURIComponent(to)}&companyCode=${companyCode}`;
    
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"Selora" <${process.env.SMTP_USER || process.env.EMAIL_USER || 'noreply@selora.com'}>`,
      to,
      subject: 'Reset Your Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 8px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #333;">Password Reset</h1>
          </div>
          <p style="font-size: 16px; color: #555;">We received a request to reset your password for your Selora account.</p>
          <p style="font-size: 16px; color: #555;">Please click the button below to create a new password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background-color: #6A0DAD; color: white; padding: 14px 28px; text-align: center; text-decoration: none; display: inline-block; border-radius: 6px; font-weight: bold; font-size: 16px;">
              Reset Password
            </a>
          </div>
          <p style="font-size: 14px; color: #777;">This link will expire in 10 minutes.</p>
          <p style="font-size: 14px; color: #777;">If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #888;">
            <p>The Selora Team</p>
          </div>
        </div>
      `
    });
    
    console.log(`[EMAIL] Password reset email sent successfully to ${to}`);
    return true;
  } catch (error) {
    console.error('[EMAIL] Failed to send password reset email:', error);
    return false;
  }
};

// Send a password reset OTP email
export const sendPasswordResetOTPEmail = async (to: string, otp: string, username: string): Promise<boolean> => {
  try {
    console.log(`[EMAIL] Sending password reset OTP email to ${to} with code ${otp}`);
    const transporter = getTransporter();
    
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"Selora" <${process.env.SMTP_USER || process.env.EMAIL_USER || 'noreply@selora.com'}>`,
      to,
      subject: 'Your Password Reset Code',
      html: `
        <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
          <!-- Header with brand color -->
          <div style="background-color: #6A0DAD; padding: 30px 20px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 600;">Password Reset Request</h1>
          </div>
          
          <!-- Email content -->
          <div style="padding: 30px; background-color: #ffffff;">
            <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 20px;">
              Hello ${username},<br>
              We received a request to reset your password. Please use the verification code below to proceed:
            </p>
            
            <!-- OTP Code Box -->
            <div style="text-align: center; margin: 30px 0;">
              <div style="background-color: #f9f5ff; border: 1px solid #e9d8fd; border-radius: 8px; 
                          display: inline-block; padding: 20px 30px; margin: 15px 0;">
                <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; 
                            color: #6A0DAD; font-family: monospace; padding: 10px 15px;">
                  ${otp}
                </div>
              </div>
            </div>
            
            <p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin: 20px 0 10px;">
              This verification code will expire in <strong>1 hour</strong>.
            </p>
            
            <div style="background-color: #fef2f2; border-left: 4px solid #f87171; 
                        padding: 12px 15px; margin: 25px 0; border-radius: 0 4px 4px 0;">
              <p style="margin: 0; color: #b91c1c; font-size: 14px; font-weight: 500;">
                ⚠️ If you didn't request this, you can safely ignore this email.
              </p>
            </div>
            
            <p style="font-size: 14px; line-height: 1.6; color: #6b7280; margin: 30px 0 10px;">
              Having trouble? email us back. Just hit reply.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; font-size: 14px; color: #6b7280;">
              &copy; 2025 Selora. All rights reserved.
            </p>
            <p style="margin: 10px 0 0; font-size: 13px; color: #9ca3af;">
              This is an automated message.
            </p>
          </div>
        </div>
      `
    });
    
    console.log(`[EMAIL] Password reset OTP email sent successfully to ${to}`);
    return true;
  } catch (error) {
    console.error('[EMAIL] Failed to send password reset OTP email:', error);
    return false;
  }
};

// Send a notification email
export const sendNotificationEmail = async (
  to: string, 
  subject: string, 
  message: string
): Promise<boolean> => {
  try {
    console.log(`[EMAIL] Sending notification email to ${to}`);
    const transporter = getTransporter();
    
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"selora" <${process.env.SMTP_USER || process.env.EMAIL_USER || 'noreply@selora.com'}>`,
      to,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>${subject}</h2>
          <p>${message}</p>
          <p>Best regards,<br>The Selora Team</p>
        </div>
      `
    });
    
    console.log(`[EMAIL] Notification email sent successfully to ${to}`);
    return true;
  } catch (error) {
    console.error('[EMAIL] Failed to send notification email:', error);
    return false;
  }
};

// Send an OTP verification email
export const sendOTPVerificationEmail = async (
  to: string, 
  otp: string,
  username: string
): Promise<boolean> => {
  try {
    console.log(`[EMAIL] Sending OTP verification email to ${to} with code ${otp}`);
    const transporter = getTransporter();
    
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"Selora" <${process.env.SMTP_USER || process.env.EMAIL_USER || 'noreply@selora.com'}>`,
      to,
      subject: 'Your Account Verification Code',
      html: `
        <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);">
          <!-- Header with brand color -->
          <div style="background-color: #6A0DAD; padding: 30px 20px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 600;">Verify Your Email Address</h1>
          </div>
          
          <!-- Email content -->
          <div style="padding: 30px; background-color: #ffffff;">
            <p style="font-size: 16px; line-height: 1.6; color: #333; margin-bottom: 20px;">
              Hello ${username},<br>
              Thank you for signing up with Selora! To complete your registration and verify your email address, 
              please enter the following verification code in the app:
            </p>
            
            <!-- OTP Code Box -->
            <div style="text-align: center; margin: 30px 0;">
              <div style="background-color: #f9f5ff; border: 1px solid #e9d8fd; border-radius: 8px; 
                          display: inline-block; padding: 20px 30px; margin: 15px 0;">
                <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; 
                            color: #6A0DAD; font-family: monospace; padding: 10px 15px;">
                  ${otp}
                </div>
              </div>
            </div>
            
            <p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin: 20px 0 10px;">
              This verification code will expire in <strong>10 minutes</strong>.
            </p>
            
            
            
            <p style="font-size: 14px; line-height: 1.6; color: #6b7280; margin: 30px 0 10px;">
              Having trouble? Email us back. Just hit reply.
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; font-size: 14px; color: #6b7280;">
              &copy; 2025 Selora. All rights reserved.
            </p>
            <p style="margin: 10px 0 0; font-size: 13px; color: #9ca3af;">
              This is an automated message.
            </p>
          </div>
        </div>
      `
    });
    
    console.log(`[EMAIL] OTP verification email sent successfully to ${to}`);
    return true;
  } catch (error) {
    console.error('[EMAIL] Failed to send OTP verification email:', error);
    return false;
  }
}; 