import { DialogRef } from '@angular/cdk/dialog';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { debounceTime, switchMap, tap } from 'rxjs/operators';
import { DialogComponent } from '../../../shared/components/dialog/dialog.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { Resource } from '../../../shared/models';
import { ResourceMockService } from '../../resources/data/resource-mock.service';

const SEARCH_DEBOUNCE_MS = 250;
const RESULTS_PAGE_SIZE = 20;

// Diálogo simples para associar um recurso formativo mock a um pedido de suporte
// (Fase 7 — UI, tarefa D), reaproveitando o `ResourceMockService` da Fase 3.
@Component({
  selector: 'fdr-resource-picker-dialog',
  imports: [ReactiveFormsModule, DialogComponent, EmptyStateComponent, SkeletonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './resource-picker-dialog.component.html',
  styleUrl: './resource-picker-dialog.component.scss',
})
export class ResourcePickerDialogComponent {
  private readonly dialogRef = inject(
    DialogRef<Resource | undefined, ResourcePickerDialogComponent>,
  );
  private readonly resourceService = inject(ResourceMockService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly searchControl = this.formBuilder.nonNullable.control('');
  protected readonly loading = signal(true);

  private readonly query = toSignal(
    this.searchControl.valueChanges.pipe(debounceTime(SEARCH_DEBOUNCE_MS)),
    { initialValue: '' },
  );

  protected readonly results = toSignal(
    toObservable(this.query).pipe(
      tap(() => this.loading.set(true)),
      switchMap((query) =>
        this.resourceService.search({
          query,
          type: 'all',
          workflows: [],
          difficulties: [],
          sort: 'alphabetical',
          page: 1,
          pageSize: RESULTS_PAGE_SIZE,
        }),
      ),
      tap(() => this.loading.set(false)),
    ),
    { initialValue: { items: [] as readonly Resource[], total: 0 } },
  );

  protected select(resource: Resource): void {
    this.dialogRef.close(resource);
  }

  protected close(): void {
    this.dialogRef.close(undefined);
  }
}
