import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  // Liveness: confirma apenas que o processo responde, sem depender de
  // nenhum serviço externo. É este o endpoint chamado pelo HEALTHCHECK do
  // Dockerfile (apps/api/docker/healthcheck.js) — não deve falhar por uma
  // instabilidade passageira da base de dados, sob pena de reiniciar o
  // contentor sem que isso resolva o problema real.
  @Get('health')
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }

  // Readiness: confirma que as dependências de que a API precisa para
  // servir pedidos (para já, a base de dados) estão alcançáveis. Destinado
  // a ser chamado pela monitorização externa do ambiente (Fase 5,
  // Deployment), não pelo HEALTHCHECK do contentor.
  @Get('ready')
  async checkReady(): Promise<{ status: 'ok' }> {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok' };
  }
}
