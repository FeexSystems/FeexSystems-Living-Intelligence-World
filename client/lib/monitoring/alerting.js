 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }// Alerting thresholds and configuration
export const alertConfig = {
  errorRateThreshold: 0.05, // 5% error rate threshold
  responseTimeThreshold: 1000, // 1 second
  criticalFeatures: ['payment', 'auth', 'data-processing'],
  severityLevels: ['critical', 'high', 'medium', 'low'] ,
};

// Error severity mapping
export const errorSeverityMap = {
  PaymentError: 'critical',
  AuthenticationError: 'critical',
  DatabaseError: 'critical',
  ValidationError: 'high',
  NetworkError: 'medium',
  NotFoundError: 'low',
} ;

// Alert channels configuration
export const alertChannels = {
  slack: {
    enabled: true,
    webhook: typeof process !== 'undefined' ? _optionalChain([process, 'access', _ => _.env, 'optionalAccess', _2 => _2.SLACK_WEBHOOK_URL]) : _optionalChain([(import.meta ), 'access', _3 => _3.env, 'optionalAccess', _4 => _4.VITE_SLACK_WEBHOOK_URL]),
    channel: '#monitoring-alerts',
  },
  email: {
    enabled: true,
    recipients: ['oncall@yourdomain.com'],
  },
  pagerduty: {
    enabled: true,
    apiKey: typeof process !== 'undefined' ? _optionalChain([process, 'access', _5 => _5.env, 'optionalAccess', _6 => _6.PAGERDUTY_API_KEY]) : _optionalChain([(import.meta ), 'access', _7 => _7.env, 'optionalAccess', _8 => _8.VITE_PAGERDUTY_API_KEY]),
    serviceId: typeof process !== 'undefined' ? _optionalChain([process, 'access', _9 => _9.env, 'optionalAccess', _10 => _10.PAGERDUTY_SERVICE_ID]) : _optionalChain([(import.meta ), 'access', _11 => _11.env, 'optionalAccess', _12 => _12.VITE_PAGERDUTY_SERVICE_ID]),
  },
};

 


















// Alert manager class
export class AlertManager {
  
   __init() {this.alertCount = {} }
    __init2() {this.alertThrottleWindow = 5 * 60 * 1000} // 5 minutes

   constructor() {;AlertManager.prototype.__init.call(this);AlertManager.prototype.__init2.call(this);
    // Initialize error counters
    Object.keys(errorSeverityMap).forEach((type) => {
      this.alertCount[type ] = 0;
    });

    // Reset counters periodically
    setInterval(() => {
      this.resetAlertCounts();
    }, this.alertThrottleWindow);
  }

  static getInstance() {
    if (!AlertManager.instance) {
      AlertManager.instance = new AlertManager();
    }
    return AlertManager.instance;
  }

   resetAlertCounts() {
    Object.keys(this.alertCount).forEach((type) => {
      this.alertCount[type ] = 0;
    });
  }

   async sendToChannel(alert, channel) {
    const config = alertChannels[channel];
    if (!config.enabled) return;

    try {
      switch (channel) {
        case 'slack':
          await this.sendSlackAlert(alert);
          break;
        case 'email':
          await this.sendEmailAlert(alert);
          break;
        case 'pagerduty':
          await this.sendPagerDutyAlert(alert);
          break;
      }
    } catch (error) {
      console.error(`Failed to send alert to ${channel}:`, error);
    }
  }

   async sendSlackAlert(alert) {
    if (!alertChannels.slack.webhook) return;

    const color = {
      critical: '#ff0000',
      high: '#ffa500',
      medium: '#ffff00',
      low: '#00ff00',
    }[alert.severity];

    const payload = {
      channel: alertChannels.slack.channel,
      attachments: [
        {
          color,
          title: `[${alert.severity.toUpperCase()}] ${alert.type} Error`,
          text: alert.message,
          fields: [
            {
              title: 'Feature',
              value: alert.metadata.feature || 'N/A',
              short: true,
            },
            {
              title: 'Environment',
              value: alert.metadata.environment,
              short: true,
            },
            {
              title: 'Version',
              value: alert.metadata.version,
              short: true,
            },
          ],
          footer: `Alert ID: ${alert.id}`,
          ts: alert.timestamp / 1000,
        },
      ],
    };

    await fetch(alertChannels.slack.webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

   async sendEmailAlert(alert) {
    // Implement email sending logic
    // This would typically use your email service (SendGrid, AWS SES, etc.)
  }

   async sendPagerDutyAlert(alert) {
    if (!alertChannels.pagerduty.apiKey || !alertChannels.pagerduty.serviceId) return;

    const payload = {
      routing_key: alertChannels.pagerduty.apiKey,
      event_action: 'trigger',
      payload: {
        summary: `[${alert.severity.toUpperCase()}] ${alert.type} Error: ${alert.message}`,
        source: alert.metadata.feature || 'application',
        severity: alert.severity,
        custom_details: {
          ...alert.context,
          environment: alert.metadata.environment,
          version: alert.metadata.version,
        },
      },
    };

    await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async processAlert(alert) {
    const errorType = alert.type;
    this.alertCount[errorType]++;

    // Check if we should send the alert based on throttling
    if (this.alertCount[errorType] <= 3) { // Allow first 3 alerts
      // Send to all configured channels
      await Promise.all(
        Object.keys(alertChannels).map((channel) =>
          this.sendToChannel(alert, channel )
        )
      );
    }
  }
}

// Export singleton instance
export const alertManager = AlertManager.getInstance();
