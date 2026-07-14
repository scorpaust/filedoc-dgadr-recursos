import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { ResourceMockService } from '../../resources/data/resource-mock.service';

export const RECENT_RESOURCES_LIMIT = 4;

const DATE_FORMATTER = new Intl.DateTimeFormat('pt-PT', { dateStyle: 'short' });

// "Recursos recentes" (Fase 10 — UI): lista compacta (não a grelha de cartões completa),
// ordenada por `updatedAt`. Carrega de forma independente das restantes secções da página
// inicial — a sua demora simulada nunca bloqueia "Recursos em destaque" nem "Os meus pedidos".
@Component({
  selector: 'fdr-recent-resources',
  imports: [RouterLink, SkeletonComponent, EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recent-resources.component.html',
  styleUrl: './recent-resources.component.scss',
})
export class RecentResourcesComponent {
  private readonly resourceService = inject(ResourceMockService);

  protected readonly skeletonPlaceholders = Array.from(
    { length: RECENT_RESOURCES_LIMIT },
    (_, index) => index,
  );

  private readonly resources = toSignal(this.resourceService.listRecent(RECENT_RESOURCES_LIMIT), {
    initialValue: undefined,
  });

  protected readonly loading = computed(() => this.resources() === undefined);
  protected readonly items = computed(() => this.resources() ?? []);
  protected readonly isEmpty = computed(() => !this.loading() && this.items().length === 0);

  protected formatDate(iso: string): string {
    return DATE_FORMATTER.format(new Date(iso));
  }
}
