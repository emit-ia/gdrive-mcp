import dotenv from "dotenv";
import { z } from "zod";
import path from "path";
import { fileURLToPath } from "url";
import { Logger } from "./logger.js";

// Get the directory of this module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to load .env file from multiple possible locations
const possibleEnvPaths = [
  '.env',                           // Current working directory
  path.join(__dirname, '../.env'),  // Project root from dist/
  path.join(__dirname, '../../.env'), // In case we're in nested dist structure
  path.join(process.cwd(), '.env'), // Explicitly from current working directory
];

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
    // Continue to next path
  }
}

if (!envLoaded) {
  Logger.config('No .env file found, using system environment variables');
}

// Define the configuration schema with optional credentials for initial setup
const configSchema = z.object({
  // Google API credentials
  googleClientId: z.string().optional(),
  googleClientSecret: z.string().optional(),
  googleRedirectUri: z.string().url("GOOGLE_REDIRECT_URI must be a valid URL").default("https://developers.google.com/oauthplayground"),
  googleRefreshToken: z.string().optional(),
  
  // Alternative service account credentials
  googleServiceAccountEmail: z.string().optional(),
  googlePrivateKey: z.string().optional(),
  
  // Server configuration
  serverName: z.string().default("gdrive-mcp-server"),
  serverVersion: z.string().default("1.0.0"),
  
  // Optional settings
  defaultFolderId: z.string().optional(),
  maxFileSize: z.number().default(104857600), // 100MB
});

// Parse and validate configuration
const rawConfig = {
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI,
  googleRefreshToken: process.env.GOOGLE_REFRESH_TOKEN,
  googleServiceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  googlePrivateKey: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  serverName: process.env.MCP_SERVER_NAME,
  serverVersion: process.env.MCP_SERVER_VERSION,
  defaultFolderId: process.env.DEFAULT_FOLDER_ID,
  maxFileSize: process.env.MAX_FILE_SIZE ? parseInt(process.env.MAX_FILE_SIZE) : undefined,
};

export const config = configSchema.parse(rawConfig);

export type Config = z.infer<typeof configSchema>;

// Validation function for runtime credential checking
export function validateCredentials(): void {
  Logger.config(`Validating credentials...`);
  Logger.config(`Client ID present: ${!!config.googleClientId}`);
  Logger.config(`Client Secret present: ${!!config.googleClientSecret}`);
  Logger.config(`Refresh Token present: ${!!config.googleRefreshToken}`);
  Logger.config(`Service Account Email present: ${!!config.googleServiceAccountEmail}`);
  Logger.config(`Private Key present: ${!!config.googlePrivateKey}`);

  // For hybrid authentication, we need BOTH OAuth (for Gmail) AND Service Account (for Drive)
  const hasOAuth = config.googleClientId && config.googleClientSecret;
  const hasServiceAccount = config.googleServiceAccountEmail && config.googlePrivateKey;

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

  if (hasOAuth && !config.googleRefreshToken) {
    Logger.warn(
      "OAuth credentials found but no refresh token provided. " +
      "You'll need to set GOOGLE_REFRESH_TOKEN for Gmail functionality. " +
      "See SETUP-GUIDE.md for instructions on generating a refresh token."
    );
  }
} 