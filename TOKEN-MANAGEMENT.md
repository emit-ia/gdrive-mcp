# 🔄 Gmail Token Management Guide

This guide explains how to prevent Gmail refresh token expiration and maintain reliable authentication for your MCP server.

## 🛡️ **Automatic Token Management (NEW!)**

Your MCP server now includes **automatic token maintenance** to prevent expiration:

### ✅ **What's Automated**

1. **🔄 Regular Token Refresh**: Automatically refreshes every 30 minutes
2. **📊 Token Health Monitoring**: Tracks last refresh time and status
3. **⚠️ Error Handling**: Logs refresh failures for debugging
4. **🧹 Cleanup**: Properly manages intervals and resources

### 🔧 **How It Works**

```typescript
// Automatic refresh every 30 minutes
setInterval(async () => {
  await this.validateAndRefreshToken();
}, 30 * 60 * 1000);
```

## 📋 **Manual Token Management**

You can also manually manage tokens using MCP tools:

### **Check Token Status**
```json
{
  "tool": "gmail_check_token_status",
  "arguments": {}
}
```

**Response:**
```json
{
  "hasRefreshToken": true,
  "lastRefresh": "2024-01-15T10:30:00.000Z",
  "minutesSinceRefresh": 15,
  "maintenanceActive": true
}
```

### **Manual Token Refresh**
```json
{
  "tool": "gmail_refresh_token",
  "arguments": {}
}
```

**Response:**
```json
{
  "success": true,
  "lastRefresh": "2024-01-15T10:45:00.000Z",
  "message": "Token refreshed successfully"
}
```

## ⚠️ **When Refresh Tokens Can Still Expire**

Even with automatic maintenance, tokens can expire in these cases:

### 1. **Google Security Revocation**
- **Cause**: Suspicious activity detected
- **Solution**: Re-authorize completely (new refresh token needed)
- **Prevention**: Use tokens only from trusted networks

### 2. **Password Changes**
- **Cause**: User changes Google account password
- **Solution**: Re-authorize the application
- **Prevention**: None (security feature)

### 3. **App Permissions Revoked**
- **Cause**: User manually removes app from Google account
- **Solution**: Re-authorize the application
- **Prevention**: Educate users about token importance

### 4. **6+ Months of Complete Inactivity**
- **Cause**: Refresh token never used for 6 months
- **Solution**: Re-authorize the application
- **Prevention**: ✅ **SOLVED** by automatic maintenance!

### 5. **Token Limit Exceeded**
- **Cause**: Too many refresh tokens for the same app/user combo
- **Solution**: Revoke old tokens, create new one
- **Prevention**: Use one token per deployment

## 🔧 **Best Practices for Token Longevity**

### ✅ **1. Enable Automatic Maintenance**
```env
# Make sure you have these in your .env
GOOGLE_CLIENT_ID=your-client-id.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REFRESH_TOKEN=your-refresh-token
```

### ✅ **2. Monitor Token Health**
Check token status regularly:
```bash
# Using Claude Desktop or MCP client
gmail_check_token_status
```

### ✅ **3. Set Up Alerts**
Monitor server logs for token refresh failures:
```bash
# Look for these log messages
[Gmail] Token refreshed successfully during maintenance
[Gmail] Token maintenance failed: <error>
```

### ✅ **4. Keep Backups**
Store your refresh token securely:
```bash
# Backup your .env file securely
cp .env .env.backup
```

### ✅ **5. Test Regularly**
Test Gmail functionality periodically:
```json
{
  "tool": "gmail_get_profile",
  "arguments": {}
}
```

## 🚨 **Troubleshooting Token Issues**

### **Problem: "Token maintenance failed"**
```bash
[Gmail] Token maintenance failed: invalid_client
```

**Solutions:**
1. Check if `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are correct
2. Verify the OAuth2 application still exists in Google Cloud Console
3. Ensure Gmail API is enabled

### **Problem: "No refresh token available"**
```bash
[Gmail] No refresh token available - token maintenance disabled
```

**Solutions:**
1. Add `GOOGLE_REFRESH_TOKEN` to your `.env` file
2. Generate new refresh token using OAuth Playground
3. Follow the OAuth setup in `HYBRID-AUTH-SETUP.md`

### **Problem: Token refresh successful but API calls fail**
```bash
[Gmail] Token validated and refreshed at 2024-01-15T10:30:00.000Z
Error: The user has revoked access
```

**Solutions:**
1. User needs to re-authorize the application
2. Check Google account's connected apps settings
3. Generate new refresh token

## 🔄 **Recovery Procedures**

### **Complete Token Refresh (Last Resort)**

If automatic maintenance fails completely:

1. **Revoke Existing Access**:
   - Go to https://myaccount.google.com/permissions
   - Find your app and revoke access

2. **Generate New Refresh Token**:
   - Follow OAuth setup in `HYBRID-AUTH-SETUP.md`
   - Get new client credentials if needed
   - Generate fresh refresh token

3. **Update Environment**:
   ```env
   GOOGLE_CLIENT_ID=new-client-id
   GOOGLE_CLIENT_SECRET=new-client-secret
   GOOGLE_REFRESH_TOKEN=new-refresh-token
   ```

4. **Restart Server**:
   ```bash
   npm run build
   node dist/index.js
   ```

## 📊 **Monitoring Dashboard**

Create a simple monitoring script:

```bash
# Check token status every hour
while true; do
  echo "$(date): Checking token status..."
  # Your MCP client call to gmail_check_token_status
  sleep 3600
done
```

## 🎯 **Expected Behavior**

With proper setup, you should see:

```bash
[Config] Loaded environment from: .env
[Gmail] Token validated and refreshed at 2024-01-15T10:00:00.000Z
[Gmail] Token refreshed successfully during maintenance
[Gmail] Token refreshed successfully during maintenance
...
Google Drive MCP server running on stdio
```

## 📞 **Need Help?**

If you're still experiencing token expiration:

1. **Check the logs** for specific error messages
2. **Verify OAuth setup** using `HYBRID-AUTH-SETUP.md`
3. **Test manually** using `gmail_refresh_token` tool
4. **Consider domain-wide delegation** for enterprise use

---

**💡 Pro Tip**: The automatic token maintenance runs every 30 minutes, keeping your refresh token active and preventing the 6-month expiration that catches most users! 