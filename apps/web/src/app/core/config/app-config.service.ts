import { Injectable } from '@angular/core';

interface RuntimeEnv {
  apiUrl?: string;
}

declare global {
  interface Window {
    __env?: RuntimeEnv;
  }
}

const DEFAULT_API_URL = 'http://localhost:3000/api/v1';

/**
 * Lê a configuração injetada em `env.js` (gerado no arranque do contentor de
 * produção a partir da variável de ambiente `API_URL` — ver `apps/web/Dockerfile`
 * e `apps/web/docker/generate-env-config.sh`), com fallback para o valor de
 * desenvolvimento local. Permite promover a mesma imagem entre ambientes sem
 * reconstrução (decisão registada em `context/features/db_ci_cd/fase-3-deploy-containerizacao.md`).
 */
@Injectable({ providedIn: 'root' })
export class AppConfigService {
  readonly apiUrl: string = window.__env?.apiUrl ?? DEFAULT_API_URL;
}
