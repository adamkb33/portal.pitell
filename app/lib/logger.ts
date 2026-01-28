// ~/lib/logger.ts

import { ENV } from '~/api/config/env';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private isDevelopment = ENV.NODE_ENV === 'development';

  error(message: string, context?: LogContext): void {
    const serialized = context ? this.serializeContext(context) : '';
    console.error(`[ERROR] ${message}`, serialized);
  }

  warn(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      const serialized = context ? this.serializeContext(context) : '';
      console.warn(`[WARN] ${message}`, serialized);
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      const serialized = context ? this.serializeContext(context) : '';
      console.info(`[INFO] ${message}`, serialized);
    }
  }

  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      const serialized = context ? this.serializeContext(context) : '';
      console.debug(`[DEBUG] ${message}`, serialized);
    }
  }

  private serializeContext(context: LogContext): string {
    const serialized: Record<string, string> = {};

    for (const [key, value] of Object.entries(context)) {
      if (value instanceof Response) {
        serialized[key] = `Response(status=${value.status}, statusText=${value.statusText})`;
      } else if (value instanceof Error) {
        serialized[key] = `${value.name}: ${value.message}`;
      } else {
        serialized[key] = typeof value === 'object' ? JSON.stringify(value) : String(value);
      }
    }

    return JSON.stringify(serialized, null, 2);
  }
}

export const logger = new Logger();
