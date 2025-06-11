/**
 * Gmail Service for MCP Server
 * 
 * This service provides Gmail operations using OAuth2 authentication with automatic
 * token management to prevent the common 6-month expiration issues. It includes
 * message listing, sending, reading, searching, and profile management.
 */

import { google } from 'googleapis';
import { config } from './config.js';
import { Logger } from './logger.js';

/**
 * Gmail service class that handles all Gmail API operations
 * 
 * Uses OAuth2 authentication (required for personal Gmail access) with automatic
 * token refresh to maintain long-term connectivity without user intervention.
 */
export class GmailService {
  private gmail: any;
  private auth: any;
  private lastTokenRefresh: Date = new Date();
  private tokenRefreshInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Set up OAuth2 authentication for Gmail access
    this.initializeAuth();
    
    // Initialize Gmail API client
    this.gmail = google.gmail({ version: 'v1', auth: this.auth });
    
    // Start automatic token maintenance to prevent expiration
    this.setupTokenMaintenance();
  }

  /**
   * Initialize OAuth2 authentication for Gmail
   * 
   * OAuth2 is required for personal Gmail access (Service Accounts don't work
   * well with personal Gmail accounts). This sets up the auth client and
   * configures the refresh token if available.
   */
  private initializeAuth() {
    // Require OAuth2 credentials for Gmail access
    if (!config.googleClientId || !config.googleClientSecret) {
      throw new Error(
        "Gmail requires OAuth2 authentication. Please set:\n" +
        "- GOOGLE_CLIENT_ID\n" +
        "- GOOGLE_CLIENT_SECRET\n" +
        "- GOOGLE_REFRESH_TOKEN (optional but recommended)\n\n" +
        "Service accounts cannot access personal Gmail accounts."
      );
    }

    // Create OAuth2 client with configured credentials
    this.auth = new google.auth.OAuth2(
      config.googleClientId,
      config.googleClientSecret,
      config.googleRedirectUri
    );

    // Set refresh token if available for automatic token renewal
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

  /**
   * Set up automatic token maintenance to prevent Gmail token expiration
   * 
   * This is crucial for long-running applications as Gmail tokens typically
   * expire after 6 months if not refreshed regularly. We refresh every 30 minutes
   * to keep the token active and avoid authentication issues.
   */
  private setupTokenMaintenance() {
    if (!config.googleRefreshToken) {
      Logger.gmail("No refresh token available - token maintenance disabled");
      return;
    }

    // Refresh token every 30 minutes to keep it active and prevent expiration
    this.tokenRefreshInterval = setInterval(async () => {
      try {
        await this.validateAndRefreshToken();
        Logger.gmail("Token refreshed successfully during maintenance");
      } catch (error) {
        Logger.error("Token maintenance failed:", error instanceof Error ? error.message : String(error));
      }
    }, 30 * 60 * 1000); // 30 minutes

    // Perform initial token validation on startup
    this.validateAndRefreshToken().catch(error => {
      Logger.error("Initial token validation failed:", error instanceof Error ? error.message : String(error));
    });
  }

  /**
   * Validate and refresh the Gmail access token
   * 
   * This method forces a token refresh by requesting a new access token,
   * which keeps the refresh token active and prevents expiration.
   */
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

  /**
   * Manually refresh the Gmail access token
   * 
   * This method allows external callers to force a token refresh,
   * useful for troubleshooting or ensuring fresh credentials.
   */
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

  /**
   * Get the current status of the Gmail authentication token
   * 
   * This provides visibility into token health and maintenance status,
   * useful for monitoring and troubleshooting authentication issues.
   */
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

  /**
   * Clean up resources and stop token maintenance
   * 
   * This method should be called when the service is no longer needed
   * to prevent memory leaks from the token refresh interval.
   */
  destroy() {
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
      this.tokenRefreshInterval = null;
      Logger.gmail("Token maintenance stopped");
    }
  }

  /**
   * List Gmail messages with optional search query
   * 
   * @param query - Gmail search query (e.g., 'is:unread', 'from:example@gmail.com')
   * @param maxResults - Maximum number of messages to return
   * @returns Promise resolving to message list
   */
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

  /**
   * Get a specific Gmail message by ID
   * 
   * @param messageId - The ID of the message to retrieve
   * @returns Promise resolving to full message details
   */
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

  /**
   * Send a Gmail message
   * 
   * @param to - Recipient email address
   * @param subject - Email subject line
   * @param body - Email body content
   * @param from - Optional sender email (uses authenticated user by default)
   * @returns Promise resolving to sent message details
   */
  async sendMessage(to: string, subject: string, body: string, from?: string) {
    try {
      // Construct RFC 2822 email format
      const email = [
        `To: ${to}`,
        from ? `From: ${from}` : '',
        `Subject: ${subject}`,
        '',
        body
      ].join('\n');

      // Encode email in base64 for Gmail API
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

  /**
   * Search Gmail messages and return full message details
   * 
   * @param query - Gmail search query
   * @param maxResults - Maximum number of messages to return
   * @returns Promise resolving to array of detailed message objects
   */
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

  /**
   * Extract plain text content from a Gmail message
   * 
   * Gmail messages can have complex structure with multiple parts.
   * This method finds and decodes the plain text content.
   * 
   * @param message - The Gmail message object
   * @returns The extracted plain text content
   */
  extractTextFromMessage(message: any): string {
    if (!message.payload) return '';

    // Check if message has direct body content
    if (message.payload.body && message.payload.body.data) {
      return Buffer.from(message.payload.body.data, 'base64').toString();
    }

    // Check message parts for plain text content
    if (message.payload.parts) {
      for (const part of message.payload.parts) {
        if (part.mimeType === 'text/plain' && part.body && part.body.data) {
          return Buffer.from(part.body.data, 'base64').toString();
        }
      }
    }

    return '';
  }

  /**
   * Extract a specific header value from a Gmail message
   * 
   * @param message - The Gmail message object
   * @param headerName - The name of the header to extract (case-insensitive)
   * @returns The header value or empty string if not found
   */
  getHeaderValue(message: any, headerName: string): string {
    if (!message.payload || !message.payload.headers) return '';
    
    const header = message.payload.headers.find(
      (h: any) => h.name.toLowerCase() === headerName.toLowerCase()
    );
    
    return header ? header.value : '';
  }
} 