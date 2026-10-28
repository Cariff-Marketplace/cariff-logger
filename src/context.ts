import { AsyncLocalStorage } from 'async_hooks';

export interface LogContext {
  correlationId?: string;
  [key: string]: unknown;
}

const asyncLocalStorage = new AsyncLocalStorage<LogContext>();

export class LoggerContextStore {
  static run<R>(context: LogContext, fn: () => R): R {
    return asyncLocalStorage.run(context, fn);
  }

  static getCorrelationId(): string | undefined {
    return asyncLocalStorage.getStore()?.correlationId;
  }

  static getContext(): LogContext | undefined {
    return asyncLocalStorage.getStore();
  }

  static set(key: string, value: unknown): void {
    const store = asyncLocalStorage.getStore();
    if (store) {
      store[key] = value;
    }
  }
}
