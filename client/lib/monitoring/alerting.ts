// Alerting thresholds and configuration
export const alertConfig = {
  errorRateThreshold: 0.05, // 5% error rate threshold
  responseTimeThreshold: 1000, // 1 second
  criticalFeatures: ['payment', 'auth', 'data-processing'],
  severityLevels: ['critical', 'high', 'medium', 'low'] as const,
};

// Error severity mapping
export const errorSeverityMap = {
  PaymentError: 'critical',
  AuthenticationError: 'critical',
  DatabaseError: 'critical',
  ValidationError: 'high',
  NetworkError: 'medium',
  NotFoundError: 'low',
} as const;

// Alert channels configuration
export const alertChannels = {
  slack: {
    enabled: true,
    webhook: typeof process !== 'undefined' ? process.env?.SLACK_WEBHOOK_URL : (import.meta as any).env?.VITE_SLACK_WEBHOOK_URL,
    channel: '#monitoring-alerts',
  },
  email: {
    enabled: true,
    recipients: ['oncall@yourdomain.com'],
  },
  pagerduty: {
    enabled: true,
    apiKey: typeof process !== 'undefined' ? process.env?.PAGERDUTY_API_KEY : (import.meta as any).env?.VITE_PAGERDUTY_API_KEY,
    serviceId: typeof process !== 'undefined' ? process.env?.PAGERDUTY_SERVICE_ID : (import.meta as any).env?.VITE_PAGERDUTY_SERVICE_ID,
  },
};

export type AlertSeverity = typeof alertConfig.severityLevels[number];
export type ErrorType = keyof typeof errorSeverityMap;

// Alert interface
export interface Alert {
  id: string;
  timestamp: number;
  type: ErrorType;
  message: string;
  severity: AlertSeverity;
  context: Record<string, any>;
  metadata: {
    feature?: string;
    user?: string;
    environment: string;
    version: string;
  };
}

// Alert manager class
export class AlertManager {
  private static instance: AlertManager;
  private alertCount: Record<ErrorType, number> = {} as Record<ErrorType, number>;
  private readonly alertThrottleWindow = 5 * 60 * 1000; // 5 minutes

  private constructor() {
    // Initialize error counters
    Object.keys(errorSeverityMap).forEach((type) => {
      this.alertCount[type as ErrorType] = 0;
    });

    // Reset counters periodically
    setInterval(() => {
      this.resetAlertCounts();
    }, this.alertThrottleWindow);
  }

  static getInstance(): AlertManager {
    if (!AlertManager.instance) {
      AlertManager.instance = new AlertManager();
    }
    return AlertManager.instance;
  }

  private resetAlertCounts() {
    Object.keys(this.alertCount).forEach((type) => {
      this.alertCount[type as ErrorType] = 0;
    });
  }

  private async sendToChannel(alert: Alert, channel: keyof typeof alertChannels) {
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

  private async sendSlackAlert(alert: Alert) {
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

  private async sendEmailAlert(_alert: Alert) {
    // Implement email sending logic
    // This would typically use your email service (SendGrid, AWS SES, etc.)
  }

  private async sendPagerDutyAlert(alert: Alert) {
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

  async processAlert(alert: Alert): Promise<void> {
    const errorType = alert.type;
    this.alertCount[errorType]++;

    // Check if we should send the alert based on throttling
    if (this.alertCount[errorType] <= 3) { // Allow first 3 alerts
      // Send to all configured channels
      await Promise.all(
        Object.keys(alertChannels).map((channel) =>
          this.sendToChannel(alert, channel as keyof typeof alertChannels)
        )
      );
    }
  }
}

// Export singleton instance
export const alertManager = AlertManager.getInstance();
