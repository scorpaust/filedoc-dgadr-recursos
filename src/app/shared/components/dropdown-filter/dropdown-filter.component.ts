import { OverlayModule } from '@angular/cdk/overlay';
import { ChangeDetectionStrategy, Component, input, model, signal } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

export interface DropdownFilterOption {
  readonly value: string;
  readonly label: string;
}

@Component({
  selector: 'fdr-dropdown-filter',
  imports: [OverlayModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fdr-dropdown-filter">
      <button
        #origin="cdkOverlayOrigin"
        cdkOverlayOrigin
        type="button"
        class="fdr-dropdown-filter__trigger"
        [attr.aria-expanded]="isOpen()"
        (click)="toggle()"
        (keydown.escape)="close()"
      >
        <span>{{ label() }}</span>
        @if (selectedValues().length > 0) {
          <span class="fdr-dropdown-filter__count">{{ selectedValues().length }}</span>
        }
        <fdr-icon name="chevron-down" size="sm" />
      </button>

      <ng-template
        cdkConnectedOverlay
        [cdkConnectedOverlayOrigin]="origin"
        [cdkConnectedOverlayOpen]="isOpen()"
        [cdkConnectedOverlayHasBackdrop]="true"
        cdkConnectedOverlayBackdropClass="cdk-overlay-transparent-backdrop"
        (backdropClick)="close()"
        (detach)="close()"
      >
        <div
          class="fdr-dropdown-filter__panel"
          role="listbox"
          aria-multiselectable="true"
          tabindex="-1"
          (keydown.escape)="close()"
        >
          @for (option of options(); track option.value) {
            <label class="fdr-dropdown-filter__option">
              <input
                type="checkbox"
                [checked]="isSelected(option.value)"
                (change)="toggleOption(option.value)"
              />
              {{ option.label }}
            </label>
          }
        </div>
      </ng-template>
    </div>
  `,
  styleUrl: './dropdown-filter.component.scss',
})
export class DropdownFilterComponent {
  readonly label = input.required<string>();
  readonly options = input.required<readonly DropdownFilterOption[]>();
  readonly selectedValues = model<readonly string[]>([]);

  protected readonly isOpen = signal(false);

  toggle(): void {
    this.isOpen.update((open) => !open);
  }

  close(): void {
    this.isOpen.set(false);
  }

  isSelected(value: string): boolean {
    return this.selectedValues().includes(value);
  }

  toggleOption(value: string): void {
    const current = this.selectedValues();
    this.selectedValues.set(
      current.includes(value)
        ? current.filter((selected) => selected !== value)
        : [...current, value],
    );
  }
}
