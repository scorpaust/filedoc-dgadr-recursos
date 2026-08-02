import { toSignal } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { map } from 'rxjs';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ResourceCardComponent } from '../../../shared/components/resource-card/resource-card.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { ResourceService } from '../../resources/data/resource.service';

export const FEATURED_RESOURCES_LIMIT = 4;

// "Recursos em destaque" (Fase 10 — UI). Carrega de forma independente das restantes
// secções da página inicial: a sua demora simulada nunca bloqueia "Recursos recentes"
// nem "Os meus pedidos". Ligado à API real (Fase 9 — Integração): sem campo explícito
// `isFeatured` no schema, o destaque usa `sort: 'recent'` (`publishedAt` desc), decisão já
// registada na Fase 10 — UI e confirmada como suportada pelo endpoint `GET /resources`
// (Fase 3 — Integração) sem necessidade de migração.
@Component({
  selector: 'fdr-featured-resources',
  imports: [ResourceCardComponent, SkeletonComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './featured-resources.component.html',
  styleUrl: './featured-resources.component.scss',
})
export class FeaturedResourcesComponent {
  private readonly resourceService = inject(ResourceService);

  protected readonly skeletonPlaceholders = Array.from(
    { length: FEATURED_RESOURCES_LIMIT },
    (_, index) => index,
  );

  private readonly resources = toSignal(
    this.resourceService
      .search({
        query: '',
        type: 'all',
        workflows: [],
        difficulties: [],
        sort: 'recent',
        page: 1,
        pageSize: FEATURED_RESOURCES_LIMIT,
      })
      .pipe(map((result) => result.items)),
    { initialValue: undefined },
  );

  protected readonly loading = computed(() => this.resources() === undefined);
  protected readonly items = computed(() => this.resources() ?? []);
  protected readonly isEmpty = computed(() => !this.loading() && this.items().length === 0);
}
