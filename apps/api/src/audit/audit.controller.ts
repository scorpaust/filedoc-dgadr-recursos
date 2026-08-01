import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuditService } from './audit.service';
import { AuditLogSearchResponse } from './audit.types';
import { ListAuditLogQueryDto } from './dto/list-audit-log-query.dto';

@Controller('admin/audit-log')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  list(@Query() query: ListAuditLogQueryDto): Promise<AuditLogSearchResponse> {
    return this.auditService.list(query);
  }
}
