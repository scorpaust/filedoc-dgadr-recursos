import { Params, Router, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { IconComponent, IconName } from '../../../shared/components/icon/icon.component';
import { FeaturedResourcesComponent } from '../featured-resources/featured-resources.component';
import { MyOpenTicketsComponent } from '../my-open-tickets/my-open-tickets.component';
import { RecentResourcesComponent } from '../recent-resources/recent-resources.component';

interface HomeFeatureCard {
  readonly icon: IconName;
  readonly title: string;
  readonly description: string;
  readonly routerLink: string;
  readonly queryParams: Params | null;
}

// Três cartões de funcionalidades (tarefa A da fase-10-ui-pagina-inicial.md): conteúdo
// fixo, tal como no protótipo — a única lógica associada é a própria navegação.
const FEATURE_CARDS: readonly HomeFeatureCard[] = [
  {
    icon: 'play',
    title: 'Vídeos formativos',
    description: 'Tutoriais passo a passo para os principais fluxos documentais.',
    routerLink: '/recursos',
    queryParams: { tipo: 'video' },
  },
  {
    icon: 'file',
    title: 'Guias em PDF',
    description: 'Documentos de referência para consultar sempre que precisar.',
    routerLink: '/recursos',
    queryParams: { tipo: 'guia' },
  },
  {
    icon: 'headset',
    title: 'Pedidos de suporte',
    description: 'Acompanhe os seus pedidos ou coloque uma nova questão à equipa de suporte.',
    routerLink: '/suporte',
    queryParams: null,
  },
];

// Página inicial (Fase 10 — UI), substituindo o placeholder da Fase 1. Junta o hero,
// os cartões de funcionalidades e a pesquisa rápida (estáticos, geridos por este
// componente) com três secções dinâmicas, cada uma um componente próprio que carrega
// os seus dados de forma independente das restantes (nunca bloqueando a página inteira).
@Component({
  selector: 'fdr-home-page',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    ButtonComponent,
    IconComponent,
    FeaturedResourcesComponent,
    RecentResourcesComponent,
    MyOpenTicketsComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
})
export class HomePageComponent {
  private readonly router = inject(Router);

  protected readonly featureCards = FEATURE_CARDS;
  protected readonly searchForm = new FormGroup({
    query: new FormControl('', { nonNullable: true }),
  });

  protected goToResources(): void {
    this.router.navigateByUrl('/recursos');
  }

  protected goToNewTicket(): void {
    this.router.navigateByUrl('/suporte/novo');
  }

  // Reutiliza exatamente o mesmo parâmetro de URL (`q`) já lido por
  // `ResourceCatalogPageComponent` desde a Fase 3 — esta página apenas inicia a
  // navegação, quem pesquisa efetivamente é o catálogo.
  protected onSearchSubmit(): void {
    const term = this.searchForm.controls.query.value.trim();
    this.router.navigate(['/recursos'], { queryParams: { q: term.length > 0 ? term : null } });
  }
}
