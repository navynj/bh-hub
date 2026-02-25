/**
 * Logger Utility
 * Centralized logging with environment-based levels
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogContext {
  [key: string]: unknown;
}

class Logger {
  private shouldLog(level: LogLevel): boolean {
    if (process.env.NODE_ENV === 'production') {
      return level === 'error' || level === 'warn';
    }
    return true;
  }

  error(message: string, context?: LogContext | Error): void {
    if (!this.shouldLog('error')) return;

    if (context instanceof Error) {
      console.error(`[ERROR] ${message}`, {
        error: context.message,
        stack: context.stack,
        name: context.name,
      });
    } else {
      console.error(`[ERROR] ${message}`, context || {});
    }
  }

  warn(message: string, context?: LogContext): void {
    if (!this.shouldLog('warn')) return;
    console.warn(`[WARN] ${message}`, context || {});
  }

  info(message: string, context?: LogContext): void {
    if (!this.shouldLog('info')) return;
    console.log(`[INFO] ${message}`, context || {});
  }

  debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEBUG] ${message}`, context || {});
    }
  }
}

export const logger = new Logger();
