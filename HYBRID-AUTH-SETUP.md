# Hybrid Authentication Setup Guide

This MCP server uses **hybrid authentication** for optimal functionality:

- **🔐 OAuth2** for Gmail (required for personal Gmail access)
- **🛡️ Service Account** for Google Drive (reliable, no expiration)

## Why Hybrid Authentication?

| Feature | OAuth2 (Gmail) | Service Account (Drive) |
|---------|----------------|-------------------------|
| **Personal Gmail Access** | ✅ Yes | ❌ No |
| **Token Expiration** | ⚠️ Yes (handled via refresh) | ✅ Never expires |
| **User Consent Required** | ✅ Yes | ❌ No |
| **Reliability** | ⚠️ Depends on refresh token | ✅ Very reliable |
| **Setup Complexity** | ⚠️ Moderate | ✅ Simple |

## 📋 Prerequisites

- Google Cloud Console account
- Google account (for OAuth setup)

## 🔧 Setup Instructions

### Part 1: Service Account Setup (Google Drive)

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create or Select Project**
3. **Enable Google Drive API**:
   - Go to "APIs & Services" > "Enabled APIs"
   - Click "+ Enable APIs and Services"
   - Search for "Google Drive API" and enable it

4. **Create Service Account**:
   - Go to "IAM & Admin" > "Service Accounts"
   - Click "Create Service Account"
   - Name: `google-drive-mcp-server`
   - Description: `Service account for MCP Google Drive access`
   - Click "Create and Continue"

5. **Download Service Account Key**:
   - Click on your service account
   - Go to "Keys" tab
   - Click "Add Key" > "Create new key"
   - Choose "JSON" format
   - Download the file

6. **Extract Credentials from JSON**:
   ```json
   {
     "client_email": "your-service-account@project.iam.gserviceaccount.com",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   }
   ```

### Part 2: OAuth2 Setup (Gmail)

1. **Configure OAuth Consent Screen**:
   - Go to "APIs & Services" > "OAuth consent screen"
   - Choose "External" (unless you have Google Workspace)
   - Fill in required fields:
     - App name: `Google Drive MCP Server`
     - User support email: your email
     - Developer contact: your email
   - Add scopes:
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/gmail.send`
     - `https://www.googleapis.com/auth/gmail.modify`

2. **Create OAuth2 Credentials**:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Application type: "Desktop application"
   - Name: `Gmail MCP Client`
   - Download the credentials JSON

3. **Extract OAuth Credentials**:
   ```json
   {
     "client_id": "your-client-id.googleusercontent.com",
     "client_secret": "your-client-secret"
   }
   ```

4. **Generate Refresh Token**:
   - Go to: https://developers.google.com/oauthplayground
   - Click gear icon (⚙️) in top right
   - Check "Use your own OAuth credentials"
   - Enter your Client ID and Client Secret
   - In left panel, expand "Gmail API v1"
   - Select these scopes:
     - `https://www.googleapis.com/auth/gmail.readonly`
     - `https://www.googleapis.com/auth/gmail.send`
     - `https://www.googleapis.com/auth/gmail.modify`
   - Click "Authorize APIs"
   - Sign in with your Google account
   - Click "Exchange authorization code for tokens"
   - Copy the "Refresh token"

## 🔐 Environment Configuration

Create your `.env` file with BOTH sets of credentials:

```env
# OAuth2 Credentials (for Gmail)
GOOGLE_CLIENT_ID=your-client-id.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REFRESH_TOKEN=your-refresh-token
GOOGLE_REDIRECT_URI=https://developers.google.com/oauthplayground

# Service Account Credentials (for Google Drive)
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----"
```

## 🧪 Testing Your Setup

Build and test the server:

```bash
npm run build
node dist/index.js
```

You should see:
```
[Config] Client ID present: true
[Config] Client Secret present: true  
[Config] Refresh Token present: true
[Config] Service Account Email present: true
[Config] Private Key present: true
Google Drive MCP server running on stdio
```

## 🔄 Claude Desktop Configuration

**Location:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "google-workspace": {
      "command": "node",
      "args": ["C:\\Users\\YourUsername\\path\\to\\gdrive-mcp\\dist\\index.js"]
    }
  }
}
```

## ✅ What Works Now

### Gmail (OAuth2)
- ✅ Read personal Gmail messages
- ✅ Send emails from your account
- ✅ Search emails
- ✅ Mark as read/unread
- ✅ Access Gmail labels

### Google Drive (Service Account)
- ✅ List files and folders
- ✅ Create folders
- ✅ Upload files
- ✅ Download files
- ✅ Share files
- ✅ Search files
- ✅ Never expires!

## 🚨 Troubleshooting

### "Gmail requires OAuth2 authentication"
- Make sure you have set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REFRESH_TOKEN`

### "Google Drive requires Service Account authentication"
- Make sure you have set `GOOGLE_SERVICE_ACCOUNT_EMAIL` and `GOOGLE_PRIVATE_KEY`

### "invalid_client" error for Gmail
- Verify your OAuth credentials are correct
- Make sure the refresh token is valid
- Check that Gmail API is enabled

### Service account has no files
- This is normal! Service accounts have their own isolated storage
- Files uploaded via service account won't appear in your personal Drive
- Use sharing/folder permissions to access files

## 🎯 Best Practices

1. **Keep both authentication methods** for maximum functionality
2. **Use Service Account for automated operations** (reliable, no expiration)
3. **Use OAuth for user-specific operations** (Gmail, personal Drive access)
4. **Regularly test refresh token validity** for OAuth
5. **Store credentials securely** in environment variables

---

## 📞 Need Help?

If you encounter issues:
1. Check the console output for specific error messages
2. Verify all environment variables are set correctly
3. Test each authentication method separately
4. Ensure APIs are enabled in Google Cloud Console 