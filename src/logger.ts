/**
 * Logger utility for MCP server
 * All log messages are sent to stderr to avoid interfering with JSON protocol on stdout
 */

export class Logger {
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

  static info(message: string, ...args: any[]) {
    this.write('INFO', message, ...args);
  }

  static warn(message: string, ...args: any[]) {
    this.write('WARN', message, ...args);
  }

  static error(message: string, ...args: any[]) {
    this.write('ERROR', message, ...args);
  }

  static debug(message: string, ...args: any[]) {
    if (process.env.DEBUG === 'true') {
      this.write('DEBUG', message, ...args);
    }
  }

  static config(message: string, ...args: any[]) {
    this.write('CONFIG', message, ...args);
  }

  static gmail(message: string, ...args: any[]) {
    this.write('GMAIL', message, ...args);
  }

  static drive(message: string, ...args: any[]) {
    this.write('DRIVE', message, ...args);
  }
} 