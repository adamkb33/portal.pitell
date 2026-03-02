import { ENV } from '~/api/config/env';
import { sanitizeForLog } from '~/lib/http-log';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = ENV.NODE_ENV === 'development';
  private shouldLogInfo = true;
  private shouldLogWarn = true;

  error(message: string, context?: LogContext): void {
    this.write('error', message, context);
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLogWarn) {
      this.write('warn', message, context);
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLogInfo) {
      this.write('info', message, context);
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      this.write('debug', message, context);
    }
  }

  private serializeContext(context: LogContext): string {
    return JSON.stringify(sanitizeForLog(context), null, 2);
  }

  private write(level: 'error' | 'warn' | 'info' | 'debug', message: string, context?: LogContext): void {
    const payload = context ? this.serializeContext(context) : '';
    const logMessage = `[${level.toUpperCase()}] ${message}`;

    if (payload) {
      console[level](logMessage, payload);
      return;
    }

    console[level](logMessage);
  }
}

export const logger = new Logger();
