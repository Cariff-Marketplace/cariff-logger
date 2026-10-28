# cariff-logger

Стандартизированный модуль структурированного JSON логирования и распределенного трейсинга для микросервисов платформы **Cariff**.

## 🚀 Особенности

- **Zero heavy runtime dependencies:** работает нативно поверх `stdout`/`stderr` и Node.js `AsyncLocalStorage`.
- **Строгая NDJSON схема в production:**
  - `timestamp`: ISO 8601
  - `level`: `INFO`, `WARN`, `ERROR`, `FATAL` (уровень `DEBUG` подавлен в проде)
  - `service`: идентификатор сервиса (`api-gateway`, `auth-service` и т.д.)
  - `message`: понятный текст события
  - `correlationId`: сквозной идентификатор запроса (автоматически пробрасывается из контекста)
  - `context`, `metadata`, `stack`
- **Readable colored output в development:** цветной читаемый вывод для локальной разработки.
- **Интеграция с NestJS:** реализует `LoggerService`.

## 📦 Установка

```bash
yarn add cariff-logger
# или
npm install cariff-logger
```

## 🛠 Использование в NestJS

### 1. Подключение глобального логгера (`main.ts`)

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CariffLogger, setupGlobalErrorHandlers } from 'cariff-logger';

async function bootstrap() {
  const serviceName = 'auth-service';
  setupGlobalErrorHandlers(serviceName);

  const app = await NestFactory.create(AppModule, {
    logger: new CariffLogger(serviceName),
  });

  await app.listen(3333);
}
bootstrap();
```

### 2. Подключение Middleware для Correlation ID (`app.module.ts`)

```typescript
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { CorrelationIdMiddleware } from 'cariff-logger';

@Module({})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(new CorrelationIdMiddleware('api-gateway')).forRoutes('*');
  }
}
```

### 3. Логирование внутри сервисов

Используйте стандартный NestJS `Logger` — все вызовы автоматически будут отформатированы по стандарту:

```typescript
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  async getUser(id: string) {
    this.logger.log('Fetching user details'); // Автоматически прикрепит correlationId!
  }
}
```
