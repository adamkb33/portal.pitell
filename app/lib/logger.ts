import { ENV } from '~/api/config/env';
import { sanitizeForLog } from '~/lib/http-log';
import { currentRequestId, isRoutineRequest } from '~/lib/request-id';

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

  // Routine lines of a background read (polling, a page refreshing itself) are for local development only.
  info(message: string, context?: LogContext): void {
    if (isRoutineRequest()) {
      this.debug(message, context);
    } else if (this.shouldLogInfo) {
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
