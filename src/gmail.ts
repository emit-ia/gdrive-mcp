import { google } from 'googleapis';
import { config } from './config.js';
import { Logger } from './logger.js';

export class GmailService {
  private gmail: any;
  private auth: any;
  private lastTokenRefresh: Date = new Date();
  private tokenRefreshInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeAuth();
    this.gmail = google.gmail({ version: 'v1', auth: this.auth });
    this.setupTokenMaintenance();
  }

  private initializeAuth() {
    // Force OAuth2 authentication for Gmail (service accounts don't work well with personal Gmail)
    if (!config.googleClientId || !config.googleClientSecret) {
      throw new Error(
        "Gmail requires OAuth2 authentication. Please set:\n" +
        "- GOOGLE_CLIENT_ID\n" +
        "- GOOGLE_CLIENT_SECRET\n" +
        "- GOOGLE_REFRESH_TOKEN (optional but recommended)\n\n" +
        "Service accounts cannot access personal Gmail accounts."
      );
    }

    this.auth = new google.auth.OAuth2(
      config.googleClientId,
      config.googleClientSecret,
      config.googleRedirectUri
    );

    if (config.googleRefreshToken) {
      this.auth.setCredentials({
        refresh_token: config.googleRefreshToken,
      });
    } else {
      Logger.warn(
        "No refresh token provided for Gmail. " +
        "You may need to re-authenticate periodically."
      );
    }
  }

  private setupTokenMaintenance() {
    if (!config.googleRefreshToken) {
      Logger.gmail("No refresh token available - token maintenance disabled");
      return;
    }

    // Refresh token every 30 minutes to keep it active
    this.tokenRefreshInterval = setInterval(async () => {
      try {
        await this.validateAndRefreshToken();
        Logger.gmail("Token refreshed successfully during maintenance");
      } catch (error) {
        Logger.error("Token maintenance failed:", error instanceof Error ? error.message : String(error));
      }
    }, 30 * 60 * 1000); // 30 minutes

    // Initial token validation
    this.validateAndRefreshToken().catch(error => {
      Logger.error("Initial token validation failed:", error instanceof Error ? error.message : String(error));
    });
  }

  private async validateAndRefreshToken(): Promise<void> {
    if (!config.googleRefreshToken) {
      throw new Error("No refresh token available for validation");
    }

    try {
      // Force a token refresh by getting access token info
      const tokenInfo = await this.auth.getAccessToken();
      
      if (tokenInfo.token) {
        this.lastTokenRefresh = new Date();
        Logger.gmail(`Token validated and refreshed at ${this.lastTokenRefresh.toISOString()}`);
      } else {
        throw new Error("Failed to obtain access token");
      }
    } catch (error) {
      Logger.error("Token validation failed:", error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  // Add a method to manually refresh the token
  async refreshToken(): Promise<{ success: boolean; lastRefresh: Date; message: string }> {
    try {
      await this.validateAndRefreshToken();
      return {
        success: true,
        lastRefresh: this.lastTokenRefresh,
        message: "Token refreshed successfully"
      };
    } catch (error) {
      return {
        success: false,
        lastRefresh: this.lastTokenRefresh,
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // Add a method to get token status
  getTokenStatus(): { 
    hasRefreshToken: boolean; 
    lastRefresh: Date; 
    minutesSinceRefresh: number;
    maintenanceActive: boolean;
  } {
    const minutesSinceRefresh = (Date.now() - this.lastTokenRefresh.getTime()) / (1000 * 60);
    
    return {
      hasRefreshToken: !!config.googleRefreshToken,
      lastRefresh: this.lastTokenRefresh,
      minutesSinceRefresh: Math.round(minutesSinceRefresh),
      maintenanceActive: this.tokenRefreshInterval !== null
    };
  }

  // Cleanup method
  destroy() {
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
      this.tokenRefreshInterval = null;
      Logger.gmail("Token maintenance stopped");
    }
  }

  async listMessages(query?: string, maxResults: number = 10) {
    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults,
      });
      return response.data;
    } catch (error) {
      Logger.error('Error listing messages:', error);
      throw error;
    }
  }

  async getMessage(messageId: string) {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });
      return response.data;
    } catch (error) {
      Logger.error('Error getting message:', error);
      throw error;
    }
  }

  async sendMessage(to: string, subject: string, body: string, from?: string) {
    try {
      const email = [
        `To: ${to}`,
        from ? `From: ${from}` : '',
        `Subject: ${subject}`,
        '',
        body
      ].join('\n');

      const base64Email = Buffer.from(email).toString('base64');

      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: base64Email,
        },
      });
      return response.data;
    } catch (error) {
      Logger.error('Error sending message:', error);
      throw error;
    }
  }

  async markAsRead(messageId: string) {
    try {
      const response = await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['UNREAD'],
        },
      });
      return response.data;
    } catch (error) {
      Logger.error('Error marking message as read:', error);
      throw error;
    }
  }

  async markAsUnread(messageId: string) {
    try {
      const response = await this.gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          addLabelIds: ['UNREAD'],
        },
      });
      return response.data;
    } catch (error) {
      Logger.error('Error marking message as unread:', error);
      throw error;
    }
  }

  async getProfile() {
    try {
      const response = await this.gmail.users.getProfile({
        userId: 'me',
      });
      return response.data;
    } catch (error) {
      Logger.error('Error getting profile:', error);
      throw error;
    }
  }

  async searchMessages(query: string, maxResults: number = 50) {
    try {
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults,
      });

      if (!response.data.messages) {
        return [];
      }

      // Get full message details for each result
      const messages = await Promise.all(
        response.data.messages.map(async (message: any) => {
          const fullMessage = await this.getMessage(message.id);
          return {
            id: fullMessage.id,
            threadId: fullMessage.threadId,
            snippet: fullMessage.snippet,
            subject: this.getHeaderValue(fullMessage, 'Subject'),
            from: this.getHeaderValue(fullMessage, 'From'),
            to: this.getHeaderValue(fullMessage, 'To'),
            date: this.getHeaderValue(fullMessage, 'Date'),
            body: this.extractTextFromMessage(fullMessage),
          };
        })
      );

      return messages;
    } catch (error) {
      Logger.error('Error searching messages:', error);
      throw error;
    }
  }

  extractTextFromMessage(message: any): string {
    if (!message.payload) return '';

    if (message.payload.body && message.payload.body.data) {
      return Buffer.from(message.payload.body.data, 'base64').toString();
    }

    if (message.payload.parts) {
      for (const part of message.payload.parts) {
        if (part.mimeType === 'text/plain' && part.body && part.body.data) {
          return Buffer.from(part.body.data, 'base64').toString();
        }
      }
    }

    return '';
  }

  getHeaderValue(message: any, headerName: string): string {
    if (!message.payload || !message.payload.headers) return '';
    
    const header = message.payload.headers.find(
      (h: any) => h.name.toLowerCase() === headerName.toLowerCase()
    );
    
    return header ? header.value : '';
  }
} 