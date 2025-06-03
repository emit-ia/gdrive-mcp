import { google } from 'googleapis';
import { config } from './config.js';

export class GmailService {
  private gmail: any;
  private auth: any;

  constructor() {
    this.initializeAuth();
    this.gmail = google.gmail({ version: 'v1', auth: this.auth });
  }

  private initializeAuth() {
    if (config.googleServiceAccountEmail && config.googlePrivateKey) {
      // Service Account authentication
      this.auth = new google.auth.JWT(
        config.googleServiceAccountEmail,
        undefined,
        config.googlePrivateKey,
        [
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/gmail.send',
          'https://www.googleapis.com/auth/gmail.modify',
          'https://www.googleapis.com/auth/gmail.compose'
        ]
      );
    } else {
      // OAuth2 authentication
      this.auth = new google.auth.OAuth2(
        config.googleClientId,
        config.googleClientSecret,
        config.googleRedirectUri
      );

      if (config.googleRefreshToken) {
        this.auth.setCredentials({
          refresh_token: config.googleRefreshToken,
        });
      }
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
      console.error('Error listing messages:', error);
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
      console.error('Error getting message:', error);
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
      console.error('Error sending message:', error);
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
      console.error('Error marking message as read:', error);
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
      console.error('Error marking message as unread:', error);
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
      console.error('Error getting profile:', error);
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

      // Get full message details for each message
      const messages = await Promise.all(
        response.data.messages.map(async (message: any) => {
          return await this.getMessage(message.id);
        })
      );

      return messages;
    } catch (error) {
      console.error('Error searching messages:', error);
      throw error;
    }
  }

  extractTextFromMessage(message: any): string {
    if (message.payload.body.data) {
      return Buffer.from(message.payload.body.data, 'base64').toString();
    }

    if (message.payload.parts) {
      for (const part of message.payload.parts) {
        if (part.mimeType === 'text/plain' && part.body.data) {
          return Buffer.from(part.body.data, 'base64').toString();
        }
        if (part.mimeType === 'text/html' && part.body.data) {
          return Buffer.from(part.body.data, 'base64').toString();
        }
      }
    }

    return '';
  }

  getHeaderValue(message: any, headerName: string): string {
    const header = message.payload.headers.find(
      (h: any) => h.name.toLowerCase() === headerName.toLowerCase()
    );
    return header ? header.value : '';
  }
} 