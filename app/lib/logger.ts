import { ENV } from '~/api/config/env';
import { sanitizeForLog } from '~/lib/http-log';
import { currentRequestId } from '~/lib/request-id';

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

  /** One line of JSON with secrets redacted and personal data masked; empty fields are left out. */
  private serializeContext(context: LogContext): string {
    const sanitized = sanitizeForLog(context) as LogContext;
    const present = Object.fromEntries(Object.entries(sanitized).filter(([, value]) => value != null));
    return Object.keys(present).length > 0 ? JSON.stringify(present) : '';
  }

  // One entry is one line, so each log is a single searchable row in Vercel.
  // A line written while serving a request starts with that request's id, so one search shows all it did.
  private write(level: 'error' | 'warn' | 'info' | 'debug', message: string, context?: LogContext): void {
    const payload = context ? this.serializeContext(context) : '';
    const requestId = currentRequestId();
    const logMessage = `[${level.toUpperCase()}]${requestId ? ` [${requestId}]` : ''} ${message}`;
    console[level](payload ? `${logMessage} ${payload}` : logMessage);
  }
}

export const logger = new Logger();
