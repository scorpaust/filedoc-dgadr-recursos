import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';
import { IconComponent } from '../../icon/icon.component';

let nextAccordionItemId = 0;

@Component({
  selector: 'fdr-accordion-item',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fdr-accordion-item">
      <h3 class="fdr-accordion-item__heading">
        <button
          type="button"
          class="fdr-accordion-item__trigger"
          [id]="triggerId"
          [attr.aria-expanded]="expanded()"
          [attr.aria-controls]="contentId"
          (click)="expanded.set(!expanded())"
        >
          <span>{{ title() }}</span>
          <fdr-icon
            name="chevron-down"
            class="fdr-accordion-item__chevron"
            [class.fdr-accordion-item__chevron--open]="expanded()"
          />
        </button>
      </h3>
      <div
        class="fdr-accordion-item__content"
        [class.fdr-accordion-item__content--expanded]="expanded()"
        role="region"
        [id]="contentId"
        [attr.aria-labelledby]="triggerId"
        [attr.inert]="expanded() ? null : ''"
      >
        <div class="fdr-accordion-item__content-inner">
          <ng-content />
        </div>
      </div>
    </div>
  `,
  styleUrl: './accordion-item.component.scss',
})
export class AccordionItemComponent {
  readonly title = input.required<string>();
  readonly expanded = model(false);

  protected readonly contentId = `fdr-accordion-content-${nextAccordionItemId++}`;
  protected readonly triggerId = `fdr-accordion-trigger-${this.contentId}`;
}
