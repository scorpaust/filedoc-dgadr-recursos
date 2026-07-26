import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle, seconds } from '@nestjs/throttler';
import type { Response } from 'express';
import { EnvironmentVariables } from '../config/env.validation';
import { AuthService, AuthenticatedUser } from './auth.service';
import type { AuthenticatedRequest, CurrentUserPayload } from './auth.types';
import { CurrentUser } from './decorators/current-user.decorator';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from './guards/auth.guard';
import {
  LOGIN_RATE_LIMIT,
  LOGIN_RATE_TTL_SECONDS,
} from './login-rate-limit.config';
import { SESSION_COOKIE_NAME } from './session-token.util';

interface AuthenticatedUserResponse {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly roles: readonly string[];
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  @Post('login')
  @Throttle({
    default: { limit: LOGIN_RATE_LIMIT, ttl: seconds(LOGIN_RATE_TTL_SECONDS) },
  })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<AuthenticatedUserResponse> {
    const session = await this.authService.login(dto.email, dto.password);
    this.setSessionCookie(response, session.token, session.expiresAt);
    return this.toResponse(session.user);
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const token = request.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
    if (token) {
      await this.authService.logout(token);
    }
    response.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: CurrentUserPayload): AuthenticatedUserResponse {
    return this.toResponse(user);
  }

  @Post('change-password')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async changePassword(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ChangePasswordDto,
  ): Promise<void> {
    await this.authService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  private setSessionCookie(
    response: Response,
    token: string,
    expiresAt: Date,
  ): void {
    const secure =
      this.configService.get('NODE_ENV', { infer: true }) === 'production' ||
      this.configService.get('TRUST_PROXY', { infer: true });
    response.cookie(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      expires: expiresAt,
    });
  }

  private toResponse(
    user: AuthenticatedUser | CurrentUserPayload,
  ): AuthenticatedUserResponse {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles,
    };
  }
}
