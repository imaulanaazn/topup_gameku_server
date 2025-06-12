import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import util from "util";

const transport = new DailyRotateFile({
  filename: "logs/logger-management-gasskeuntopup %DATE%.log",
  datePattern: "YYYY-MM-DD",
  maxSize: "100m",
  maxFiles: "120d",
});

const logger = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:sss" }),
    winston.format.printf(({ timestamp, level, message }) => {
      if (typeof message === "object") {
        return `[${timestamp}] ${util.inspect(message, { depth: null })}`;
      }

      return `[${timestamp}] ${message}`;
    })
  ),
  transports: [
    transport,
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.printf(({ timestamp, level, message }) => {
          if (typeof message === "object") {
            return `[${timestamp}] ${util.inspect(message, {
              depth: null,
              colors: true,
            })}`;
          }

          return `[${timestamp}] ${message}`;
        })
      ),
    }),
  ],
});

const webhookTransport = new DailyRotateFile({
  filename: "logs/webhook/logger-webhook-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  maxSize: "100m",
  maxFiles: "120d",
});

const loggerWebhookLapakGaming = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:sss" }),
    winston.format.printf(({ timestamp, level, message }) => {
      if (typeof message === "object") {
        return `[${timestamp}] ${util.inspect(message, { depth: null })}`;
      }

      return `[${timestamp}] ${message}`;
    })
  ),
  transports: [
    webhookTransport,
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.printf(({ timestamp, level, message }) => {
          if (typeof message === "object") {
            return `[${timestamp}] ${util.inspect(message, {
              depth: null,
              colors: true,
            })}`;
          }

          return `[${timestamp}] ${message}`;
        })
      ),
    }),
  ],
});

const cronjobTransport = new DailyRotateFile({
  filename: "logs/cronjob/logger-cronjob-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  maxSize: "100m",
  maxFiles: "120d",
});

const loggerCronjob = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:sss" }),
    winston.format.printf(({ timestamp, level, message }) => {
      if (typeof message === "object") {
        return `[${timestamp}] ${util.inspect(message, { depth: null })}`;
      }

      return `[${timestamp}] ${message}`;
    })
  ),
  transports: [
    cronjobTransport,
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.printf(({ timestamp, level, message }) => {
          if (typeof message === "object") {
            return `[${timestamp}] ${util.inspect(message, {
              depth: null,
              colors: true,
            })}`;
          }

          return `[${timestamp}] ${message}`;
        })
      ),
    }),
  ],
});
const cronjobKuponTransport = new DailyRotateFile({
  filename: "logs/cronjob-kupon/logger-cronjob-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  maxSize: "100m",
  maxFiles: "120d",
});

const loggerKuponCronjob = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:sss" }),
    winston.format.printf(({ timestamp, level, message }) => {
      if (typeof message === "object") {
        return `[${timestamp}] ${util.inspect(message, { depth: null })}`;
      }

      return `[${timestamp}] ${message}`;
    })
  ),
  transports: [
    cronjobKuponTransport,
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.printf(({ timestamp, level, message }) => {
          if (typeof message === "object") {
            return `[${timestamp}] ${util.inspect(message, {
              depth: null,
              colors: true,
            })}`;
          }

          return `[${timestamp}] ${message}`;
        })
      ),
    }),
  ],
});

const cronjobInternalTransport = new DailyRotateFile({
  filename: "logs/cronjob-internal/logger-cronjob-%DATE%.log",
  datePattern: "YYYY-MM-DD",
  maxSize: "100m",
  maxFiles: "120d",
});

const loggerCronjobInternal = winston.createLogger({
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:sss" }),
    winston.format.printf(({ timestamp, level, message }) => {
      if (typeof message === "object") {
        return `[${timestamp}] ${util.inspect(message, { depth: null })}`;
      }

      return `[${timestamp}] ${message}`;
    })
  ),
  transports: [
    cronjobInternalTransport,
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.printf(({ timestamp, level, message }) => {
          if (typeof message === "object") {
            return `[${timestamp}] ${util.inspect(message, {
              depth: null,
              colors: true,
            })}`;
          }

          return `[${timestamp}] ${message}`;
        })
      ),
    }),
  ],
});

export const createLogCronjobInternal = () => {
  return {
    log: loggerCronjobInternal.info.bind(loggerCronjobInternal),
    warn: loggerCronjobInternal.warn.bind(loggerCronjobInternal),
    error: loggerCronjobInternal.error.bind(loggerCronjobInternal),
  };
};

export const createLogCronjobKupon = () => {
  return {
    log: loggerKuponCronjob.info.bind(loggerKuponCronjob),
    warn: loggerKuponCronjob.warn.bind(loggerKuponCronjob),
    error: loggerKuponCronjob.error.bind(loggerKuponCronjob),
  };
};

export const createLogCronjob = () => {
  return {
    log: loggerCronjob.info.bind(loggerCronjob),
    warn: loggerCronjob.warn.bind(loggerCronjob),
    error: loggerCronjob.error.bind(loggerCronjob),
  };
};

export const createLogWebhook = () => {
  return {
    log: loggerWebhookLapakGaming.info.bind(loggerWebhookLapakGaming),
    warn: loggerWebhookLapakGaming.warn.bind(loggerWebhookLapakGaming),
    error: loggerWebhookLapakGaming.error.bind(loggerWebhookLapakGaming),
  };
};

console.log = function (...msg) {
  if (msg.length > 1) {
    for (const log of msg) {
      logger.info(log);
    }
  } else {
    logger.info(msg[0]);
  }
};

console.warn = function (...msg) {
  if (msg.length > 1) {
    for (const log of msg) {
      logger.warn(log);
    }
  } else {
    logger.warn(msg[0]);
  }
};

console.error = function (...msg) {
  if (msg.length > 1) {
    for (const log of msg) {
      logger.error(log);
    }
  } else {
    logger.error(msg);
  }
};
