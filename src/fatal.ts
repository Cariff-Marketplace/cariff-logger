import { CariffLogger } from './logger.service';

export function setupGlobalErrorHandlers(serviceName: string): void {
  const logger = new CariffLogger(serviceName);

  process.on('uncaughtException', (error: Error) => {
    logger.fatal(
      {
        message: `Uncaught Exception: ${error?.message || error}`,
        error: error?.message,
      },
      error?.stack,
      'Process',
    );
    // Allow stdout/stderr to flush before exiting
    setTimeout(() => {
      process.exit(1);
    }, 100);
  });

  process.on('unhandledRejection', (reason: unknown) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    logger.fatal(
      {
        message: `Unhandled Rejection: ${error.message}`,
        error: error.message,
      },
      error.stack,
      'Process',
    );
  });
}
