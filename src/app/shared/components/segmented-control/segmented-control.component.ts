import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  model,
  viewChildren,
} from '@angular/core';

export interface SegmentedControlOption<T> {
  readonly value: T;
  readonly label: string;
}

@Component({
  selector: 'fdr-segmented-control',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fdr-segmented" role="radiogroup" tabindex="-1" (keydown)="onKeydown($event)">
      @for (option of options(); track option.value) {
        <button
          #optionButton
          type="button"
          role="radio"
          class="fdr-segmented__option"
          [class.fdr-segmented__option--selected]="option.value === selected()"
          [attr.aria-checked]="option.value === selected()"
          [attr.tabindex]="option.value === selected() ? 0 : -1"
          (click)="select(option.value)"
        >
          {{ option.label }}
        </button>
      }
    </div>
  `,
  styleUrl: './segmented-control.component.scss',
})
export class SegmentedControlComponent<T> {
  readonly options = input.required<readonly SegmentedControlOption<T>[]>();
  readonly selected = model.required<T>();

  private readonly optionButtons = viewChildren<ElementRef<HTMLButtonElement>>('optionButton');

  select(value: T): void {
    this.selected.set(value);
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') {
      return;
    }
    event.preventDefault();
    const opts = this.options();
    const currentIndex = opts.findIndex((option) => option.value === this.selected());
    const delta = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (currentIndex + delta + opts.length) % opts.length;
    this.select(opts[nextIndex].value);
    this.optionButtons()[nextIndex]?.nativeElement.focus();
  }
}
