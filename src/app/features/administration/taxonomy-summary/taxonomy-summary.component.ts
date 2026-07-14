import { RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { forkJoin } from 'rxjs';
import { TaxonomyMockService } from '../../content-management/data/taxonomy-mock.service';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { Taxonomy } from '../../../shared/models';

function countActive(items: readonly Taxonomy[]): number {
  return items.filter((item) => item.active).length;
}

// Widget de resumo de taxonomias (Fase 9 — UI, tarefa F), reaproveitando o
// `TaxonomyMockService` já introduzido na Fase 8 — nunca duplica os seus dados.
@Component({
  selector: 'fdr-taxonomy-summary',
  imports: [RouterLink, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './taxonomy-summary.component.html',
  styleUrl: './taxonomy-summary.component.scss',
})
export class TaxonomySummaryComponent {
  private readonly taxonomyMockService = inject(TaxonomyMockService);

  private readonly counts = toSignal(
    forkJoin({
      workflow: this.taxonomyMockService.list('workflow'),
      documentType: this.taxonomyMockService.list('documentType'),
      tag: this.taxonomyMockService.list('tag'),
    }),
    { initialValue: undefined },
  );

  protected readonly loading = computed(() => this.counts() === undefined);

  protected readonly workflowCount = computed(() => countActive(this.counts()?.workflow ?? []));
  protected readonly documentTypeCount = computed(() =>
    countActive(this.counts()?.documentType ?? []),
  );
  protected readonly tagCount = computed(() => countActive(this.counts()?.tag ?? []));
}
