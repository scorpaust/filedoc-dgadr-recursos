import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditController } from './audit.controller';
import { AuditInterceptor } from './audit.interceptor';
import { AuditService } from './audit.service';

// `AuditInterceptor` regista-se globalmente (`APP_INTERCEPTOR`) a partir daqui — qualquer
// handler noutro módulo decorado com `@Audit(...)` é intercetado, sem esse módulo precisar de
// importar `AuditModule` (o decorator, em `audit.decorator.ts`, não tem dependências de DI).
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [AuditController],
  providers: [
    AuditService,
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
  exports: [AuditService],
})
export class AuditModule {}
