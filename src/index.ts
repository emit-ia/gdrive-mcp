#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { GoogleDriveService } from "./google-drive.js";
import { GmailService } from "./gmail.js";
import { config } from "./config.js";
import { Logger } from "./logger.js";

class GoogleDriveMCPServer {
  private server: Server;
  private driveService: GoogleDriveService;
  private gmailService: GmailService;

  constructor() {
    this.server = new Server(
      {
        name: config.serverName,
        version: config.serverVersion,
      }
    );

    this.driveService = new GoogleDriveService();
    this.gmailService = new GmailService();
    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupToolHandlers() {
    // List all available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // File Operations
          {
            name: "gdrive_list_files",
            description: "List files and folders in Google Drive",
            inputSchema: {
              type: "object",
              properties: {
                folderId: {
                  type: "string",
                  description: "ID of folder to list (optional, defaults to root)",
                },
                query: {
                  type: "string",
                  description: "Search query to filter files",
                },
                maxResults: {
                  type: "number",
                  description: "Maximum number of results (default: 100)",
                  default: 100,
                },
                includeShared: {
                  type: "boolean",
                  description: "Include shared files (default: true)",
                  default: true,
                },
              },
            },
          },
          {
            name: "gdrive_get_file",
            description: "Get file metadata and download URL",
            inputSchema: {
              type: "object",
              properties: {
                fileId: {
                  type: "string",
                  description: "ID of the file to get",
                },
                includeContent: {
                  type: "boolean",
                  description: "Include file content for text files (default: false)",
                  default: false,
                },
              },
              required: ["fileId"],
            },
          },
          {
            name: "gdrive_download_file",
            description: "Download file content",
            inputSchema: {
              type: "object",
              properties: {
                fileId: {
                  type: "string",
                  description: "ID of the file to download",
                },
                format: {
                  type: "string",
                  description: "Export format for Google Docs (optional)",
                },
              },
              required: ["fileId"],
            },
          },
          {
            name: "gdrive_upload_file",
            description: "Upload a new file to Google Drive",
            inputSchema: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "Name of the file",
                },
                content: {
                  type: "string",
                  description: "File content (text files only)",
                },
                mimeType: {
                  type: "string",
                  description: "MIME type of the file",
                },
                parentId: {
                  type: "string",
                  description: "ID of parent folder (optional)",
                },
              },
              required: ["name", "content"],
            },
          },
          {
            name: "gdrive_update_file",
            description: "Update an existing file",
            inputSchema: {
              type: "object",
              properties: {
                fileId: {
                  type: "string",
                  description: "ID of the file to update",
                },
                name: {
                  type: "string",
                  description: "New name for the file (optional)",
                },
                content: {
                  type: "string",
                  description: "New content for the file (optional)",
                },
                mimeType: {
                  type: "string",
                  description: "New MIME type (optional)",
                },
              },
              required: ["fileId"],
            },
          },
          {
            name: "gdrive_delete_file",
            description: "Delete a file or move it to trash",
            inputSchema: {
              type: "object",
              properties: {
                fileId: {
                  type: "string",
                  description: "ID of the file to delete",
                },
                permanent: {
                  type: "boolean",
                  description: "Permanently delete (true) or move to trash (false)",
                  default: false,
                },
              },
              required: ["fileId"],
            },
          },
          {
            name: "gdrive_copy_file",
            description: "Create a copy of a file",
            inputSchema: {
              type: "object",
              properties: {
                fileId: {
                  type: "string",
                  description: "ID of the file to copy",
                },
                name: {
                  type: "string",
                  description: "Name for the copy (optional)",
                },
                parentId: {
                  type: "string",
                  description: "ID of parent folder for the copy (optional)",
                },
              },
              required: ["fileId"],
            },
          },
          {
            name: "gdrive_move_file",
            description: "Move a file to a different folder",
            inputSchema: {
              type: "object",
              properties: {
                fileId: {
                  type: "string",
                  description: "ID of the file to move",
                },
                newParentId: {
                  type: "string",
                  description: "ID of the new parent folder",
                },
                removeFromParents: {
                  type: "string",
                  description: "Comma-separated list of parent IDs to remove from",
                },
              },
              required: ["fileId", "newParentId"],
            },
          },
          // Folder Operations
          {
            name: "gdrive_create_folder",
            description: "Create a new folder",
            inputSchema: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "Name of the folder",
                },
                parentId: {
                  type: "string",
                  description: "ID of parent folder (optional)",
                },
              },
              required: ["name"],
            },
          },
          {
            name: "gdrive_get_folder_info",
            description: "Get folder metadata and contents",
            inputSchema: {
              type: "object",
              properties: {
                folderId: {
                  type: "string",
                  description: "ID of the folder",
                },
                includeFiles: {
                  type: "boolean",
                  description: "Include files in the response (default: true)",
                  default: true,
                },
              },
              required: ["folderId"],
            },
          },
          // Sharing and Permissions
          {
            name: "gdrive_share_file",
            description: "Share a file with specific users or make it public",
            inputSchema: {
              type: "object",
              properties: {
                fileId: {
                  type: "string",
                  description: "ID of the file to share",
                },
                email: {
                  type: "string",
                  description: "Email of user to share with (optional)",
                },
                role: {
                  type: "string",
                  description: "Permission role: owner, organizer, fileOrganizer, writer, commenter, reader",
                  enum: ["owner", "organizer", "fileOrganizer", "writer", "commenter", "reader"],
                  default: "reader",
                },
                type: {
                  type: "string",
                  description: "Permission type: user, group, domain, anyone",
                  enum: ["user", "group", "domain", "anyone"],
                  default: "user",
                },
                sendNotificationEmail: {
                  type: "boolean",
                  description: "Send notification email (default: true)",
                  default: true,
                },
              },
              required: ["fileId"],
            },
          },
          {
            name: "gdrive_get_permissions",
            description: "Get sharing permissions for a file",
            inputSchema: {
              type: "object",
              properties: {
                fileId: {
                  type: "string",
                  description: "ID of the file",
                },
              },
              required: ["fileId"],
            },
          },
          {
            name: "gdrive_remove_permission",
            description: "Remove a sharing permission",
            inputSchema: {
              type: "object",
              properties: {
                fileId: {
                  type: "string",
                  description: "ID of the file",
                },
                permissionId: {
                  type: "string",
                  description: "ID of the permission to remove",
                },
              },
              required: ["fileId", "permissionId"],
            },
          },
          // Search and Discovery
          {
            name: "gdrive_search",
            description: "Advanced search for files and folders",
            inputSchema: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "Search query (supports Google Drive search syntax)",
                },
                mimeType: {
                  type: "string",
                  description: "Filter by MIME type",
                },
                modifiedTime: {
                  type: "string",
                  description: "Filter by modification time (ISO 8601 format)",
                },
                owner: {
                  type: "string",
                  description: "Filter by owner email",
                },
                maxResults: {
                  type: "number",
                  description: "Maximum number of results (default: 100)",
                  default: 100,
                },
              },
            },
          },
          {
            name: "gdrive_get_recent_files",
            description: "Get recently modified files",
            inputSchema: {
              type: "object",
              properties: {
                maxResults: {
                  type: "number",
                  description: "Maximum number of results (default: 20)",
                  default: 20,
                },
                daysBack: {
                  type: "number",
                  description: "Number of days to look back (default: 7)",
                  default: 7,
                },
              },
            },
          },
          // Comments and Revisions
          {
            name: "gdrive_get_comments",
            description: "Get comments on a file",
            inputSchema: {
              type: "object",
              properties: {
                fileId: {
                  type: "string",
                  description: "ID of the file",
                },
                includeDeleted: {
                  type: "boolean",
                  description: "Include deleted comments (default: false)",
                  default: false,
                },
              },
              required: ["fileId"],
            },
          },
          {
            name: "gdrive_add_comment",
            description: "Add a comment to a file",
            inputSchema: {
              type: "object",
              properties: {
                fileId: {
                  type: "string",
                  description: "ID of the file",
                },
                content: {
                  type: "string",
                  description: "Comment content",
                },
                anchor: {
                  type: "string",
                  description: "Text anchor for the comment (optional)",
                },
              },
              required: ["fileId", "content"],
            },
          },
          {
            name: "gdrive_get_revisions",
            description: "Get revision history of a file",
            inputSchema: {
              type: "object",
              properties: {
                fileId: {
                  type: "string",
                  description: "ID of the file",
                },
              },
              required: ["fileId"],
            },
          },
          // Utility Functions
          {
            name: "gdrive_get_about",
            description: "Get information about the user's Drive account",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          {
            name: "gdrive_empty_trash",
            description: "Empty the trash folder",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          // Gmail Operations
          {
            name: "gmail_list_messages",
            description: "List Gmail messages with optional search query",
            inputSchema: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "Gmail search query (e.g., 'is:unread', 'from:example@gmail.com')",
                },
                maxResults: {
                  type: "number",
                  description: "Maximum number of messages to return (default: 10, max: 500)",
                  default: 10,
                },
              },
            },
          },
          {
            name: "gmail_get_message",
            description: "Get a specific Gmail message by ID",
            inputSchema: {
              type: "object",
              properties: {
                messageId: {
                  type: "string",
                  description: "ID of the message to retrieve",
                },
              },
              required: ["messageId"],
            },
          },
          {
            name: "gmail_send_message",
            description: "Send a Gmail message",
            inputSchema: {
              type: "object",
              properties: {
                to: {
                  type: "string",
                  description: "Recipient email address",
                },
                subject: {
                  type: "string",
                  description: "Email subject",
                },
                body: {
                  type: "string",
                  description: "Email body content",
                },
                from: {
                  type: "string",
                  description: "Sender email (optional, uses authenticated user by default)",
                },
              },
              required: ["to", "subject", "body"],
            },
          },
          {
            name: "gmail_mark_as_read",
            description: "Mark a Gmail message as read",
            inputSchema: {
              type: "object",
              properties: {
                messageId: {
                  type: "string",
                  description: "ID of the message to mark as read",
                },
              },
              required: ["messageId"],
            },
          },
          {
            name: "gmail_mark_as_unread",
            description: "Mark a Gmail message as unread",
            inputSchema: {
              type: "object",
              properties: {
                messageId: {
                  type: "string",
                  description: "ID of the message to mark as unread",
                },
              },
              required: ["messageId"],
            },
          },
          {
            name: "gmail_search_messages",
            description: "Search Gmail messages and return full message details",
            inputSchema: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "Gmail search query",
                },
                maxResults: {
                  type: "number",
                  description: "Maximum number of messages to return (default: 50)",
                  default: 50,
                },
              },
              required: ["query"],
            },
          },
          {
            name: "gmail_get_profile",
            description: "Get Gmail user profile information",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          // Token management tools
          {
            name: "gmail_check_token_status",
            description: "Check the status of Gmail authentication token",
            inputSchema: {
              type: "object",
              properties: {},
              required: [],
            },
          },
          {
            name: "gmail_refresh_token",
            description: "Manually refresh the Gmail authentication token to prevent expiration",
            inputSchema: {
              type: "object",
              properties: {},
              required: [],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        let result;

        switch (name) {
          case "gdrive_list_files":
            result = await this.driveService.listFiles(args || {});
            break;
          case "gdrive_get_file":
            result = await this.driveService.getFile(args as { fileId: string; includeContent?: boolean });
            break;
          case "gdrive_download_file":
            result = await this.driveService.downloadFile(args as { fileId: string; format?: string });
            break;
          case "gdrive_upload_file":
            result = await this.driveService.uploadFile(args as { name: string; content: string; mimeType?: string; parentId?: string });
            break;
          case "gdrive_update_file":
            result = await this.driveService.updateFile(args as { fileId: string; name?: string; content?: string; mimeType?: string });
            break;
          case "gdrive_delete_file":
            result = await this.driveService.deleteFile(args as { fileId: string; permanent?: boolean });
            break;
          case "gdrive_copy_file":
            result = await this.driveService.copyFile(args as { fileId: string; name?: string; parentId?: string });
            break;
          case "gdrive_move_file":
            result = await this.driveService.moveFile(args as { fileId: string; newParentId: string; removeFromParents?: string });
            break;
          case "gdrive_create_folder":
            result = await this.driveService.createFolder(args as { name: string; parentId?: string });
            break;
          case "gdrive_get_folder_info":
            result = await this.driveService.getFolderInfo(args as { folderId: string; includeFiles?: boolean });
            break;
          case "gdrive_share_file":
            result = await this.driveService.shareFile(args as { fileId: string; email?: string; role?: string; type?: string; sendNotificationEmail?: boolean });
            break;
          case "gdrive_get_permissions":
            result = await this.driveService.getPermissions(args as { fileId: string });
            break;
          case "gdrive_remove_permission":
            result = await this.driveService.removePermission(args as { fileId: string; permissionId: string });
            break;
          case "gdrive_search":
            result = await this.driveService.search(args || {});
            break;
          case "gdrive_get_recent_files":
            result = await this.driveService.getRecentFiles(args || {});
            break;
          case "gdrive_get_comments":
            result = await this.driveService.getComments(args as { fileId: string; includeDeleted?: boolean });
            break;
          case "gdrive_add_comment":
            result = await this.driveService.addComment(args as { fileId: string; content: string; anchor?: string });
            break;
          case "gdrive_get_revisions":
            result = await this.driveService.getRevisions(args as { fileId: string });
            break;
          case "gdrive_get_about":
            result = await this.driveService.getAbout();
            break;
          case "gdrive_empty_trash":
            result = await this.driveService.emptyTrash();
            break;
          case "gmail_list_messages":
            result = await this.gmailService.listMessages((args as any)?.query, (args as any)?.maxResults);
            break;
          case "gmail_get_message":
            result = await this.gmailService.getMessage((args as { messageId: string }).messageId);
            break;
          case "gmail_send_message":
            result = await this.gmailService.sendMessage(
              (args as { to: string; subject: string; body: string; from?: string }).to,
              (args as { to: string; subject: string; body: string; from?: string }).subject,
              (args as { to: string; subject: string; body: string; from?: string }).body,
              (args as { to: string; subject: string; body: string; from?: string }).from
            );
            break;
          case "gmail_mark_as_read":
            result = await this.gmailService.markAsRead((args as { messageId: string }).messageId);
            break;
          case "gmail_mark_as_unread":
            result = await this.gmailService.markAsUnread((args as { messageId: string }).messageId);
            break;
          case "gmail_search_messages":
            result = await this.gmailService.searchMessages(
              (args as { query: string; maxResults?: number }).query,
              (args as { query: string; maxResults?: number }).maxResults
            );
            break;
          case "gmail_get_profile":
            result = await this.gmailService.getProfile();
            break;
          case "gmail_check_token_status":
            result = this.gmailService.getTokenStatus();
            break;
          case "gmail_refresh_token":
            result = await this.gmailService.refreshToken();
            break;
          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private setupErrorHandling() {
    this.server.onerror = (error: unknown) => {
      Logger.error("MCP Server Error:", error);
    };

    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    Logger.info("Google Drive MCP server running on stdio");
  }
}

// Start the server
const server = new GoogleDriveMCPServer();
server.run().catch((error) => {
  Logger.error("Failed to start server:", error);
  process.exit(1);
});