import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule, seconds } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { ContentModule } from './content/content.module';
import { correlationIdMiddleware } from './common/correlation-id.middleware';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { validate } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { ResourcesModule } from './resources/resources.module';
import { StorageModule } from './storage/storage.module';
import { TaxonomiesModule } from './taxonomies/taxonomies.module';
import { TicketsModule } from './tickets/tickets.module';
import { UsersModule } from './users/users.module';

const DEFAULT_RATE_LIMIT = 100;

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: seconds(60), limit: DEFAULT_RATE_LIMIT },
    ]),
    PrismaModule,
    HealthModule,
    AuthModule,
    StorageModule,
    ResourcesModule,
    ContentModule,
    TaxonomiesModule,
    TicketsModule,
    UsersModule,
    AuditModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
  ],
})
export class AppModule implements NestModule {
  // Regista `X-Correlation-Id` em `request.correlationId` para todas as rotas — aplicado
  // aqui (em vez de `app.use()` em `main.ts`) para que os testes de integração, que criam a
  // aplicação diretamente a partir de `AppModule`, o recebam automaticamente sem replicar
  // mais um passo de arranque em cada ficheiro de teste.
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(correlationIdMiddleware).forRoutes('*');
  }
}
