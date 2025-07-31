// Production-safe logger utility
const isDevelopment = process.env.NODE_ENV === 'development';

class Logger {
  log(...args: any[]) {
    if (isDevelopment) {
      console.log(...args);
    }
  }

  warn(...args: any[]) {
    if (isDevelopment) {
      console.warn(...args);
    }
  }

  error(...args: any[]) {
    // Always log errors
    console.error(...args);
  }

  info(...args: any[]) {
    if (isDevelopment) {
      console.info(...args);
    }
  }

  debug(...args: any[]) {
    if (isDevelopment) {
      console.debug(...args);
    }
  }
}

export const logger = new Logger();