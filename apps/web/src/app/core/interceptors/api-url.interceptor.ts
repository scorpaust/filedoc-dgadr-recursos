import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AppConfigService } from '../config/app-config.service';

const ABSOLUTE_URL_PATTERN = /^https?:\/\//;

// Prefixa pedidos relativos com o URL da API configurado (AppConfigService, Fase 3 —
// Deployment) e ativa o envio/receção do cookie de sessão HttpOnly em todos os pedidos
// (coding-standards.md — "centralizar a configuração da URL da API").
export const apiUrlInterceptor: HttpInterceptorFn = (req, next) => {
  const appConfigService = inject(AppConfigService);
  const url = ABSOLUTE_URL_PATTERN.test(req.url) ? req.url : `${appConfigService.apiUrl}${req.url}`;
  return next(req.clone({ url, withCredentials: true }));
};
