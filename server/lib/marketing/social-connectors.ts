import { logger as log } from "../logging";

export interface SocialPostDraft {
  content: string;
  mediaUrls?: string[];
  replyToId?: string;
}

export interface SocialConnector {
  platform: "twitter" | "linkedin" | "email";
  draftPost(content: string, metadata?: any): Promise<SocialPostDraft>;
  publishPost(draft: SocialPostDraft): Promise<{ id: string; url: string }>;
}

export class TwitterConnector implements SocialConnector {
  platform: "twitter" = "twitter";

  async draftPost(content: string, metadata?: any): Promise<SocialPostDraft> {
    // In a real implementation, this would format for Twitter, maybe splitting into threads
    return { content };
  }

  async publishPost(draft: SocialPostDraft): Promise<{ id: string; url: string }> {
    log.info(`[TwitterConnector] Simulating publish to Twitter: ${draft.content.substring(0, 50)}...`);
    // Simulated network delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    const mockId = `tw_${Math.random().toString(36).substring(7)}`;
    return {
      id: mockId,
      url: `https://twitter.com/feexsystems/status/${mockId}`
    };
  }
}

export class LinkedInConnector implements SocialConnector {
  platform: "linkedin" = "linkedin";

  async draftPost(content: string, metadata?: any): Promise<SocialPostDraft> {
    // In a real implementation, this would format for LinkedIn
    return { content };
  }

  async publishPost(draft: SocialPostDraft): Promise<{ id: string; url: string }> {
    log.info(`[LinkedInConnector] Simulating publish to LinkedIn: ${draft.content.substring(0, 50)}...`);
    // Simulated network delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    const mockId = `li_${Math.random().toString(36).substring(7)}`;
    return {
      id: mockId,
      url: `https://linkedin.com/feed/update/urn:li:activity:${mockId}`
    };
  }
}

export class EmailConnector implements SocialConnector {
  platform: "email" = "email";

  async draftPost(content: string, metadata?: any): Promise<SocialPostDraft> {
    return { content };
  }

  async publishPost(draft: SocialPostDraft): Promise<{ id: string; url: string }> {
    log.info(`[EmailConnector] Simulating sending email campaign...`);
    // Simulated network delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
    
    const mockId = `em_${Math.random().toString(36).substring(7)}`;
    return {
      id: mockId,
      url: `https://email-provider.com/campaigns/${mockId}`
    };
  }
}

export class SocialConnectorFactory {
  static getConnector(platform: "twitter" | "linkedin" | "email"): SocialConnector {
    switch (platform) {
      case "twitter":
        return new TwitterConnector();
      case "linkedin":
        return new LinkedInConnector();
      case "email":
        return new EmailConnector();
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }
}
