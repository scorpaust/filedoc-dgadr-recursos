import { IconName } from '../../../shared/components/icon/icon.component';

export interface NavItem {
  readonly label: string;
  readonly route: string;
  readonly icon: IconName;
}

export interface NavGroup {
  readonly heading: string;
  readonly items: readonly NavItem[];
}

// Os itens do grupo "Gestão" ficam visíveis para todos os utilizadores nesta fase.
// A autorização real por função é aplicada numa fase posterior, tanto no frontend
// como, sobretudo, no backend — a interface nunca é, por si só, uma fronteira de segurança.
export const navGroups: readonly NavGroup[] = [
  {
    heading: 'Portal',
    items: [
      { label: 'Início', route: '/inicio', icon: 'home' },
      { label: 'Catálogo', route: '/recursos', icon: 'grid' },
      { label: 'Recurso', route: '/recursos/res-1', icon: 'file' },
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
      { label: 'Gestão de suporte', route: '/suporte/gestao', icon: 'clipboard' },
      { label: 'Conteúdos', route: '/conteudos', icon: 'folder' },
      { label: 'Administração', route: '/administracao', icon: 'shield' },
    ],
  },
];
