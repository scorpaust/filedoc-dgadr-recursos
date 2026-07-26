import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { EnvironmentVariables } from './config/env.validation';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.setGlobalPrefix('api/v1');

  const configService = app.get(ConfigService<EnvironmentVariables, true>);

  // Só ativar quando a API estiver atrás de um proxy/load balancer que
  // termina TLS antes da aplicação (ex. ALB) — sem isto, o atributo Secure
  // do cookie de sessão não reconhece corretamente X-Forwarded-Proto.
  if (configService.get('TRUST_PROXY', { infer: true })) {
    app.set('trust proxy', 1);
  }

  app.use(cookieParser());
  app.enableCors({
    origin: [...configService.get('CORS_ALLOWED_ORIGINS', { infer: true })],
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(configService.get('PORT', { infer: true }));
}
void bootstrap();
