class Logger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.debugMode = process.env.DEBUG_MODE === 'true';
  }

  log(level, message, data = null) {
    if (!this.isDevelopment && level === 'debug') return;

    const timestamp = new Date().toISOString();
    const prefix = `[CF-Daily ${timestamp}] ${level.toUpperCase()}:`;
    
    if (data) {
      console[level](prefix, message, data);
    } else {
      console[level](prefix, message);
    }
  }

  info(message, data = null) {
    this.log('info', message, data);
  }

  warn(message, data = null) {
    this.log('warn', message, data);
  }

  error(message, data = null) {
    this.log('error', message, data);
  }

  debug(message, data = null) {
    if (this.debugMode) {
      this.log('debug', message, data);
    }
  }

  trace(functionName, action, data = null) {
    this.debug(`${functionName}: ${action}`, data);
  }
};

window.Logger = Logger;
window.logger = new window.Logger();