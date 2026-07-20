import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { TagComponent, TagTone } from '../../../shared/components/tag/tag.component';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { EDITORIAL_STATUS_LABELS, EditorialStatus, Faq, Tip } from '../../../shared/models';
import { FaqInput, TipsFaqMockService } from '../../tips-faq/data/tips-faq-mock.service';
import { EDITORIAL_STATUS_TONES } from '../editorial-status-tone.util';

interface FaqFormValue {
  readonly question: string;
  readonly answer: string;
  readonly category: string;
}

// Gestão de Dicas e Perguntas frequentes (Fase 8 — UI, tarefa E), reaproveitando o
// `TipsFaqMockService` da Fase 5, agora estendido com operações de escrita.
@Component({
  selector: 'fdr-tips-faq-management',
  imports: [ReactiveFormsModule, ButtonComponent, IconComponent, TagComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tips-faq-management.component.html',
  styleUrl: './tips-faq-management.component.scss',
})
export class TipsFaqManagementComponent {
  private readonly tipsFaqService = inject(TipsFaqMockService);
  private readonly toastService = inject(ToastService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  private readonly refreshTrigger = signal(0);

  protected readonly tips = toSignal(
    toObservable(this.refreshTrigger).pipe(switchMap(() => this.tipsFaqService.listAllTips())),
    { initialValue: [] as readonly Tip[] },
  );
  protected readonly faqs = toSignal(
    toObservable(this.refreshTrigger).pipe(switchMap(() => this.tipsFaqService.listAllFaqs())),
    { initialValue: [] as readonly Faq[] },
  );

  // Grupo (não um `FormControl` isolado) para que `[formGroup]` exponha `(ngSubmit)` via
  // `FormGroupDirective`, tal como as restantes formulários desta página.
  protected readonly newTipForm = this.formBuilder.nonNullable.group({
    text: ['', Validators.required],
  });
  protected readonly editingTipId = signal<string | undefined>(undefined);
  protected readonly editTipControl = this.formBuilder.nonNullable.control('');

  protected readonly newFaqForm = this.formBuilder.nonNullable.group({
    question: ['', Validators.required],
    answer: ['', Validators.required],
    category: [''],
  });
  protected readonly editingFaqId = signal<string | undefined>(undefined);
  protected readonly editFaqForm = this.formBuilder.nonNullable.group({
    question: ['', Validators.required],
    answer: ['', Validators.required],
    category: [''],
  });

  protected statusLabel(status: EditorialStatus): string {
    return EDITORIAL_STATUS_LABELS[status];
  }

  protected statusTone(status: EditorialStatus): TagTone {
    return EDITORIAL_STATUS_TONES[status];
  }

  protected addTip(): void {
    if (this.newTipForm.invalid) {
      this.newTipForm.markAllAsTouched();
      return;
    }
    this.run(
      this.tipsFaqService.createTip(this.newTipForm.getRawValue().text),
      'Dica criada.',
      () => this.newTipForm.reset({ text: '' }),
    );
  }

  protected startEditTip(tip: Tip): void {
    this.editingTipId.set(tip.id);
    this.editTipControl.setValue(tip.text);
  }

  protected cancelEditTip(): void {
    this.editingTipId.set(undefined);
  }

  protected saveTip(tip: Tip): void {
    if (this.editTipControl.invalid) {
      this.editTipControl.markAsTouched();
      return;
    }
    this.run(
      this.tipsFaqService.updateTip(tip.id, this.editTipControl.value),
      'Dica atualizada.',
      () => this.editingTipId.set(undefined),
    );
  }

  protected togglePublishTip(tip: Tip): void {
    const action =
      tip.status === 'published'
        ? this.tipsFaqService.unpublishTip(tip.id)
        : this.tipsFaqService.publishTip(tip.id);
    this.run(action, tip.status === 'published' ? 'Dica despublicada.' : 'Dica publicada.');
  }

  protected archiveTip(tip: Tip): void {
    this.run(this.tipsFaqService.archiveTip(tip.id), 'Dica arquivada.');
  }

  protected restoreTip(tip: Tip): void {
    this.run(this.tipsFaqService.restoreTip(tip.id), 'Dica restaurada como rascunho.');
  }

  protected reorderTip(tip: Tip, direction: 'up' | 'down'): void {
    this.run(this.tipsFaqService.reorderTip(tip.id, direction), undefined);
  }

  protected addFaq(): void {
    if (this.newFaqForm.invalid) {
      this.newFaqForm.markAllAsTouched();
      return;
    }
    this.run(
      this.tipsFaqService.createFaq(this.toFaqInput(this.newFaqForm.getRawValue())),
      'Pergunta criada.',
      () => this.newFaqForm.reset({ question: '', answer: '', category: '' }),
    );
  }

  protected startEditFaq(faq: Faq): void {
    this.editingFaqId.set(faq.id);
    this.editFaqForm.setValue({
      question: faq.question,
      answer: faq.answer,
      category: faq.category ?? '',
    });
  }

  protected cancelEditFaq(): void {
    this.editingFaqId.set(undefined);
  }

  protected saveFaq(faq: Faq): void {
    if (this.editFaqForm.invalid) {
      this.editFaqForm.markAllAsTouched();
      return;
    }
    this.run(
      this.tipsFaqService.updateFaq(faq.id, this.toFaqInput(this.editFaqForm.getRawValue())),
      'Pergunta atualizada.',
      () => this.editingFaqId.set(undefined),
    );
  }

  protected togglePublishFaq(faq: Faq): void {
    const action =
      faq.status === 'published'
        ? this.tipsFaqService.unpublishFaq(faq.id)
        : this.tipsFaqService.publishFaq(faq.id);
    this.run(action, faq.status === 'published' ? 'Pergunta despublicada.' : 'Pergunta publicada.');
  }

  protected archiveFaq(faq: Faq): void {
    this.run(this.tipsFaqService.archiveFaq(faq.id), 'Pergunta arquivada.');
  }

  protected restoreFaq(faq: Faq): void {
    this.run(this.tipsFaqService.restoreFaq(faq.id), 'Pergunta restaurada como rascunho.');
  }

  protected reorderFaq(faq: Faq, direction: 'up' | 'down'): void {
    this.run(this.tipsFaqService.reorderFaq(faq.id, direction), undefined);
  }

  private toFaqInput(value: FaqFormValue): FaqInput {
    return {
      question: value.question,
      answer: value.answer,
      category: value.category || undefined,
    };
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
