// Email utility functions for team collaboration
// This is a placeholder implementation - in production, you would integrate with
// an email service like SendGrid, AWS SES, or similar







/**
 * Send team invitation email
 * @param email - Recipient email address
 * @param teamName - Name of the team
 * @param token - Invitation token
 */
export async function sendTeamInvitationEmail(
  email, 
  teamName, 
  token
) {
  try {
    // In production, replace this with actual email service integration
    console.log(`[EMAIL] Team invitation sent to ${email}`);
    console.log(`Team: ${teamName}`);
    console.log(`Invitation token: ${token}`);
    console.log(`Invitation URL: ${process.env.FRONTEND_URL}/teams/accept-invitation?token=${token}`);
    
    // TODO: Implement actual email sending
    // Example with SendGrid:
    // await sendGridClient.send({
    //   to: email,
    //   from: process.env.FROM_EMAIL,
    //   subject: `You've been invited to join ${teamName}`,
    //   html: generateInvitationEmailHtml(teamName, token),
    //   text: generateInvitationEmailText(teamName, token)
    // });
    
  } catch (error) {
    console.error('Failed to send team invitation email:', error);
    // Don't throw error to avoid breaking the invitation flow
    // In production, you might want to queue for retry
  }
}

/**
 * Send team member removal notification
 */
export async function sendTeamRemovalNotification(
  email,
  teamName,
  removedBy
) {
  try {
    console.log(`[EMAIL] Team removal notification sent to ${email}`);
    console.log(`Team: ${teamName}`);
    console.log(`Removed by: ${removedBy}`);
    
    // TODO: Implement actual email sending
  } catch (error) {
    console.error('Failed to send team removal notification:', error);
  }
}

/**
 * Send team role change notification
 */
export async function sendRoleChangeNotification(
  email,
  teamName,
  newRole,
  changedBy
) {
  try {
    console.log(`[EMAIL] Role change notification sent to ${email}`);
    console.log(`Team: ${teamName}`);
    console.log(`New role: ${newRole}`);
    console.log(`Changed by: ${changedBy}`);
    
    // TODO: Implement actual email sending
  } catch (error) {
    console.error('Failed to send role change notification:', error);
  }
}

/**
 * Generate HTML template for team invitation
 */
function generateInvitationEmailHtml(teamName, token) {
  const invitationUrl = `${process.env.FRONTEND_URL}/teams/accept-invitation?token=${token}`;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Team Invitation</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2563eb;">You've been invited to join ${teamName}</h2>
        
        <p>Hello!</p>
        
        <p>You've been invited to join the <strong>${teamName}</strong> team on FeexSystems. 
        Click the button below to accept the invitation and start collaborating with your team.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${invitationUrl}" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 6px; display: inline-block;">
            Accept Invitation
          </a>
        </div>
        
        <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #666;">${invitationUrl}</p>
        
        <p style="margin-top: 30px; font-size: 14px; color: #666;">
          This invitation will expire in 7 days. If you didn't expect this invitation, 
          you can safely ignore this email.
        </p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        
        <p style="font-size: 12px; color: #999;">
          This email was sent by FeexSystems. If you have any questions, 
          please contact our support team.
        </p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate plain text template for team invitation
 */
function generateInvitationEmailText(teamName, token) {
  const invitationUrl = `${process.env.FRONTEND_URL}/teams/accept-invitation?token=${token}`;
  
  return `
You've been invited to join ${teamName}

Hello!

You've been invited to join the ${teamName} team on FeexSystems. 
Visit the following link to accept the invitation and start collaborating with your team:

${invitationUrl}

This invitation will expire in 7 days. If you didn't expect this invitation, 
you can safely ignore this email.

---
This email was sent by FeexSystems. If you have any questions, 
please contact our support team.
  `.trim();
}

/**
 * Validate email address format
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email) {
  return email.toLowerCase().trim();
}