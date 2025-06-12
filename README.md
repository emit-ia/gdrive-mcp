# Google Drive & Gmail MCP Server

Model Context Protocol server for Google Drive and Gmail APIs with hybrid authentication.

## Key Features

- **Hybrid Authentication**: Service Account (Drive) + OAuth2 (Gmail)
- **Automatic Token Management**: Prevents 6-month Gmail token expiration
- **Complete API Coverage**: Full Google Drive and Gmail functionality

## API Coverage

**Google Drive**: Files, folders, sharing, search, comments, revisions, account info  
**Gmail**: Messages, sending, search, read/unread, profile, token management

## Installation

```bash
# Global installation
npm install -g gdrive-mcp-server

# Or run directly with npx (recommended)
npx gdrive-mcp-server

# Or local development
git clone https://github.com/igoralmeida1993/gdrive-mcp.git
cd gdrive-mcp
npm install && npm run build
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

**Service Account** (for Google Drive):
1. Google Cloud Console > "Credentials" > "Service Account"
2. Download JSON key, extract `client_email` and `private_key`

**OAuth 2.0** (for Gmail):
1. Google Cloud Console > "Credentials" > "OAuth 2.0 Client IDs"
2. Desktop application type
3. Generate refresh token via [OAuth Playground](https://developers.google.com/oauthplayground)

> See [HYBRID-AUTH-SETUP.md](./HYBRID-AUTH-SETUP.md) for detailed steps.

### 3. Configure Environment

```bash
cp env.example .env
# Edit .env with your credentials
```

## Environment Variables (.env file)

```bash
# Google Drive & Gmail MCP Server Configuration
# Get these from Google Cloud Console (https://console.cloud.google.com/)

# OAuth 2.0 Credentials (REQUIRED for Gmail functionality)
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=https://developers.google.com/oauthplayground
GOOGLE_REFRESH_TOKEN=your_refresh_token_here

# Service Account Credentials (REQUIRED for Google Drive functionality)
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----"

# MCP Server Configuration
MCP_SERVER_NAME=gdrive-mcp-server
MCP_SERVER_VERSION=1.0.0

# Optional: Default folder to operate in (leave empty for root)
DEFAULT_FOLDER_ID=

# Optional: File size limits (in bytes)
MAX_FILE_SIZE=104857600  # 100MB default
```


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

### 4. MCP Client Configuration

Claude Desktop configuration:
```json
{
  "mcpServers": {
    "google-workspace": {
      "command": "npx",
      "args": ["gdrive-mcp-server"],
      "env": {
        "GOOGLE_CLIENT_ID": "your_client_id",
        "GOOGLE_CLIENT_SECRET": "your_client_secret",
        "GOOGLE_REFRESH_TOKEN": "your_refresh_token",
        "GOOGLE_SERVICE_ACCOUNT_EMAIL": "your-service-account@project.iam.gserviceaccount.com",
        "GOOGLE_PRIVATE_KEY": "-----BEGIN PRIVATE KEY-----\nYour private key\n-----END PRIVATE KEY-----"
      }
    }
  }
}
```

## Available Tools

**Google Drive**: `gdrive_list_files`, `gdrive_get_file`, `gdrive_download_file`, `gdrive_upload_file`, `gdrive_update_file`, `gdrive_delete_file`, `gdrive_copy_file`, `gdrive_move_file`, `gdrive_create_folder`, `gdrive_get_folder_info`, `gdrive_share_file`, `gdrive_get_permissions`, `gdrive_remove_permission`, `gdrive_search`, `gdrive_get_recent_files`, `gdrive_get_comments`, `gdrive_add_comment`, `gdrive_get_revisions`, `gdrive_get_about`, `gdrive_empty_trash`

**Gmail**: `gmail_list_messages`, `gmail_get_message`, `gmail_send_message`, `gmail_search_messages`, `gmail_mark_as_read`, `gmail_mark_as_unread`, `gmail_get_profile`, `gmail_check_token_status`, `gmail_refresh_token`

## Usage Examples

```javascript
// List Drive files
{ "tool": "gdrive_list_files", "arguments": { "maxResults": 50 } }

// Upload file
{ "tool": "gdrive_upload_file", "arguments": { "name": "test.txt", "content": "Hello" } }

// Send email
{ "tool": "gmail_send_message", "arguments": { "to": "user@example.com", "subject": "Test", "body": "Hello!" } }

// Search emails
{ "tool": "gmail_search_messages", "arguments": { "query": "is:unread", "maxResults": 10 } }
```

## Security

- Never commit `.env` files to version control
- Use environment variables in production
- Server automatically refreshes Gmail tokens
- Use minimal required OAuth scopes

## Troubleshooting

### Common Issues

- **"Gmail requires OAuth2"**: Set OAuth credentials in .env
- **"Drive requires Service Account"**: Set Service Account credentials in .env
- **Authentication Error**: Verify credentials and enable APIs in Google Cloud Console
- **Token Expired**: Use `gmail_check_token_status` and `gmail_refresh_token`

### Help

- [HYBRID-AUTH-SETUP.md](./HYBRID-AUTH-SETUP.md) - Detailed setup guide
- [Google Drive API Docs](https://developers.google.com/drive/api)
- [Gmail API Docs](https://developers.google.com/gmail/api)

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

## License

MIT

 