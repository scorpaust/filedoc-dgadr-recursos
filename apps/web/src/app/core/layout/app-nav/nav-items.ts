import { IconName } from '../../../shared/components/icon/icon.component';
import { UserRole } from '../../../shared/models';

export interface NavItem {
  readonly label: string;
  readonly route: string;
  readonly icon: IconName;
  // Sem `roles`, o item é visível a qualquer utilizador autenticado. Quando definido, tem de
  // corresponder exatamente às funções de `data: { roles: [...] }` da rota em `app.routes.ts`
  // (mesma regra de interseção não vazia do `roleGuard`) — a navegação nunca deve mostrar um
  // link que o `roleGuard` depois bloqueia.
  readonly roles?: readonly UserRole[];
}

export interface NavGroup {
  readonly heading: string;
  readonly items: readonly NavItem[];
}

export const navGroups: readonly NavGroup[] = [
  {
    heading: 'Portal',
    items: [
      { label: 'Início', route: '/inicio', icon: 'home' },
      { label: 'Catálogo', route: '/recursos', icon: 'grid' },
      { label: 'Dicas & FAQ', route: '/dicas-faq', icon: 'lightbulb' },
    ],
  },
  {
    heading: 'Pedidos',
    items: [{ label: 'Suporte', route: '/suporte', icon: 'headset' }],
  },
  {
    heading: 'Gestão',
    items: [
      {
        label: 'Gestão de suporte',
        route: '/suporte/gestao',
        icon: 'clipboard',
        roles: ['SUPPORT_AGENT', 'ADMIN'],
      },
      {
        label: 'Conteúdos',
        route: '/conteudos',
        icon: 'folder',
        roles: ['CONTENT_EDITOR', 'ADMIN'],
      },
      { label: 'Administração', route: '/administracao', icon: 'shield', roles: ['ADMIN'] },
    ],
  },
];
