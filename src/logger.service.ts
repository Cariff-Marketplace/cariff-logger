import { Injectable, LoggerService, Scope } from '@nestjs/common';
import { LoggerContextStore } from './context';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  correlationId?: string;
  context?: string;
  stack?: string;
  metadata?: Record<string, unknown>;
}

export interface LoggerOptions {
  serviceName: string;
  isProduction?: boolean;
}

@Injectable({ scope: Scope.DEFAULT })
export class CariffLogger implements LoggerService {
  private serviceName: string;
  private isProduction: boolean;

  constructor(serviceNameOrOptions: string | LoggerOptions = 'cariff-service') {
    if (typeof serviceNameOrOptions === 'string') {
      this.serviceName = serviceNameOrOptions;
      this.isProduction = process.env.NODE_ENV === 'production';
    } else {
      this.serviceName = serviceNameOrOptions.serviceName;
      this.isProduction = serviceNameOrOptions.isProduction ?? process.env.NODE_ENV === 'production';
    }
  }

  setServiceName(name: string): void {
    this.serviceName = name;
  }

  log(message: any, context?: string): void {
    this.writeLog('INFO', message, context);
  }

  error(message: any, trace?: string, context?: string): void {
    this.writeLog('ERROR', message, context, trace);
  }

  warn(message: any, context?: string): void {
    this.writeLog('WARN', message, context);
  }

  debug?(message: any, context?: string): void {
    if (this.isProduction) {
      return; // Suppress DEBUG in production according to spec
    }
    this.writeLog('DEBUG', message, context);
  }

  verbose?(message: any, context?: string): void {
    if (this.isProduction) {
      return;
    }
    this.writeLog('DEBUG', message, context);
  }

  fatal(message: any, trace?: string, context?: string): void {
    this.writeLog('FATAL', message, context, trace);
  }

  private writeLog(level: LogLevel, message: any, context?: string, stack?: string): void {
    const timestamp = new Date().toISOString();
    const correlationId = LoggerContextStore.getCorrelationId();

    let textMessage = '';
    let metadata: Record<string, unknown> | undefined;

    if (typeof message === 'object' && message !== null) {
      if (message instanceof Error) {
        textMessage = message.message;
        stack = stack || message.stack;
      } else {
        const { msg, message: msgField, ...rest } = message;
        textMessage = (msgField || msg || JSON.stringify(message)) as string;
        if (Object.keys(rest).length > 0) {
          metadata = rest;
        }
      }
    } else {
      textMessage = String(message);
    }

    if (this.isProduction) {
      // Production: strict single-line flat NDJSON to stdout/stderr
      const logEntry: LogEntry = {
        timestamp,
        level,
        service: this.serviceName,
        message: textMessage,
        ...(correlationId ? { correlationId } : {}),
        ...(context ? { context } : {}),
        ...(stack ? { stack } : {}),
        ...(metadata ? { metadata } : {}),
      };

      const jsonString = JSON.stringify(logEntry) + '\n';
      if (level === 'ERROR' || level === 'FATAL') {
        process.stderr.write(jsonString);
      } else {
        process.stdout.write(jsonString);
      }
    } else {
      // Development: Human-friendly colored terminal output
      const colors: Record<LogLevel, string> = {
        DEBUG: '\x1b[34m',   // Blue
        INFO: '\x1b[32m',    // Green
        WARN: '\x1b[33m',    // Yellow
        ERROR: '\x1b[31m',   // Red
        FATAL: '\x1b[35;1m', // Magenta bold
      };
      const reset = '\x1b[0m';
      const gray = '\x1b[90m';
      const cyan = '\x1b[36m';

      const color = colors[level] || reset;
      const ctx = context ? ` ${cyan}[${context}]${reset}` : '';
      const corr = correlationId ? ` ${gray}(corr: ${correlationId})${reset}` : '';
      const formatted = `${gray}${timestamp}${reset} ${color}${level.padEnd(5)}${reset} ${gray}[${this.serviceName}]${reset}${ctx}${corr} ${textMessage}`;

      if (level === 'ERROR' || level === 'FATAL') {
        process.stderr.write(formatted + '\n');
        if (stack) {
          process.stderr.write(`${gray}${stack}${reset}\n`);
        }
      } else {
        process.stdout.write(formatted + '\n');
      }
    }
  }
}
