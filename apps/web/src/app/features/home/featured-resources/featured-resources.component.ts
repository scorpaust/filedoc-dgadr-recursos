import { toSignal } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { ResourceCardComponent } from '../../../shared/components/resource-card/resource-card.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { ResourceMockService } from '../../resources/data/resource-mock.service';

export const FEATURED_RESOURCES_LIMIT = 4;

// "Recursos em destaque" (Fase 10 — UI). Carrega de forma independente das restantes
// secções da página inicial: a sua demora simulada nunca bloqueia "Recursos recentes"
// nem "Os meus pedidos".
@Component({
  selector: 'fdr-featured-resources',
  imports: [ResourceCardComponent, SkeletonComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './featured-resources.component.html',
  styleUrl: './featured-resources.component.scss',
})
export class FeaturedResourcesComponent {
  private readonly resourceService = inject(ResourceMockService);

  protected readonly skeletonPlaceholders = Array.from(
    { length: FEATURED_RESOURCES_LIMIT },
    (_, index) => index,
  );

  private readonly resources = toSignal(
    this.resourceService.listFeatured(FEATURED_RESOURCES_LIMIT),
    { initialValue: undefined },
  );

  protected readonly loading = computed(() => this.resources() === undefined);
  protected readonly items = computed(() => this.resources() ?? []);
  protected readonly isEmpty = computed(() => !this.loading() && this.items().length === 0);
}
