import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Observable, combineLatest } from 'rxjs';
import { debounceTime, switchMap, tap } from 'rxjs/operators';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { DialogService } from '../../../shared/components/dialog/dialog.service';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import {
  SegmentedControlComponent,
  SegmentedControlOption,
} from '../../../shared/components/segmented-control/segmented-control.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { TagComponent, TagTone } from '../../../shared/components/tag/tag.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { EDITORIAL_STATUS_LABELS, EditorialStatus, Resource } from '../../../shared/models';
import { ResourceMockService } from '../../resources/data/resource-mock.service';
import { EDITORIAL_STATUS_TONES } from '../editorial-status-tone.util';

type StatusFilter = EditorialStatus | 'all';

const STATUS_OPTIONS: readonly SegmentedControlOption<StatusFilter>[] = [
  { value: 'all', label: 'Todos' },
  { value: 'draft', label: EDITORIAL_STATUS_LABELS.draft },
  { value: 'published', label: EDITORIAL_STATUS_LABELS.published },
  { value: 'archived', label: EDITORIAL_STATUS_LABELS.archived },
];

const SEARCH_DEBOUNCE_MS = 250;
const DATE_FORMATTER = new Intl.DateTimeFormat('pt-PT', { dateStyle: 'short' });

// Tabela de gestão de recursos (Fase 8 — UI, tarefa B), reaproveitando o `ResourceMockService`
// da Fase 3, agora estendido com operações de escrita.
@Component({
  selector: 'fdr-resource-table',
  imports: [
    RouterLink,
    ReactiveFormsModule,
    ButtonComponent,
    SegmentedControlComponent,
    SkeletonComponent,
    EmptyStateComponent,
    TagComponent,
    IconComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './resource-table.component.html',
  styleUrl: './resource-table.component.scss',
})
export class ResourceTableComponent {
  private readonly resourceService = inject(ResourceMockService);
  private readonly dialogService = inject(DialogService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly statusFilter = signal<StatusFilter>('all');
  protected readonly searchControl = this.formBuilder.nonNullable.control('');
  private readonly searchQuery = toSignal(
    this.searchControl.valueChanges.pipe(debounceTime(SEARCH_DEBOUNCE_MS)),
    { initialValue: '' },
  );

  protected readonly loading = signal(true);
  private readonly refreshTrigger = signal(0);

  protected readonly resources = toSignal(
    combineLatest([
      toObservable(this.statusFilter),
      toObservable(this.searchQuery),
      toObservable(this.refreshTrigger),
    ]).pipe(
      tap(() => this.loading.set(true)),
      switchMap(([status, query]) => this.resourceService.listAllForManagement({ status, query })),
      tap(() => this.loading.set(false)),
    ),
    { initialValue: [] as readonly Resource[] },
  );

  protected readonly hasResults = computed(() => this.resources().length > 0);

  protected statusLabel(status: EditorialStatus): string {
    return EDITORIAL_STATUS_LABELS[status];
  }

  protected statusTone(status: EditorialStatus): TagTone {
    return EDITORIAL_STATUS_TONES[status];
  }

  protected formatDate(iso: string): string {
    return DATE_FORMATTER.format(new Date(iso));
  }

  protected onSearchClear(): void {
    this.searchControl.setValue('');
    this.statusFilter.set('all');
  }

  protected createResource(): void {
    this.router.navigateByUrl('/conteudos/recursos/novo');
  }

  protected duplicate(resource: Resource): void {
    this.mutate(this.resourceService.duplicate(resource.id), 'Recurso duplicado como rascunho.');
  }

  protected togglePublish(resource: Resource): void {
    if (resource.status === 'published') {
      this.mutate(this.resourceService.unpublish(resource.id), 'Recurso despublicado.');
    } else {
      this.mutate(this.resourceService.publish(resource.id), 'Recurso publicado.');
    }
  }

  protected restore(resource: Resource): void {
    this.mutate(this.resourceService.restore(resource.id), 'Recurso restaurado como rascunho.');
  }

  protected confirmArchive(resource: Resource): void {
    const data: ConfirmDialogData = {
      title: 'Arquivar recurso',
      message: `Tem a certeza de que pretende arquivar "${resource.title}"? O recurso deixa de estar visível no catálogo.`,
      confirmLabel: 'Arquivar',
    };
    const dialogRef = this.dialogService.open<boolean, ConfirmDialogData, ConfirmDialogComponent>(
      ConfirmDialogComponent,
      { data },
    );
    dialogRef.closed.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.mutate(this.resourceService.archive(resource.id), 'Recurso arquivado.');
    });
  }

  private mutate(source: Observable<Resource>, successMessage: string): void {
    source.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        this.toastService.success(successMessage);
        this.refreshTrigger.update((n) => n + 1);
      },
      error: (error: Error) => this.toastService.error(error.message),
    });
  }
}
