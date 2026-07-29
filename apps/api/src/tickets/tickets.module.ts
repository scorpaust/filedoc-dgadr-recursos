import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { StorageModule } from '../storage/storage.module';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

@Module({
  imports: [PrismaModule, AuthModule, StorageModule],
  controllers: [TicketsController],
  providers: [TicketsService],
})
export class TicketsModule {}
