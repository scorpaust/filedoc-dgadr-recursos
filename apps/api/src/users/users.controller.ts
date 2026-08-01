import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Audit } from '../audit/audit.decorator';
import { AssignRolesDto } from './dto/assign-roles.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserNameDto } from './dto/update-user-name.dto';
import { UsersService } from './users.service';
import { UserResponse } from './users.types';

const ENTITY_TYPE = 'user';

@Controller('admin/users')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list(@Query() query: ListUsersQueryDto): Promise<readonly UserResponse[]> {
    return this.usersService.list(query);
  }

  @Post()
  @Audit('user.create', ENTITY_TYPE, { metadataKeys: ['roles'] })
  create(@Body() dto: CreateUserDto): Promise<UserResponse> {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  @Audit('user.rename', ENTITY_TYPE)
  updateName(
    @Param('id') id: string,
    @Body() dto: UpdateUserNameDto,
  ): Promise<UserResponse> {
    return this.usersService.updateName(id, dto);
  }

  @Put(':id/roles')
  @Audit('user.roles-change', ENTITY_TYPE, { metadataKeys: ['roles'] })
  assignRoles(
    @Param('id') id: string,
    @Body() dto: AssignRolesDto,
  ): Promise<UserResponse> {
    return this.usersService.assignRoles(id, dto);
  }

  @Post(':id/activate')
  @Audit('user.activate', ENTITY_TYPE)
  activate(@Param('id') id: string): Promise<UserResponse> {
    return this.usersService.activate(id);
  }

  @Post(':id/deactivate')
  @Audit('user.deactivate', ENTITY_TYPE)
  deactivate(@Param('id') id: string): Promise<UserResponse> {
    return this.usersService.deactivate(id);
  }

  @Post(':id/invalidate-sessions')
  @Audit('user.invalidate-sessions', ENTITY_TYPE)
  @HttpCode(HttpStatus.NO_CONTENT)
  invalidateSessions(@Param('id') id: string): Promise<void> {
    return this.usersService.invalidateSessions(id);
  }
}
