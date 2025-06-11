/**
 * Configuration management for Google Drive & Gmail MCP Server
 * 
 * This module handles environment variable loading, validation, and provides
 * type-safe configuration for the application. It uses Zod for schema validation
 * and supports multiple .env file locations for flexibility.
 */

import dotenv from "dotenv";
import { z } from "zod";
import path from "path";
import { fileURLToPath } from "url";
import { Logger } from "./logger.js";

// Get the directory of this module for resolving relative paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to load .env file from multiple possible locations
// This ensures the configuration works in different deployment scenarios
const possibleEnvPaths = [
  '.env',                           // Current working directory
  path.join(__dirname, '../.env'),  // Project root from dist/
  path.join(__dirname, '../../.env'), // In case we're in nested dist structure
  path.join(process.cwd(), '.env'), // Explicitly from current working directory
];

// Attempt to load environment variables from the first available .env file
let envLoaded = false;
for (const envPath of possibleEnvPaths) {
  try {
    const result = dotenv.config({ path: envPath });
    if (result.parsed) {
      Logger.config(`Loaded environment from: ${envPath}`);
      envLoaded = true;
      break;
    }
  } catch (error) {
    // Continue to next path if this one fails
  }
}

if (!envLoaded) {
  Logger.config('No .env file found, using system environment variables');
}

/**
 * Configuration schema using Zod for type safety and validation
 * 
 * This schema supports both OAuth2 and Service Account authentication,
 * allowing for flexible deployment options while maintaining security.
 */
const configSchema = z.object({
  // OAuth2 credentials (required for Gmail access)
  googleClientId: z.string().optional(),
  googleClientSecret: z.string().optional(),
  googleRedirectUri: z.string().url("GOOGLE_REDIRECT_URI must be a valid URL").default("https://developers.google.com/oauthplayground"),
  googleRefreshToken: z.string().optional(),
  
  // Service Account credentials (recommended for Google Drive)
  googleServiceAccountEmail: z.string().optional(),
  googlePrivateKey: z.string().optional(),
  
  // MCP Server configuration
  serverName: z.string().default("gdrive-mcp-server"),
  serverVersion: z.string().default("1.0.0"),
  
  // Optional operational settings
  defaultFolderId: z.string().optional(),
  maxFileSize: z.number().default(104857600), // 100MB default limit
});

// Extract and parse configuration from environment variables
const rawConfig = {
  // OAuth2 credentials
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI,
  googleRefreshToken: process.env.GOOGLE_REFRESH_TOKEN,
  
  // Service Account credentials (private key needs newline handling)
  googleServiceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  googlePrivateKey: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  
  // Server configuration
  serverName: process.env.MCP_SERVER_NAME,
  serverVersion: process.env.MCP_SERVER_VERSION,
  
  // Optional settings
  defaultFolderId: process.env.DEFAULT_FOLDER_ID,
  maxFileSize: process.env.MAX_FILE_SIZE ? parseInt(process.env.MAX_FILE_SIZE) : undefined,
};

// Parse and validate the configuration against the schema
export const config = configSchema.parse(rawConfig);

// Export the configuration type for use in other modules
export type Config = z.infer<typeof configSchema>;

/**
 * Validates that the required credentials are present for the hybrid authentication system
 * 
 * This function checks for both OAuth2 and Service Account credentials, providing
 * helpful error messages and warnings to guide users through the setup process.
 */
export function validateCredentials(): void {
  Logger.config(`Validating credentials...`);
  Logger.config(`Client ID present: ${!!config.googleClientId}`);
  Logger.config(`Client Secret present: ${!!config.googleClientSecret}`);
  Logger.config(`Refresh Token present: ${!!config.googleRefreshToken}`);
  Logger.config(`Service Account Email present: ${!!config.googleServiceAccountEmail}`);
  Logger.config(`Private Key present: ${!!config.googlePrivateKey}`);

  // Check for hybrid authentication requirements
  // OAuth2 is required for Gmail, Service Account is recommended for Google Drive
  const hasOAuth = config.googleClientId && config.googleClientSecret;
  const hasServiceAccount = config.googleServiceAccountEmail && config.googlePrivateKey;

  // Require at least one authentication method
  if (!hasOAuth && !hasServiceAccount) {
    throw new Error(
      "Missing Google API credentials. For full functionality, please set:\n\n" +
      "FOR GMAIL (OAuth2 - required for personal Gmail access):\n" +
      "- GOOGLE_CLIENT_ID\n" +
      "- GOOGLE_CLIENT_SECRET\n" +
      "- GOOGLE_REFRESH_TOKEN (recommended)\n\n" +
      "FOR GOOGLE DRIVE (Service Account - reliable, no expiration):\n" +
      "- GOOGLE_SERVICE_ACCOUNT_EMAIL\n" +
      "- GOOGLE_PRIVATE_KEY\n\n" +
      "Current working directory: " + process.cwd() + "\n" +
      "See SETUP-GUIDE.md for detailed setup instructions."
    );
  }

  // Warn about missing optional but recommended credentials
  if (!hasOAuth) {
    Logger.warn(
      "No OAuth credentials found. Gmail functionality will be disabled. " +
      "Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN to enable Gmail."
    );
  }

  if (!hasServiceAccount) {
    Logger.warn(
      "No Service Account credentials found. Google Drive functionality will be disabled. " +
      "Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY to enable Google Drive."
    );
  }

  // Warn about missing refresh token (causes frequent re-authentication)
  if (hasOAuth && !config.googleRefreshToken) {
    Logger.warn(
      "OAuth credentials found but no refresh token provided. " +
      "You'll need to set GOOGLE_REFRESH_TOKEN for Gmail functionality. " +
      "See SETUP-GUIDE.md for instructions on generating a refresh token."
    );
  }
} 