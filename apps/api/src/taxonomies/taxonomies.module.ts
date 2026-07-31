import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TaxonomiesController } from './taxonomies.controller';
import { TaxonomiesService } from './taxonomies.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [TaxonomiesController],
  providers: [TaxonomiesService],
})
export class TaxonomiesModule {}
