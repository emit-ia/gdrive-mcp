# Google Workspace MCP Server Setup Guide (Drive + Gmail)

This guide will walk you through setting up the Google Workspace MCP Server for both Google Drive and Gmail step by step.

## Prerequisites

- Node.js 18+ installed on your system
- A Google account
- Access to Google Cloud Console

## Step 1: Google Cloud Console Setup

### Create a Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "New Project"
4. Enter a project name (e.g., "My Workspace MCP Server")
5. Click "Create"

### Enable Google Drive and Gmail APIs

1. In your new project, go to "APIs & Services" > "Library"
2. Search for "Google Drive API"
3. Click on "Google Drive API" and click "Enable"
4. Go back to "Library" and search for "Gmail API"
5. Click on "Gmail API" and click "Enable"

## Step 2: Create OAuth 2.0 Credentials

### Configure OAuth Consent Screen

1. Go to "APIs & Services" > "OAuth consent screen"
2. Select "External" (unless you have a Google Workspace account)
3. Click "Create"
4. Fill in the required information:
   - App name: "Google Workspace MCP Server"
   - User support email: Your email
   - Developer contact information: Your email
5. Click "Save and Continue"
6. On the Scopes page, click "Add or Remove Scopes"
7. Add the following scopes:
   - `https://www.googleapis.com/auth/drive` (for Google Drive)
   - `https://www.googleapis.com/auth/gmail.readonly` (for reading emails)
   - `https://www.googleapis.com/auth/gmail.send` (for sending emails)
   - `https://www.googleapis.com/auth/gmail.modify` (for modifying emails)
   - `https://www.googleapis.com/auth/gmail.compose` (for composing emails)
8. Click "Update" then "Save and Continue"
9. Add test users (your email address) if needed
10. Click "Save and Continue"

### Create OAuth Client ID

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Select "Desktop application"
4. Enter name: "Google Workspace MCP Client"
5. Click "Create"
6. **IMPORTANT**: Copy and save:
   - Client ID (looks like: `xxx.apps.googleusercontent.com`)
   - Client Secret (looks like: `GOCSPX-xxx`)

### Add Redirect URIs

**IMPORTANT**: You need to add the correct redirect URIs to your OAuth client:

1. Click on your OAuth client in the Credentials page
2. In the "Authorized redirect URIs" section, add these URIs:
   - `https://developers.google.com/oauthplayground` (for OAuth Playground method)
   - `http://localhost:3000/auth/callback` (for local development)
   - `urn:ietf:wg:oauth:2.0:oob` (for out-of-band method)
3. Click "Save"
4. **Wait 5-10 minutes** for the changes to take effect

## Step 3: Get Refresh Token

### Method 1: Using Google OAuth 2.0 Playground (Recommended)

1. Go to [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)
2. Click the gear icon (⚙️) in the top right
3. Check "Use your own OAuth credentials"
4. Enter your Client ID and Client Secret from Step 2
5. Close the configuration

**Step 1 - Select & authorize APIs:**
1. In the left sidebar, scroll down to "Drive API v3" and "Gmail API v1"
2. Select the following scopes:
   - `https://www.googleapis.com/auth/drive`
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/gmail.compose`
3. Click "Authorize APIs"
4. Sign in with your Google account
5. Click "Allow" to grant permissions

**Step 2 - Exchange authorization code for tokens:**
1. Click "Exchange authorization code for tokens"
2. **IMPORTANT**: Copy the "Refresh token" (this is what you need!)

### Method 2: Using curl (Alternative)

If you prefer command line or the playground doesn't work:

```bash
# Step 1: Get authorization code
# Open this URL in your browser (replace YOUR_CLIENT_ID):
https://accounts.google.com/o/oauth2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=urn:ietf:wg:oauth:2.0:oob&scope=https://www.googleapis.com/auth/drive%20https://www.googleapis.com/auth/gmail.readonly%20https://www.googleapis.com/auth/gmail.send%20https://www.googleapis.com/auth/gmail.modify%20https://www.googleapis.com/auth/gmail.compose&response_type=code

# After authorization, you'll see a code on the page - copy it

# Step 2: Exchange code for tokens (replace YOUR_CLIENT_ID, YOUR_CLIENT_SECRET, and AUTHORIZATION_CODE)
curl -X POST https://oauth2.googleapis.com/token \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "code=AUTHORIZATION_CODE_FROM_STEP_1" \
  -d "grant_type=authorization_code" \
  -d "redirect_uri=urn:ietf:wg:oauth:2.0:oob"
```

### Method 3: Using a Simple Node.js Script

Create a temporary file `get-token.js`:

```javascript
const { google } = require('googleapis');
const readline = require('readline');

const CLIENT_ID = 'your_client_id_here';
const CLIENT_SECRET = 'your_client_secret_here';
const REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob';

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.compose'
  ],
});

console.log('Authorize this app by visiting this url:', authUrl);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Enter the code from that page here: ', (code) => {
  rl.close();
  oauth2Client.getToken(code, (err, token) => {
    if (err) return console.error('Error retrieving access token', err);
    console.log('Refresh token:', token.refresh_token);
  });
});
```

Run it with: `node get-token.js`

## Step 4: Install and Configure MCP Server

### Install the Server

```bash
# Option A: Global installation
npm install -g google-workspace-mcp-server

# Option B: Local installation
git clone <this-repository>
cd google-workspace-mcp-server
npm install
npm run build
```

### Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp env.example .env
   ```

2. Edit the `.env` file with your credentials:
   ```bash
   GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   GOOGLE_REFRESH_TOKEN=your_refresh_token_here
   ```

## Step 5: Test the Setup

### Test the Server

```bash
# If installed globally
google-workspace-mcp-server

# If running locally
npm start
```

The server should start without errors. Press Ctrl+C to stop.

### Test with an MCP Client

Configure your MCP client (like Claude Desktop) to use the server:

```json
{
  "mcpServers": {
    "google-workspace": {
      "command": "google-workspace-mcp-server",
      "env": {
        "GOOGLE_CLIENT_ID": "your_client_id_here.apps.googleusercontent.com",
        "GOOGLE_CLIENT_SECRET": "your_client_secret_here",
        "GOOGLE_REFRESH_TOKEN": "your_refresh_token_here"
      }
    }
  }
}
```

## Alternative: Service Account Setup (Advanced)

For server-to-server authentication without user interaction:

### Create Service Account

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Enter service account details
4. Click "Create and Continue"
5. Skip role assignment (click "Continue")
6. Click "Done"

### Generate Key

1. Click on your service account email
2. Go to "Keys" tab
3. Click "Add Key" > "Create new key"
4. Select "JSON" and click "Create"
5. Save the downloaded JSON file securely

### Configure Service Account

Extract from the JSON file:
- `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `private_key` → `GOOGLE_PRIVATE_KEY`

Add to your `.env`:
```bash
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----"
```

**Note**: Service accounts can only access files they create or files explicitly shared with them.

## Troubleshooting

### Common Issues

1. **"redirect_uri_mismatch"**: 
   - Make sure you've added the correct redirect URIs to your OAuth client
   - Wait 5-10 minutes after adding URIs for changes to take effect
   - Use the exact URIs listed in Step 2

2. **"Client ID not found"**: Double-check your Client ID and Secret

3. **"Invalid refresh token"**: Regenerate the refresh token using one of the methods above

4. **"Permission denied"**: Ensure the Drive API is enabled and you've authorized the correct scopes

5. **"Token expired"**: The server will automatically refresh tokens

### Getting Help

1. Check the [Google Drive API documentation](https://developers.google.com/drive/api)
2. Verify your Google Cloud Console configuration
3. Test your credentials using [Google APIs Explorer](https://developers.google.com/apis-explorer/#p/drive/v3/)

## Security Best Practices

- Never commit your `.env` file to version control
- Use different credentials for development and production
- Regularly rotate your credentials
- Consider using service accounts for production deployments
- Limit OAuth scopes to only what you need

## Next Steps

Once setup is complete, you can:
1. Start using the MCP server with your AI assistant
2. Explore the available tools in the README
3. Customize the server for your specific needs

If you encounter any issues, please check the troubleshooting section or create an issue on the GitHub repository. 