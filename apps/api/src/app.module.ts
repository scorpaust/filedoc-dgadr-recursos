import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule, seconds } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ContentModule } from './content/content.module';
import { validate } from './config/env.validation';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { ResourcesModule } from './resources/resources.module';
import { StorageModule } from './storage/storage.module';
import { TicketsModule } from './tickets/tickets.module';

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
    TicketsModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
