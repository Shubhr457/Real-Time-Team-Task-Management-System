import { getTransporter } from '../core/nodemailer.config';
import { config } from '../environments';

interface EmailOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

/**
 * Base function to send emails
 */
export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    const transporter = getTransporter();
    
    const mailOptions = {
      from: `"${config.email.fromName}" <${config.email.fromEmail}>`,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', info.messageId);
    return true;
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    return false;
  }
};

/**
 * Send OTP verification email
 */
export const sendOTPEmail = async (
  email: string,
  name: string,
  otp: string
): Promise<boolean> => {
  const subject = 'Verify Your Email - OTP Code 🔐';
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .otp-box { background: white; border: 2px dashed #667eea; padding: 20px; margin: 20px 0; text-align: center; border-radius: 10px; }
          .otp-code { font-size: 36px; font-weight: bold; color: #667eea; letter-spacing: 8px; margin: 10px 0; }
          .alert { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Email Verification</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${name}</strong>,</p>
            <p>Thank you for registering with Team Task Manager! Please verify your email address to complete your registration.</p>
            <div class="otp-box">
              <p style="margin: 0; font-size: 14px; color: #666;">Your OTP Code:</p>
              <div class="otp-code">${otp}</div>
            </div>
            <div class="alert">
              <strong>⚠️ Important:</strong>
              <ul style="margin: 10px 0;">
                <li>This OTP is valid for <strong>10 minutes</strong></li>
                <li>Do not share this code with anyone</li>
                <li>If you didn't request this, please ignore this email</li>
              </ul>
            </div>
            <p>Enter this code on the verification page to activate your account.</p>
            <p><strong>The Team Task Manager Team</strong></p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Team Task Manager. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
    Email Verification
    
    Hi ${name},
    
    Thank you for registering with Team Task Manager! Please verify your email address to complete your registration.
    
    Your OTP Code: ${otp}
    
    Important:
    - This OTP is valid for 10 minutes
    - Do not share this code with anyone
    - If you didn't request this, please ignore this email
    
    Enter this code on the verification page to activate your account.
    
    The Team Task Manager Team
  `;

  return await sendEmail({ to: email, subject, html, text });
};

/**
 * Send auto-generated password email
 */
export const sendPasswordEmail = async (
  email: string,
  name: string,
  password: string
): Promise<boolean> => {
  const subject = 'Your Account Password - Team Task Manager 🔑';
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .password-box { background: white; border: 2px solid #667eea; padding: 20px; margin: 20px 0; text-align: center; border-radius: 10px; }
          .password-code { font-size: 24px; font-weight: bold; color: #667eea; letter-spacing: 2px; margin: 10px 0; font-family: monospace; }
          .alert { background: #d1ecf1; border-left: 4px solid #0c5460; padding: 15px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Account Verified Successfully!</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${name}</strong>,</p>
            <p>Your email has been verified successfully! Your account is now active.</p>
            <p>Here is your auto-generated password to login:</p>
            <div class="password-box">
              <p style="margin: 0; font-size: 14px; color: #666;">Your Password:</p>
              <div class="password-code">${password}</div>
            </div>
            <div class="alert">
              <strong>🔒 Security Recommendations:</strong>
              <ul style="margin: 10px 0;">
                <li>Change your password after first login</li>
                <li>Use a strong, unique password</li>
                <li>Never share your password with anyone</li>
                <li>Enable two-factor authentication if available</li>
              </ul>
            </div>
            <p style="text-align: center;">
              <a href="${config.cors.origin}/login" class="button">Login Now</a>
            </p>
            <p><strong>Login Credentials:</strong></p>
            <p>Email: ${email}<br>Password: ${password}</p>
            <p>Welcome to Team Task Manager! Start collaborating with your team today.</p>
            <p><strong>The Team Task Manager Team</strong></p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Team Task Manager. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
    Account Verified Successfully!
    
    Hi ${name},
    
    Your email has been verified successfully! Your account is now active.
    
    Here is your auto-generated password to login:
    Password: ${password}
    
    Security Recommendations:
    - Change your password after first login
    - Use a strong, unique password
    - Never share your password with anyone
    - Enable two-factor authentication if available
    
    Login Credentials:
    Email: ${email}
    Password: ${password}
    
    Welcome to Team Task Manager! Start collaborating with your team today.
    
    The Team Task Manager Team
  `;

  return await sendEmail({ to: email, subject, html, text });
};

/**
 * Send welcome email to new user
 */
export const sendWelcomeEmail = async (
  email: string,
  name: string
): Promise<boolean> => {
  const subject = 'Welcome to Team Task Manager! 🎉';
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to Team Task Manager!</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${name}</strong>,</p>
            <p>Thank you for joining Team Task Manager! We're excited to have you on board.</p>
            <p>With Team Task Manager, you can:</p>
            <ul>
              <li>✅ Manage tasks efficiently</li>
              <li>👥 Collaborate with your team in real-time</li>
              <li>📊 Track project progress</li>
              <li>🔔 Stay updated with instant notifications</li>
            </ul>
            <p>Get started by logging in and creating your first project!</p>
            <p>If you have any questions, feel free to reach out to our support team.</p>
            <p>Happy task managing!</p>
            <p><strong>The Team Task Manager Team</strong></p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Team Task Manager. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
    Welcome to Team Task Manager!
    
    Hi ${name},
    
    Thank you for joining Team Task Manager! We're excited to have you on board.
    
    With Team Task Manager, you can:
    - Manage tasks efficiently
    - Collaborate with your team in real-time
    - Track project progress
    - Stay updated with instant notifications
    
    Get started by logging in and creating your first project!
    
    If you have any questions, feel free to reach out to our support team.
    
    Happy task managing!
    
    The Team Task Manager Team
  `;

  return await sendEmail({ to: email, subject, html, text });
};

/**
 * Send password reset email
 */
export const sendPasswordResetEmail = async (
  email: string,
  name: string,
  _resetToken: string,
  resetUrl: string
): Promise<boolean> => {
  const subject = 'Password Reset Request 🔐';
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .alert { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .token-box { background: #e9ecef; padding: 15px; border-radius: 5px; font-family: monospace; word-break: break-all; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset Request</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${name}</strong>,</p>
            <p>We received a request to reset your password for your Team Task Manager account.</p>
            <p>Click the button below to reset your password:</p>
            <p style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <div class="token-box">${resetUrl}</div>
            <div class="alert">
              <strong>⚠️ Security Notice:</strong>
              <ul>
                <li>This link will expire in <strong>1 hour</strong></li>
                <li>If you didn't request this, please ignore this email</li>
                <li>Your password won't change unless you click the link above</li>
              </ul>
            </div>
            <p>For security reasons, we cannot send your password. You'll need to create a new one.</p>
            <p>If you have any issues, please contact our support team.</p>
            <p><strong>The Team Task Manager Team</strong></p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Team Task Manager. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
    Password Reset Request
    
    Hi ${name},
    
    We received a request to reset your password for your Team Task Manager account.
    
    Click the link below to reset your password:
    ${resetUrl}
    
    Security Notice:
    - This link will expire in 1 hour
    - If you didn't request this, please ignore this email
    - Your password won't change unless you click the link above
    
    For security reasons, we cannot send your password. You'll need to create a new one.
    
    If you have any issues, please contact our support team.
    
    The Team Task Manager Team
  `;

  return await sendEmail({ to: email, subject, html, text });
};

/**
 * Send task assignment notification email
 */
export const sendTaskAssignmentEmail = async (
  email: string,
  name: string,
  taskTitle: string,
  projectName: string,
  assignedBy: string,
  dueDate?: Date
): Promise<boolean> => {
  const subject = `New Task Assigned: ${taskTitle} 📋`;
  
  const dueDateText = dueDate 
    ? `<p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}</p>`
    : '';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .task-details { background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 New Task Assigned</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${name}</strong>,</p>
            <p>You have been assigned a new task by <strong>${assignedBy}</strong>.</p>
            <div class="task-details">
              <h3>Task Details:</h3>
              <p><strong>Task:</strong> ${taskTitle}</p>
              <p><strong>Project:</strong> ${projectName}</p>
              ${dueDateText}
              <p><strong>Assigned By:</strong> ${assignedBy}</p>
            </div>
            <p style="text-align: center;">
              <a href="${config.cors.origin}/tasks" class="button">View Task</a>
            </p>
            <p>Log in to your account to view more details and start working on this task.</p>
            <p><strong>The Team Task Manager Team</strong></p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Team Task Manager. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
    New Task Assigned
    
    Hi ${name},
    
    You have been assigned a new task by ${assignedBy}.
    
    Task Details:
    - Task: ${taskTitle}
    - Project: ${projectName}
    ${dueDate ? `- Due Date: ${new Date(dueDate).toLocaleDateString()}` : ''}
    - Assigned By: ${assignedBy}
    
    Log in to your account to view more details and start working on this task.
    
    The Team Task Manager Team
  `;

  return await sendEmail({ to: email, subject, html, text });
};

/**
 * Send team member added notification email
 * Used when a user is directly added to a team (not invited)
 */
export const sendTeamMemberAddedEmail = async (
  email: string,
  memberName: string,
  teamName: string,
  addedBy: string,
  teamLink: string,
  role: string
): Promise<boolean> => {
  // Format role for display
  const roleDisplay = 
    role === 'admin' ? 'Admin' : 
    role === 'owner' ? 'Owner' : 
    'Member';
  const subject = `You've been added to ${teamName}! 👥`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .info-box { background: white; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .role-badge { display: inline-block; padding: 5px 15px; background: #667eea; color: white; border-radius: 20px; font-size: 12px; font-weight: bold; margin-left: 10px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>👥 Welcome to ${teamName}!</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${memberName}</strong>,</p>
            <p>Great news! <strong>${addedBy}</strong> has added you to the team <strong>${teamName}</strong> on Team Task Manager!</p>
            <div class="info-box">
              <p style="margin: 5px 0;"><strong>Team:</strong> ${teamName}</p>
              <p style="margin: 5px 0;"><strong>Your Role:</strong> ${roleDisplay}<span class="role-badge">${roleDisplay}</span></p>
              <p style="margin: 5px 0;"><strong>Added By:</strong> ${addedBy}</p>
            </div>
            <p>You can now collaborate with your team members, manage tasks, and work on projects together.</p>
            <p style="text-align: center;">
              <a href="${teamLink}" class="button">View Team</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="background: #e9ecef; padding: 15px; border-radius: 5px; font-family: monospace; word-break: break-all;">${teamLink}</p>
            <p>Start collaborating and make great things happen with your team!</p>
            <p><strong>The Team Task Manager Team</strong></p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Team Task Manager. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
    Welcome to ${teamName}!
    
    Hi ${memberName},
    
    Great news! ${addedBy} has added you to the team ${teamName} on Team Task Manager!
    
    Team Details:
    - Team: ${teamName}
    - Your Role: ${roleDisplay}
    - Added By: ${addedBy}
    
    You can now collaborate with your team members, manage tasks, and work on projects together.
    
    View your team here: ${teamLink}
    
    Start collaborating and make great things happen with your team!
    
    The Team Task Manager Team
  `;

  return await sendEmail({ to: email, subject, html, text });
};

/**
 * Send team invitation email
 */
export const sendTeamInvitationEmail = async (
  email: string,
  teamName: string,
  invitedBy: string,
  invitationLink: string
): Promise<boolean> => {
  const subject = `You're invited to join ${teamName}! 👥`;
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>👥 Team Invitation</h1>
          </div>
          <div class="content">
            <p>Hi there,</p>
            <p><strong>${invitedBy}</strong> has invited you to join the team <strong>${teamName}</strong> on Team Task Manager!</p>
            <p>Join the team to collaborate on projects, manage tasks, and stay connected with your teammates.</p>
            <p style="text-align: center;">
              <a href="${invitationLink}" class="button">Accept Invitation</a>
            </p>
            <p>Or copy and paste this link into your browser:</p>
            <p style="background: #e9ecef; padding: 15px; border-radius: 5px; font-family: monospace; word-break: break-all;">${invitationLink}</p>
            <p>This invitation will expire in 7 days.</p>
            <p><strong>The Team Task Manager Team</strong></p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Team Task Manager. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
    Team Invitation
    
    Hi there,
    
    ${invitedBy} has invited you to join the team ${teamName} on Team Task Manager!
    
    Join the team to collaborate on projects, manage tasks, and stay connected with your teammates.
    
    Click the link below to accept the invitation:
    ${invitationLink}
    
    This invitation will expire in 7 days.
    
    The Team Task Manager Team
  `;

  return await sendEmail({ to: email, subject, html, text });
};

/**
 * Send task reminder email
 */
export const sendTaskReminderEmail = async (
  email: string,
  name: string,
  taskTitle: string,
  dueDate: Date
): Promise<boolean> => {
  const subject = `Reminder: Task "${taskTitle}" is due soon! ⏰`;
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .alert { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⏰ Task Reminder</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${name}</strong>,</p>
            <div class="alert">
              <p><strong>Reminder:</strong> Your task <strong>"${taskTitle}"</strong> is due soon!</p>
              <p><strong>Due Date:</strong> ${new Date(dueDate).toLocaleString()}</p>
            </div>
            <p>Don't forget to complete this task before the deadline.</p>
            <p style="text-align: center;">
              <a href="${config.cors.origin}/tasks" class="button">View Task</a>
            </p>
            <p><strong>The Team Task Manager Team</strong></p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Team Task Manager. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  const text = `
    Task Reminder
    
    Hi ${name},
    
    Reminder: Your task "${taskTitle}" is due soon!
    
    Due Date: ${new Date(dueDate).toLocaleString()}
    
    Don't forget to complete this task before the deadline.
    
    The Team Task Manager Team
  `;

  return await sendEmail({ to: email, subject, html, text });
};

