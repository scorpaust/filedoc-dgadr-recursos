import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login-page/login-page.component').then((m) => m.LoginPageComponent),
  },
  {
    path: '',
    loadComponent: () =>
      import('./core/layout/app-shell/app-shell.component').then((m) => m.AppShellComponent),
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      {
        path: 'inicio',
        loadComponent: () =>
          import('./features/home/home-page/home-page.component').then((m) => m.HomePageComponent),
      },
      {
        path: 'recursos',
        loadComponent: () =>
          import('./features/resources/resource-catalog-page/resource-catalog-page.component').then(
            (m) => m.ResourceCatalogPageComponent,
          ),
      },
      {
        path: 'recursos/:slug',
        loadComponent: () =>
          import('./features/resources/resource-detail-page/resource-detail-page.component').then(
            (m) => m.ResourceDetailPageComponent,
          ),
      },
      {
        path: 'dicas-faq',
        loadComponent: () =>
          import('./features/tips-faq/tips-faq-page/tips-faq-page.component').then(
            (m) => m.TipsFaqPageComponent,
          ),
      },
      {
        path: 'suporte',
        loadComponent: () =>
          import('./features/support/my-tickets-page/my-tickets-page.component').then(
            (m) => m.MyTicketsPageComponent,
          ),
      },
      {
        path: 'suporte/novo',
        loadComponent: () =>
          import('./features/support/new-ticket-page/new-ticket-page.component').then(
            (m) => m.NewTicketPageComponent,
          ),
      },
      {
        path: 'suporte/gestao',
        loadComponent: () =>
          import('./features/support/support-management-page/support-management-page.component').then(
            (m) => m.SupportManagementPageComponent,
          ),
        canActivate: [roleGuard],
        data: { roles: ['SUPPORT_AGENT', 'ADMIN'] },
      },
      {
        path: 'suporte/:id',
        loadComponent: () =>
          import('./features/support/ticket-detail-page/ticket-detail-page.component').then(
            (m) => m.TicketDetailPageComponent,
          ),
      },
      {
        path: 'conteudos',
        loadComponent: () =>
          import('./features/content-management/content-management-page/content-management-page.component').then(
            (m) => m.ContentManagementPageComponent,
          ),
        canActivate: [roleGuard],
        data: { roles: ['CONTENT_EDITOR', 'ADMIN'] },
      },
      {
        path: 'conteudos/recursos/novo',
        loadComponent: () =>
          import('./features/content-management/resource-form-page/resource-form-page.component').then(
            (m) => m.ResourceFormPageComponent,
          ),
        canActivate: [roleGuard],
        data: { roles: ['CONTENT_EDITOR', 'ADMIN'] },
      },
      {
        path: 'conteudos/recursos/:id/editar',
        loadComponent: () =>
          import('./features/content-management/resource-form-page/resource-form-page.component').then(
            (m) => m.ResourceFormPageComponent,
          ),
        canActivate: [roleGuard],
        data: { roles: ['CONTENT_EDITOR', 'ADMIN'] },
      },
      {
        path: 'conteudos/recursos/:slug/pre-visualizacao',
        loadComponent: () =>
          import('./features/resources/resource-detail-page/resource-detail-page.component').then(
            (m) => m.ResourceDetailPageComponent,
          ),
        canActivate: [roleGuard],
        data: { roles: ['CONTENT_EDITOR', 'ADMIN'], previewMode: true },
      },
      {
        path: 'administracao',
        loadComponent: () =>
          import('./features/administration/administration-page/administration-page.component').then(
            (m) => m.AdministrationPageComponent,
          ),
        canActivate: [roleGuard],
        data: { roles: ['ADMIN'] },
      },
      {
        path: 'definicoes/palavra-passe',
        loadComponent: () =>
          import('./features/auth/change-password-page/change-password-page.component').then(
            (m) => m.ChangePasswordPageComponent,
          ),
      },
      {
        path: 'acesso-negado',
        loadComponent: () =>
          import('./features/errors/access-denied-page/access-denied-page.component').then(
            (m) => m.AccessDeniedPageComponent,
          ),
      },
      {
        path: '**',
        loadComponent: () =>
          import('./features/errors/not-found-page/not-found-page.component').then(
            (m) => m.NotFoundPageComponent,
          ),
      },
    ],
  },
];
