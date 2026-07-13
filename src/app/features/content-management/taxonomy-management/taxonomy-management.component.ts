import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { DialogService } from '../../../shared/components/dialog/dialog.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { TAXONOMY_KIND_LABELS, Taxonomy, TaxonomyKind } from '../../../shared/models';
import { TaxonomyMockService } from '../data/taxonomy-mock.service';

const KINDS: readonly TaxonomyKind[] = ['workflow', 'documentType', 'tag'];

type NewTaxonomyForm = FormGroup<{ label: FormControl<string> }>;

// Gestão de taxonomias (fluxos, tipos de documento, etiquetas) — Fase 8 — UI, tarefa F.
@Component({
  selector: 'fdr-taxonomy-management',
  imports: [ReactiveFormsModule, ButtonComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './taxonomy-management.component.html',
  styleUrl: './taxonomy-management.component.scss',
})
export class TaxonomyManagementComponent {
  private readonly taxonomyService = inject(TaxonomyMockService);
  private readonly dialogService = inject(DialogService);
  private readonly toastService = inject(ToastService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly kinds = KINDS;
  protected readonly kindLabels = TAXONOMY_KIND_LABELS;

  private readonly refreshTrigger = signal(0);

  private readonly allTaxonomies = toSignal(
    toObservable(this.refreshTrigger).pipe(switchMap(() => this.taxonomyService.list())),
    { initialValue: [] as readonly Taxonomy[] },
  );

  protected readonly editingId = signal<string | undefined>(undefined);
  protected readonly editControl = this.formBuilder.nonNullable.control('', Validators.required);

  // Grupos (não `FormControl`s isolados) para que `[formGroup]` exponha `(ngSubmit)` via
  // `FormGroupDirective`, tal como as restantes formulários da aplicação.
  protected readonly newFormByKind: Record<TaxonomyKind, NewTaxonomyForm> = {
    workflow: this.formBuilder.nonNullable.group({ label: ['', Validators.required] }),
    documentType: this.formBuilder.nonNullable.group({ label: ['', Validators.required] }),
    tag: this.formBuilder.nonNullable.group({ label: ['', Validators.required] }),
  };

  protected itemsForKind(kind: TaxonomyKind): readonly Taxonomy[] {
    return this.allTaxonomies()
      .filter((item) => item.kind === kind)
      .sort((a, b) => a.order - b.order);
  }

  protected create(kind: TaxonomyKind): void {
    const form = this.newFormByKind[kind];
    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }
    this.run(this.taxonomyService.create(kind, form.getRawValue().label), 'Taxonomia criada.', () =>
      form.reset({ label: '' }),
    );
  }

  protected startEdit(taxonomy: Taxonomy): void {
    this.editingId.set(taxonomy.id);
    this.editControl.setValue(taxonomy.label);
  }

  protected cancelEdit(): void {
    this.editingId.set(undefined);
  }

  protected saveEdit(taxonomy: Taxonomy): void {
    if (this.editControl.invalid) {
      this.editControl.markAsTouched();
      return;
    }
    this.run(
      this.taxonomyService.update(taxonomy.id, this.editControl.value),
      'Taxonomia atualizada.',
      () => this.editingId.set(undefined),
    );
  }

  protected toggleActive(taxonomy: Taxonomy): void {
    this.run(
      this.taxonomyService.toggleActive(taxonomy.id),
      taxonomy.active ? 'Taxonomia desativada.' : 'Taxonomia ativada.',
    );
  }

  protected reorder(taxonomy: Taxonomy, direction: 'up' | 'down'): void {
    this.run(this.taxonomyService.reorder(taxonomy.id, direction), undefined);
  }

  protected confirmDelete(taxonomy: Taxonomy): void {
    const data: ConfirmDialogData = {
      title: 'Eliminar taxonomia',
      message: `Tem a certeza de que pretende eliminar "${taxonomy.label}"? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Eliminar',
    };
    const dialogRef = this.dialogService.open<boolean, ConfirmDialogData, ConfirmDialogComponent>(
      ConfirmDialogComponent,
      { data },
    );
    dialogRef.closed.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.run(this.taxonomyService.delete(taxonomy.id), 'Taxonomia eliminada.');
    });
  }

  private run<T>(
    source: Observable<T>,
    successMessage: string | undefined,
    onSuccess?: () => void,
  ): void {
    source.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => {
        if (successMessage) {
          this.toastService.success(successMessage);
        }
        onSuccess?.();
        this.refreshTrigger.update((n) => n + 1);
      },
      error: (error: Error) => this.toastService.error(error.message),
    });
  }
}
