# Google Drive MCP Server

A comprehensive Model Context Protocol (MCP) server that provides full Google Drive API functionality for LLM applications.

## Features

- **File Operations**: List, get, download, upload, update, delete, copy, move files
- **Folder Management**: Create folders, get folder info and contents
- **Sharing & Permissions**: Share files, manage permissions, get sharing info
- **Search & Discovery**: Advanced search, recent files, query with filters
- **Comments & Collaboration**: Get comments, add comments
- **Revision History**: Access file revisions
- **Account Management**: Get account info, empty trash

## Installation

### Global Installation (Recommended for multiple machines)

```bash
npm install -g gdrive-mcp-server
```

### Local Development Installation

```bash
# Clone or download this repository
git clone https://github.com/igoralmeida1993/gdrive-mcp.git
cd gdrive-mcp-server

# Install dependencies
npm install

# Build the project
npm run build
```

## Setup

### 1. Google Cloud Console Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Drive API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Drive API"
   - Click "Enable"

### 2. Create Credentials

#### Option A: OAuth 2.0 (Recommended for personal use)

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Configure the consent screen if prompted
4. Choose "Desktop application" as the application type
5. Copy the Client ID and Client Secret

#### Option B: Service Account (For server-to-server)

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Fill in the service account details
4. Download the JSON key file
5. Extract the email and private key from the JSON

### 3. Configure Environment Variables

Copy the `env.example` file to `.env` and fill in your credentials:

```bash
cp env.example .env
```

## Environment Variables (.env file)

```bash
# Google Drive API Configuration
# Get these from Google Cloud Console (https://console.cloud.google.com/)

# OAuth 2.0 Client Credentials (for user authentication)
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here

# OAuth 2.0 Redirect URI (for authentication flow)
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback

# OAuth 2.0 Refresh Token (generated after first authentication)
GOOGLE_REFRESH_TOKEN=your_refresh_token_here

# Alternative: Service Account (for server-to-server authentication)
# GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
# GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----"

# MCP Server Configuration
MCP_SERVER_NAME=gdrive-mcp-server
MCP_SERVER_VERSION=1.0.0

# Optional: Default folder to operate in (leave empty for root)
DEFAULT_FOLDER_ID=

# Optional: File size limits (in bytes)
MAX_FILE_SIZE=104857600  # 100MB default
```

### 4. Get Refresh Token (OAuth 2.0 only)

If using OAuth 2.0, you need to generate a refresh token:

1. Use the Google OAuth 2.0 Playground: https://developers.google.com/oauthplayground/
2. In the configuration (gear icon), enter your Client ID and Client Secret
3. In Step 1, select "Drive API v3" scope: `https://www.googleapis.com/auth/drive`
4. Click "Authorize APIs" and follow the authorization flow
5. In Step 2, click "Exchange authorization code for tokens"
6. Copy the refresh token to your .env file

## Usage

### Running the Server

```bash
# If installed globally
gdrive-mcp-server

# If running from source
npm start

# For development
npm run dev
```

### Configuring with MCP Clients

Add to your MCP client configuration (e.g., Claude Desktop):

```json
{
  "mcpServers": {
    "gdrive": {
      "command": "gdrive-mcp-server",
      "env": {
        "GOOGLE_CLIENT_ID": "your_client_id",
        "GOOGLE_CLIENT_SECRET": "your_client_secret",
        "GOOGLE_REFRESH_TOKEN": "your_refresh_token"
      }
    }
  }
}
```

## Available Tools

### File Operations
- `gdrive_list_files` - List files and folders
- `gdrive_get_file` - Get file metadata
- `gdrive_download_file` - Download file content
- `gdrive_upload_file` - Upload new files
- `gdrive_update_file` - Update existing files
- `gdrive_delete_file` - Delete or trash files
- `gdrive_copy_file` - Copy files
- `gdrive_move_file` - Move files between folders

### Folder Operations
- `gdrive_create_folder` - Create new folders
- `gdrive_get_folder_info` - Get folder metadata and contents

### Sharing & Permissions
- `gdrive_share_file` - Share files with users
- `gdrive_get_permissions` - Get file permissions
- `gdrive_remove_permission` - Remove sharing permissions

### Search & Discovery
- `gdrive_search` - Advanced file search
- `gdrive_get_recent_files` - Get recently modified files

### Comments & Collaboration
- `gdrive_get_comments` - Get file comments
- `gdrive_add_comment` - Add comments to files

### Revision History
- `gdrive_get_revisions` - Get file revision history

### Utility
- `gdrive_get_about` - Get account information
- `gdrive_empty_trash` - Empty trash folder

## Example Usage

```javascript
// List files in root directory
{
  "tool": "gdrive_list_files",
  "arguments": {
    "maxResults": 50
  }
}

// Upload a text file
{
  "tool": "gdrive_upload_file",
  "arguments": {
    "name": "example.txt",
    "content": "Hello, World!",
    "mimeType": "text/plain"
  }
}

// Search for files
{
  "tool": "gdrive_search",
  "arguments": {
    "query": "presentation",
    "mimeType": "application/vnd.google-apps.presentation"
  }
}

// Share a file
{
  "tool": "gdrive_share_file",
  "arguments": {
    "fileId": "file_id_here",
    "email": "user@example.com",
    "role": "reader"
  }
}
```

## Security Notes

- Keep your credentials secure and never commit them to version control
- Use environment variables or secure credential management
- For production use, consider using service accounts with minimal required permissions
- Regularly rotate your credentials

## Troubleshooting

### Common Issues

1. **Authentication Error**: Ensure your credentials are correct and the Google Drive API is enabled
2. **Permission Denied**: Check that your OAuth scope includes Google Drive access
3. **File Not Found**: Verify file IDs and ensure you have access to the files
4. **Rate Limiting**: The Google Drive API has rate limits; the server handles retries automatically

### Getting Help

1. Check the Google Drive API documentation: https://developers.google.com/drive/api
2. Verify your Google Cloud Console configuration
3. Test your credentials using the Google APIs Explorer

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build
npm run build

# Run tests (if available)
npm test
```

## License

MIT License - see LICENSE file for details

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Changelog

### v1.0.0
- Initial release
- Full Google Drive API coverage
- MCP protocol implementation
- OAuth 2.0 and Service Account support 