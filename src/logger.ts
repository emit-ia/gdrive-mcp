/**
 * Logger utility for Google Drive & Gmail MCP Server
 * 
 * All log messages are sent to stderr to avoid interfering with the MCP JSON protocol
 * on stdout. This ensures proper communication with MCP clients like Claude Desktop.
 * 
 * Provides different log levels including specialized loggers for Gmail and Drive operations.
 */

export class Logger {
  /**
   * Internal method to write log messages to stderr
   * 
   * @param level - Log level (INFO, WARN, ERROR, etc.)
   * @param message - Primary log message
   * @param args - Additional arguments to log
   */
  private static write(level: string, message: string, ...args: any[]) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    
    if (args.length > 0) {
      process.stderr.write(logMessage + ' ' + args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ') + '\n');
    } else {
      process.stderr.write(logMessage + '\n');
    }
  }

  /** Log informational messages */
  static info(message: string, ...args: any[]) {
    this.write('INFO', message, ...args);
  }

  /** Log warning messages */
  static warn(message: string, ...args: any[]) {
    this.write('WARN', message, ...args);
  }

  /** Log error messages */
  static error(message: string, ...args: any[]) {
    this.write('ERROR', message, ...args);
  }

  /** Log debug messages (only when DEBUG=true environment variable is set) */
  static debug(message: string, ...args: any[]) {
    if (process.env.DEBUG === 'true') {
      this.write('DEBUG', message, ...args);
    }
  }

  /** Log configuration-related messages */
  static config(message: string, ...args: any[]) {
    this.write('CONFIG', message, ...args);
  }

  /** Log Gmail-specific messages (token management, operations) */
  static gmail(message: string, ...args: any[]) {
    this.write('GMAIL', message, ...args);
  }

  /** Log Google Drive-specific messages */
  static drive(message: string, ...args: any[]) {
    this.write('DRIVE', message, ...args);
  }
} 