/**
 * Google Drive Service for MCP Server
 * 
 * This service provides comprehensive Google Drive operations using Service Account
 * authentication for reliable, non-expiring access. It includes file management,
 * folder operations, sharing/permissions, search, comments, and more.
 */

import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { config, validateCredentials } from "./config.js";

/**
 * Google Drive service class that handles all Drive API operations
 * 
 * Uses Service Account authentication for reliable access without token expiration.
 * Provides a complete set of file and folder management operations.
 */
export class GoogleDriveService {
  private auth: any;
  private drive: any;

  constructor() {
    // Validate credentials before attempting to initialize
    validateCredentials();

    // Set up authentication and initialize the Drive API client
    this.initializeAuth();
    this.drive = google.drive({ version: "v3", auth: this.auth });
  }

  /**
   * Initialize Service Account authentication for Google Drive
   * 
   * Service Account authentication is preferred over OAuth2 for Google Drive
   * because it provides reliable, non-expiring access without user intervention.
   */
  private initializeAuth() {
    // Require Service Account credentials for Google Drive access
    if (!config.googleServiceAccountEmail || !config.googlePrivateKey) {
      throw new Error(
        "Google Drive requires Service Account authentication. Please set:\n" +
        "- GOOGLE_SERVICE_ACCOUNT_EMAIL\n" +
        "- GOOGLE_PRIVATE_KEY\n\n" +
        "Service accounts provide reliable, non-expiring access to Google Drive."
      );
    }

    // Create JWT client with Drive API scope
    this.auth = new google.auth.JWT(
      config.googleServiceAccountEmail,
      undefined,
      config.googlePrivateKey,
      ['https://www.googleapis.com/auth/drive']
    );
  }

  /**
   * List files and folders in Google Drive
   * 
   * @param args - Search parameters including folder, query, limits, and sharing options
   * @returns Promise resolving to file list with metadata
   */
  async listFiles(args: any = {}) {
    const {
      folderId,
      query,
      maxResults = 100,
      includeShared = true,
    } = args;

    // Build Google Drive search query based on parameters
    let searchQuery = "trashed=false";
    
    if (folderId) {
      searchQuery += ` and '${folderId}' in parents`;
    }
    
    if (query) {
      searchQuery += ` and (name contains '${query}' or fullText contains '${query}')`;
    }

    if (!includeShared) {
      searchQuery += " and 'me' in owners";
    }

    try {
      const response = await this.drive.files.list({
        q: searchQuery,
        pageSize: Math.min(maxResults, 1000),
        fields: "nextPageToken, files(id, name, mimeType, size, modifiedTime, createdTime, parents, owners, shared, webViewLink, webContentLink)",
        orderBy: "modifiedTime desc",
      });

      return {
        files: response.data.files || [],
        nextPageToken: response.data.nextPageToken,
        totalCount: response.data.files?.length || 0,
      };
    } catch (error) {
      throw new Error(`Failed to list files: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get detailed information about a specific file
   * 
   * @param args - File ID and optional content inclusion flag
   * @returns Promise resolving to file metadata and optionally content
   */
  async getFile(args: { fileId: string; includeContent?: boolean }) {
    const { fileId, includeContent = false } = args;

    try {
      const response = await this.drive.files.get({
        fileId,
        fields: "id, name, mimeType, size, modifiedTime, createdTime, parents, owners, shared, webViewLink, webContentLink, description, properties",
      });

      const file = response.data;

      // Optionally include file content for text files
      if (includeContent && this.isTextFile(file.mimeType)) {
        try {
          const contentResponse = await this.drive.files.get({
            fileId,
            alt: "media",
          });
          file.content = contentResponse.data;
        } catch (contentError) {
          file.contentError = "Failed to retrieve file content";
        }
      }

      return file;
    } catch (error) {
      throw new Error(`Failed to get file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Download file content, handling both regular files and Google Workspace documents
   * 
   * @param args - File ID and optional export format for Google Workspace files
   * @returns Promise resolving to file content and metadata
   */
  async downloadFile(args: { fileId: string; format?: string }) {
    const { fileId, format } = args;

    try {
      const fileInfo = await this.drive.files.get({
        fileId,
        fields: "mimeType, name",
      });

      let response;
      
      // Handle Google Workspace files that need to be exported
      if (this.isGoogleWorkspaceFile(fileInfo.data.mimeType)) {
        const exportFormat = format || this.getDefaultExportFormat(fileInfo.data.mimeType);
        response = await this.drive.files.export({
          fileId,
          mimeType: exportFormat,
        });
      } else {
        // Regular files can be downloaded directly
        response = await this.drive.files.get({
          fileId,
          alt: "media",
        });
      }

      return {
        fileName: fileInfo.data.name,
        mimeType: fileInfo.data.mimeType,
        content: response.data,
        size: response.data.length || 0,
      };
    } catch (error) {
      throw new Error(`Failed to download file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Upload a new file to Google Drive
   * 
   * @param args - File name, content, MIME type, and optional parent folder
   * @returns Promise resolving to uploaded file metadata
   */
  async uploadFile(args: { name: string; content: string; mimeType?: string; parentId?: string }) {
    const { name, content, mimeType = "text/plain", parentId } = args;

    const fileMetadata: any = {
      name,
    };

    if (parentId) {
      fileMetadata.parents = [parentId];
    }

    const media = {
      mimeType,
      body: content,
    };

    try {
      const response = await this.drive.files.create({
        resource: fileMetadata,
        media,
        fields: "id, name, mimeType, size, webViewLink",
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async updateFile(args: { fileId: string; name?: string; content?: string; mimeType?: string }) {
    const { fileId, name, content, mimeType } = args;

    const fileMetadata: any = {};
    if (name) fileMetadata.name = name;

    const media: any = {};
    if (content !== undefined) {
      media.body = content;
      if (mimeType) media.mimeType = mimeType;
    }

    try {
      const response = await this.drive.files.update({
        fileId,
        resource: fileMetadata,
        media: Object.keys(media).length > 0 ? media : undefined,
        fields: "id, name, mimeType, size, modifiedTime, webViewLink",
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to update file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async deleteFile(args: { fileId: string; permanent?: boolean }) {
    const { fileId, permanent = false } = args;

    try {
      if (permanent) {
        await this.drive.files.delete({ fileId });
        return { success: true, message: "File permanently deleted" };
      } else {
        await this.drive.files.update({
          fileId,
          resource: { trashed: true },
        });
        return { success: true, message: "File moved to trash" };
      }
    } catch (error) {
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async copyFile(args: { fileId: string; name?: string; parentId?: string }) {
    const { fileId, name, parentId } = args;

    const fileMetadata: any = {};
    if (name) fileMetadata.name = name;
    if (parentId) fileMetadata.parents = [parentId];

    try {
      const response = await this.drive.files.copy({
        fileId,
        resource: fileMetadata,
        fields: "id, name, mimeType, parents, webViewLink",
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to copy file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async moveFile(args: { fileId: string; newParentId: string; removeFromParents?: string }) {
    const { fileId, newParentId, removeFromParents } = args;

    try {
      // Get current parents if we need to remove from specific ones
      let removeParents = removeFromParents;
      if (!removeParents) {
        const file = await this.drive.files.get({
          fileId,
          fields: "parents",
        });
        removeParents = file.data.parents?.join(",");
      }

      const response = await this.drive.files.update({
        fileId,
        addParents: newParentId,
        removeParents,
        fields: "id, name, parents",
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to move file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async createFolder(args: { name: string; parentId?: string }) {
    const { name, parentId } = args;

    const fileMetadata: any = {
      name,
      mimeType: "application/vnd.google-apps.folder",
    };

    if (parentId) {
      fileMetadata.parents = [parentId];
    }

    try {
      const response = await this.drive.files.create({
        resource: fileMetadata,
        fields: "id, name, mimeType, parents, webViewLink",
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to create folder: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getFolderInfo(args: { folderId: string; includeFiles?: boolean }) {
    const { folderId, includeFiles = true } = args;

    try {
      // Get folder metadata
      const folderResponse = await this.drive.files.get({
        fileId: folderId,
        fields: "id, name, mimeType, modifiedTime, createdTime, parents, shared, webViewLink",
      });

      const folder = folderResponse.data;

      if (includeFiles) {
        // Get folder contents
        const filesResponse = await this.listFiles({ folderId });
        folder.files = filesResponse.files;
        folder.fileCount = filesResponse.totalCount;
      }

      return folder;
    } catch (error) {
      throw new Error(`Failed to get folder info: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async shareFile(args: { fileId: string; email?: string; role?: string; type?: string; sendNotificationEmail?: boolean }) {
    const {
      fileId,
      email,
      role = "reader",
      type = "user",
      sendNotificationEmail = true,
    } = args;

    const permission: any = {
      role,
      type,
    };

    if (email && type === "user") {
      permission.emailAddress = email;
    }

    try {
      const response = await this.drive.permissions.create({
        fileId,
        resource: permission,
        sendNotificationEmail,
        fields: "id, role, type, emailAddress, displayName",
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to share file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getPermissions(args: { fileId: string }) {
    const { fileId } = args;

    try {
      const response = await this.drive.permissions.list({
        fileId,
        fields: "permissions(id, role, type, emailAddress, displayName, expirationTime)",
      });

      return {
        permissions: response.data.permissions || [],
      };
    } catch (error) {
      throw new Error(`Failed to get permissions: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async removePermission(args: { fileId: string; permissionId: string }) {
    const { fileId, permissionId } = args;

    try {
      await this.drive.permissions.delete({
        fileId,
        permissionId,
      });

      return { success: true, message: "Permission removed" };
    } catch (error) {
      throw new Error(`Failed to remove permission: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async search(args: any = {}) {
    const {
      query,
      mimeType,
      modifiedTime,
      owner,
      maxResults = 100,
    } = args;

    let searchQuery = "trashed=false";

    if (query) {
      searchQuery += ` and (name contains '${query}' or fullText contains '${query}')`;
    }

    if (mimeType) {
      searchQuery += ` and mimeType='${mimeType}'`;
    }

    if (modifiedTime) {
      searchQuery += ` and modifiedTime > '${modifiedTime}'`;
    }

    if (owner) {
      searchQuery += ` and '${owner}' in owners`;
    }

    try {
      const response = await this.drive.files.list({
        q: searchQuery,
        pageSize: Math.min(maxResults, 1000),
        fields: "nextPageToken, files(id, name, mimeType, size, modifiedTime, createdTime, owners, webViewLink)",
        orderBy: "relevance",
      });

      return {
        files: response.data.files || [],
        query: searchQuery,
        totalCount: response.data.files?.length || 0,
      };
    } catch (error) {
      throw new Error(`Failed to search files: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getRecentFiles(args: { maxResults?: number; daysBack?: number } = {}) {
    const { maxResults = 20, daysBack = 7 } = args;

    const date = new Date();
    date.setDate(date.getDate() - daysBack);
    const modifiedTime = date.toISOString();

    return this.search({
      modifiedTime,
      maxResults,
    });
  }

  async getComments(args: { fileId: string; includeDeleted?: boolean }) {
    const { fileId, includeDeleted = false } = args;

    try {
      const response = await this.drive.comments.list({
        fileId,
        includeDeleted,
        fields: "comments(id, content, createdTime, modifiedTime, author, replies)",
      });

      return {
        comments: response.data.comments || [],
      };
    } catch (error) {
      throw new Error(`Failed to get comments: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async addComment(args: { fileId: string; content: string; anchor?: string }) {
    const { fileId, content, anchor } = args;

    const comment: any = {
      content,
    };

    if (anchor) {
      comment.anchor = anchor;
    }

    try {
      const response = await this.drive.comments.create({
        fileId,
        resource: comment,
        fields: "id, content, createdTime, author",
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to add comment: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getRevisions(args: { fileId: string }) {
    const { fileId } = args;

    try {
      const response = await this.drive.revisions.list({
        fileId,
        fields: "revisions(id, modifiedTime, size, originalFilename, mimeType)",
      });

      return {
        revisions: response.data.revisions || [],
      };
    } catch (error) {
      throw new Error(`Failed to get revisions: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async getAbout() {
    try {
      const response = await this.drive.about.get({
        fields: "user, storageQuota, importFormats, exportFormats, maxImportSizes, maxUploadSize",
      });

      return response.data;
    } catch (error) {
      throw new Error(`Failed to get account info: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async emptyTrash() {
    try {
      await this.drive.files.emptyTrash();
      return { success: true, message: "Trash emptied successfully" };
    } catch (error) {
      throw new Error(`Failed to empty trash: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Helper methods for file type detection and format conversion
  
  /**
   * Check if a MIME type represents a text file that can be read as content
   * 
   * @param mimeType - The MIME type to check
   * @returns True if the file is a readable text file
   */
  private isTextFile(mimeType: string): boolean {
    const textMimeTypes = [
      "text/plain",
      "text/html",
      "text/css",
      "text/javascript",
      "application/json",
      "application/xml",
      "text/xml",
      "text/csv",
      "text/markdown",
    ];
    return textMimeTypes.includes(mimeType) || mimeType.startsWith("text/");
  }

  /**
   * Check if a file is a Google Workspace document that requires export
   * 
   * @param mimeType - The MIME type to check
   * @returns True if the file is a Google Workspace document
   */
  private isGoogleWorkspaceFile(mimeType: string): boolean {
    return mimeType.startsWith("application/vnd.google-apps.");
  }

  /**
   * Get the default export format for Google Workspace files
   * 
   * @param mimeType - The Google Workspace MIME type
   * @returns The appropriate export format MIME type
   */
  private getDefaultExportFormat(mimeType: string): string {
    const exportFormats: { [key: string]: string } = {
      "application/vnd.google-apps.document": "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // Word .docx
      "application/vnd.google-apps.spreadsheet": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // Excel .xlsx
      "application/vnd.google-apps.presentation": "application/vnd.openxmlformats-officedocument.presentationml.presentation", // PowerPoint .pptx
      "application/vnd.google-apps.drawing": "image/png", // PNG image
      "application/vnd.google-apps.script": "application/vnd.google-apps.script+json", // Apps Script JSON
    };

    return exportFormats[mimeType] || "application/pdf"; // Default to PDF
  }
} 