import { Injectable, NestMiddleware, Optional } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { LoggerContextStore } from './context';
import { CariffLogger } from './logger.service';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

export interface HttpRequestLike {
  headers: Record<string, string | string[] | undefined>;
  method: string;
  url: string;
  originalUrl?: string;
  ip?: string;
  socket?: { remoteAddress?: string };
}

export interface HttpResponseLike {
  statusCode: number;
  setHeader(name: string, value: string): void;
  on(event: 'finish' | string, listener: () => void): this;
}

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  private readonly logger: CariffLogger;

  constructor(@Optional() serviceName?: string) {
    this.logger = new CariffLogger(serviceName || 'api-gateway');
  }

  use(req: HttpRequestLike, res: HttpResponseLike, next: (error?: any) => void): void {
    const rawId = req.headers[CORRELATION_ID_HEADER] || req.headers['x-request-id'];
    const correlationId = (Array.isArray(rawId) ? rawId[0] : rawId) || randomUUID();

    // Propagate in response header
    res.setHeader(CORRELATION_ID_HEADER, correlationId);

    const startTime = Date.now();

    LoggerContextStore.run({ correlationId }, () => {
      // Log on response finish
      res.on('finish', () => {
        const durationMs = Date.now() - startTime;
        const statusCode = res.statusCode;
        const method = req.method;
        const url = req.originalUrl || req.url;

        const message = `${method} ${url} ${statusCode} - ${durationMs}ms`;
        const metadata = {
          method,
          url,
          statusCode,
          durationMs,
          ip: req.ip || req.socket?.remoteAddress,
          userAgent: req.headers['user-agent'],
        };

        if (statusCode >= 500) {
          this.logger.error({ message, ...metadata }, undefined, 'HTTP');
        } else if (statusCode >= 400) {
          this.logger.warn({ message, ...metadata }, 'HTTP');
        } else {
          this.logger.log({ message, ...metadata }, 'HTTP');
        }
      });

      next();
    });
  }
}
