import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { ToastService } from './toast.service';

@Component({
  selector: 'fdr-toast',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fdr-toast-container" aria-live="polite" role="status">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="fdr-toast"
          [class.fdr-toast--success]="toast.type === 'success'"
          [class.fdr-toast--error]="toast.type === 'error'"
        >
          <fdr-icon [name]="toast.type === 'success' ? 'check' : 'alert-triangle'" />
          <span class="fdr-toast__message">{{ toast.message }}</span>
          <button
            type="button"
            class="fdr-toast__close"
            aria-label="{{ 'Fechar notificação: ' + toast.message }}"
            (click)="toastService.dismiss(toast.id)"
          >
            <fdr-icon name="close" size="sm" />
          </button>
        </div>
      }
    </div>
  `,
  styleUrl: './toast.component.scss',
})
export class ToastComponent {
  protected readonly toastService = inject(ToastService);
}
