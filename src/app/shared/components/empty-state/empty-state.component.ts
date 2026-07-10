import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonComponent } from '../button/button.component';
import { IconComponent, IconName } from '../icon/icon.component';

@Component({
  selector: 'fdr-empty-state',
  imports: [IconComponent, ButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fdr-empty-state">
      <fdr-icon class="fdr-empty-state__icon" [name]="icon()" size="lg" />
      <h2 class="fdr-empty-state__title">{{ title() }}</h2>
      @if (description()) {
        <p class="fdr-empty-state__description">{{ description() }}</p>
      }
      @if (actionLabel()) {
        <fdr-button variant="primary" (clicked)="actionClicked.emit()">
          {{ actionLabel() }}
        </fdr-button>
      }
    </div>
  `,
  styleUrl: './empty-state.component.scss',
})
export class EmptyStateComponent {
  readonly icon = input<IconName>('info');
  readonly title = input.required<string>();
  readonly description = input<string | undefined>(undefined);
  readonly actionLabel = input<string | undefined>(undefined);
  readonly actionClicked = output<void>();
}
