import { Routes } from '@angular/router';

export const routes: Routes = [
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
    path: 'suporte/gestao',
    loadComponent: () =>
      import('./features/support/support-management-page/support-management-page.component').then(
        (m) => m.SupportManagementPageComponent,
      ),
  },
  {
    path: 'conteudos',
    loadComponent: () =>
      import('./features/content-management/content-management-page/content-management-page.component').then(
        (m) => m.ContentManagementPageComponent,
      ),
  },
  {
    path: 'administracao',
    loadComponent: () =>
      import('./features/administration/administration-page/administration-page.component').then(
        (m) => m.AdministrationPageComponent,
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
];
