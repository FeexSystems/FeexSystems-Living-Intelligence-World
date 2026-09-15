
















class EmailNotificationService {constructor() { EmailNotificationService.prototype.__init.call(this); }
   __init() {this.templates = {
    security_alert: this.createSecurityAlertTemplate,
    deployment_status: this.createDeploymentStatusTemplate,
    ai_request_complete: this.createAIRequestCompleteTemplate,
    vulnerability_found: this.createVulnerabilityFoundTemplate,
    team_invitation: this.createTeamInvitationTemplate,
    billing_alert: this.createBillingAlertTemplate,
    system_maintenance: this.createSystemMaintenanceTemplate,
    weekly_report: this.createWeeklyReportTemplate,
  }}

  async sendNotificationEmail(data) {
    try {
      const templateKey = this.getTemplateKey(data.notification);
      const template = this.templates[templateKey];
      
      if (!template) {
        console.warn(`No email template found for notification type: ${templateKey}`);
        return false;
      }

      const emailContent = template(data);
      
      // In a real implementation, this would call your email service API
      const response = await fetch('/api/notifications/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: data.to,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
          notificationId: data.notification.id,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to send notification email:', error);
      return false;
    }
  }

   getTemplateKey(notification) {
    // Map notification categories and types to template keys
    if (notification.category === 'security' && notification.priority === 'critical') {
      return 'security_alert';
    }
    
    if (notification.category === 'deployment') {
      return 'deployment_status';
    }
    
    if (notification.category === 'ai') {
      return 'ai_request_complete';
    }
    
    if (notification.title.toLowerCase().includes('vulnerability')) {
      return 'vulnerability_found';
    }
    
    if (notification.category === 'team') {
      return 'team_invitation';
    }
    
    if (notification.category === 'billing') {
      return 'billing_alert';
    }
    
    if (notification.category === 'system') {
      return 'system_maintenance';
    }
    
    return 'security_alert'; // Default template
  }

   createSecurityAlertTemplate(data) {
    const { notification, userPreferences } = data;
    
    return {
      subject: `🚨 Security Alert: ${notification.title}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Security Alert</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #dc2626, #ef4444); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">🚨 Security Alert</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
            <h2 style="color: #dc2626; margin-top: 0;">${notification.title}</h2>
            <p style="font-size: 16px; margin-bottom: 20px;">${notification.message}</p>
            
            <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #dc2626; margin: 20px 0;">
              <p style="margin: 0; font-weight: bold; color: #dc2626;">Priority: ${notification.priority.toUpperCase()}</p>
              <p style="margin: 5px 0 0 0; font-size: 14px; color: #6b7280;">
                Detected at: ${notification.timestamp.toLocaleString()}
              </p>
            </div>
            
            ${notification.actionUrl ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${notification.actionUrl}" 
                   style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  ${notification.actionLabel || 'View Details'}
                </a>
              </div>
            ` : ''}
          </div>
          
          <div style="background: #f3f4f6; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #6b7280;">
            <p>This is an automated security alert from FeexSystems.</p>
            <p>
              <a href="${userPreferences.dashboardUrl}" style="color: #3b82f6;">View Dashboard</a> | 
              <a href="${userPreferences.unsubscribeUrl}" style="color: #6b7280;">Unsubscribe</a>
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
        🚨 SECURITY ALERT: ${notification.title}
        
        ${notification.message}
        
        Priority: ${notification.priority.toUpperCase()}
        Detected at: ${notification.timestamp.toLocaleString()}
        
        ${notification.actionUrl ? `View details: ${notification.actionUrl}` : ''}
        
        ---
        This is an automated security alert from FeexSystems.
        Dashboard: ${userPreferences.dashboardUrl}
        Unsubscribe: ${userPreferences.unsubscribeUrl}
      `
    };
  }

   createDeploymentStatusTemplate(data) {
    const { notification, userPreferences } = data;
    const isSuccess = notification.type === 'success';
    const color = isSuccess ? '#10b981' : '#ef4444';
    const emoji = isSuccess ? '✅' : '❌';
    
    return {
      subject: `${emoji} Deployment ${isSuccess ? 'Successful' : 'Failed'}: ${notification.title}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Deployment Status</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, ${color}, ${color}dd); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">${emoji} Deployment ${isSuccess ? 'Successful' : 'Failed'}</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
            <h2 style="color: ${color}; margin-top: 0;">${notification.title}</h2>
            <p style="font-size: 16px; margin-bottom: 20px;">${notification.message}</p>
            
            <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid ${color}; margin: 20px 0;">
              <p style="margin: 0; font-weight: bold;">Status: ${isSuccess ? 'Completed Successfully' : 'Failed'}</p>
              <p style="margin: 5px 0 0 0; font-size: 14px; color: #6b7280;">
                ${notification.timestamp.toLocaleString()}
              </p>
            </div>
            
            ${notification.actionUrl ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${notification.actionUrl}" 
                   style="background: ${color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  View Deployment
                </a>
              </div>
            ` : ''}
          </div>
          
          <div style="background: #f3f4f6; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #6b7280;">
            <p>This is an automated deployment notification from FeexSystems.</p>
            <p>
              <a href="${userPreferences.dashboardUrl}" style="color: #3b82f6;">View Dashboard</a> | 
              <a href="${userPreferences.unsubscribeUrl}" style="color: #6b7280;">Unsubscribe</a>
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
        ${emoji} DEPLOYMENT ${isSuccess ? 'SUCCESSFUL' : 'FAILED'}: ${notification.title}
        
        ${notification.message}
        
        Status: ${isSuccess ? 'Completed Successfully' : 'Failed'}
        Time: ${notification.timestamp.toLocaleString()}
        
        ${notification.actionUrl ? `View deployment: ${notification.actionUrl}` : ''}
        
        ---
        This is an automated deployment notification from FeexSystems.
        Dashboard: ${userPreferences.dashboardUrl}
        Unsubscribe: ${userPreferences.unsubscribeUrl}
      `
    };
  }

   createAIRequestCompleteTemplate(data) {
    const { notification, userPreferences } = data;
    
    return {
      subject: `🤖 AI Request Complete: ${notification.title}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>AI Request Complete</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #8b5cf6, #a78bfa); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">🤖 AI Request Complete</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
            <h2 style="color: #8b5cf6; margin-top: 0;">${notification.title}</h2>
            <p style="font-size: 16px; margin-bottom: 20px;">${notification.message}</p>
            
            ${notification.actionUrl ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${notification.actionUrl}" 
                   style="background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  View Results
                </a>
              </div>
            ` : ''}
          </div>
          
          <div style="background: #f3f4f6; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #6b7280;">
            <p>This is an automated AI service notification from FeexSystems.</p>
            <p>
              <a href="${userPreferences.dashboardUrl}" style="color: #3b82f6;">View Dashboard</a> | 
              <a href="${userPreferences.unsubscribeUrl}" style="color: #6b7280;">Unsubscribe</a>
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
        🤖 AI REQUEST COMPLETE: ${notification.title}
        
        ${notification.message}
        
        Completed at: ${notification.timestamp.toLocaleString()}
        
        ${notification.actionUrl ? `View results: ${notification.actionUrl}` : ''}
        
        ---
        This is an automated AI service notification from FeexSystems.
        Dashboard: ${userPreferences.dashboardUrl}
        Unsubscribe: ${userPreferences.unsubscribeUrl}
      `
    };
  }

   createVulnerabilityFoundTemplate(data) {
    const { notification, userPreferences } = data;
    
    return {
      subject: `🛡️ Vulnerability Found: ${notification.title}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Vulnerability Found</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f59e0b, #fbbf24); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">🛡️ Vulnerability Detected</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
            <h2 style="color: #f59e0b; margin-top: 0;">${notification.title}</h2>
            <p style="font-size: 16px; margin-bottom: 20px;">${notification.message}</p>
            
            <div style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin: 20px 0;">
              <p style="margin: 0; font-weight: bold; color: #f59e0b;">Severity: ${notification.priority.toUpperCase()}</p>
              <p style="margin: 5px 0 0 0; font-size: 14px; color: #6b7280;">
                Discovered at: ${notification.timestamp.toLocaleString()}
              </p>
            </div>
            
            ${notification.actionUrl ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${notification.actionUrl}" 
                   style="background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  View Vulnerability
                </a>
              </div>
            ` : ''}
          </div>
          
          <div style="background: #f3f4f6; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #6b7280;">
            <p>This is an automated security scan notification from FeexSystems.</p>
            <p>
              <a href="${userPreferences.dashboardUrl}" style="color: #3b82f6;">View Dashboard</a> | 
              <a href="${userPreferences.unsubscribeUrl}" style="color: #6b7280;">Unsubscribe</a>
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
        🛡️ VULNERABILITY DETECTED: ${notification.title}
        
        ${notification.message}
        
        Severity: ${notification.priority.toUpperCase()}
        Discovered at: ${notification.timestamp.toLocaleString()}
        
        ${notification.actionUrl ? `View vulnerability: ${notification.actionUrl}` : ''}
        
        ---
        This is an automated security scan notification from FeexSystems.
        Dashboard: ${userPreferences.dashboardUrl}
        Unsubscribe: ${userPreferences.unsubscribeUrl}
      `
    };
  }

   createTeamInvitationTemplate(data) {
    const { notification, userPreferences } = data;
    
    return {
      subject: `👥 Team Invitation: ${notification.title}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Team Invitation</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #3b82f6, #60a5fa); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">👥 Team Invitation</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
            <h2 style="color: #3b82f6; margin-top: 0;">${notification.title}</h2>
            <p style="font-size: 16px; margin-bottom: 20px;">${notification.message}</p>
            
            ${notification.actionUrl ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${notification.actionUrl}" 
                   style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Accept Invitation
                </a>
              </div>
            ` : ''}
          </div>
          
          <div style="background: #f3f4f6; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #6b7280;">
            <p>This is a team invitation from FeexSystems.</p>
            <p>
              <a href="${userPreferences.dashboardUrl}" style="color: #3b82f6;">View Dashboard</a> | 
              <a href="${userPreferences.unsubscribeUrl}" style="color: #6b7280;">Unsubscribe</a>
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
        👥 TEAM INVITATION: ${notification.title}
        
        ${notification.message}
        
        ${notification.actionUrl ? `Accept invitation: ${notification.actionUrl}` : ''}
        
        ---
        This is a team invitation from FeexSystems.
        Dashboard: ${userPreferences.dashboardUrl}
        Unsubscribe: ${userPreferences.unsubscribeUrl}
      `
    };
  }

   createBillingAlertTemplate(data) {
    const { notification, userPreferences } = data;
    
    return {
      subject: `💳 Billing Alert: ${notification.title}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Billing Alert</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981, #34d399); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">💳 Billing Alert</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
            <h2 style="color: #10b981; margin-top: 0;">${notification.title}</h2>
            <p style="font-size: 16px; margin-bottom: 20px;">${notification.message}</p>
            
            ${notification.actionUrl ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${notification.actionUrl}" 
                   style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Manage Billing
                </a>
              </div>
            ` : ''}
          </div>
          
          <div style="background: #f3f4f6; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #6b7280;">
            <p>This is a billing notification from FeexSystems.</p>
            <p>
              <a href="${userPreferences.dashboardUrl}" style="color: #3b82f6;">View Dashboard</a> | 
              <a href="${userPreferences.unsubscribeUrl}" style="color: #6b7280;">Unsubscribe</a>
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
        💳 BILLING ALERT: ${notification.title}
        
        ${notification.message}
        
        ${notification.actionUrl ? `Manage billing: ${notification.actionUrl}` : ''}
        
        ---
        This is a billing notification from FeexSystems.
        Dashboard: ${userPreferences.dashboardUrl}
        Unsubscribe: ${userPreferences.unsubscribeUrl}
      `
    };
  }

   createSystemMaintenanceTemplate(data) {
    const { notification, userPreferences } = data;
    
    return {
      subject: `🔧 System Maintenance: ${notification.title}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>System Maintenance</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6b7280, #9ca3af); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">🔧 System Maintenance</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
            <h2 style="color: #6b7280; margin-top: 0;">${notification.title}</h2>
            <p style="font-size: 16px; margin-bottom: 20px;">${notification.message}</p>
          </div>
          
          <div style="background: #f3f4f6; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #6b7280;">
            <p>This is a system maintenance notification from FeexSystems.</p>
            <p>
              <a href="${userPreferences.dashboardUrl}" style="color: #3b82f6;">View Dashboard</a> | 
              <a href="${userPreferences.unsubscribeUrl}" style="color: #6b7280;">Unsubscribe</a>
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
        🔧 SYSTEM MAINTENANCE: ${notification.title}
        
        ${notification.message}
        
        ---
        This is a system maintenance notification from FeexSystems.
        Dashboard: ${userPreferences.dashboardUrl}
        Unsubscribe: ${userPreferences.unsubscribeUrl}
      `
    };
  }

   createWeeklyReportTemplate(data) {
    const { notification, userPreferences } = data;
    
    return {
      subject: `📊 Weekly Report: ${notification.title}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Weekly Report</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #3b82f6, #60a5fa); color: white; padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">📊 Weekly Report</h1>
          </div>
          
          <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none;">
            <h2 style="color: #3b82f6; margin-top: 0;">${notification.title}</h2>
            <p style="font-size: 16px; margin-bottom: 20px;">${notification.message}</p>
            
            ${notification.actionUrl ? `
              <div style="text-align: center; margin: 30px 0;">
                <a href="${notification.actionUrl}" 
                   style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  View Full Report
                </a>
              </div>
            ` : ''}
          </div>
          
          <div style="background: #f3f4f6; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #6b7280;">
            <p>This is your weekly report from FeexSystems.</p>
            <p>
              <a href="${userPreferences.dashboardUrl}" style="color: #3b82f6;">View Dashboard</a> | 
              <a href="${userPreferences.unsubscribeUrl}" style="color: #6b7280;">Unsubscribe</a>
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
        📊 WEEKLY REPORT: ${notification.title}
        
        ${notification.message}
        
        ${notification.actionUrl ? `View full report: ${notification.actionUrl}` : ''}
        
        ---
        This is your weekly report from FeexSystems.
        Dashboard: ${userPreferences.dashboardUrl}
        Unsubscribe: ${userPreferences.unsubscribeUrl}
      `
    };
  }
}

export const emailNotificationService = new EmailNotificationService();