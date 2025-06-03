import dotenv from "dotenv";
import { z } from "zod";
import path from "path";
import { fileURLToPath } from "url";

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
      console.error(`[Config] Loaded environment from: ${envPath}`);
      envLoaded = true;
      break;
    }
  } catch (error) {
    // Continue to next path
  }
}

if (!envLoaded) {
  console.error('[Config] No .env file found, using system environment variables');
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
  console.error(`[Config] Validating credentials...`);
  console.error(`[Config] Client ID present: ${!!config.googleClientId}`);
  console.error(`[Config] Client Secret present: ${!!config.googleClientSecret}`);
  console.error(`[Config] Refresh Token present: ${!!config.googleRefreshToken}`);
  console.error(`[Config] Service Account Email present: ${!!config.googleServiceAccountEmail}`);
  console.error(`[Config] Private Key present: ${!!config.googlePrivateKey}`);

  if (!config.googleClientId || !config.googleClientSecret) {
    if (!config.googleServiceAccountEmail || !config.googlePrivateKey) {
      throw new Error(
        "Missing Google API credentials. Please set either:\n" +
        "1. GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (with GOOGLE_REFRESH_TOKEN), or\n" +
        "2. GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY\n\n" +
        "Current working directory: " + process.cwd() + "\n" +
        "Environment variables checked:\n" +
        `- GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID ? 'SET' : 'NOT SET'}\n` +
        `- GOOGLE_CLIENT_SECRET: ${process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'NOT SET'}\n` +
        `- GOOGLE_REFRESH_TOKEN: ${process.env.GOOGLE_REFRESH_TOKEN ? 'SET' : 'NOT SET'}\n\n` +
        "See SETUP-GUIDE.md for detailed setup instructions."
      );
    }
  }

  if (config.googleClientId && config.googleClientSecret && !config.googleRefreshToken) {
    console.warn(
      "Warning: OAuth credentials found but no refresh token provided.\n" +
      "You'll need to set GOOGLE_REFRESH_TOKEN for full functionality.\n" +
      "See SETUP-GUIDE.md for instructions on generating a refresh token."
    );
  }
} 