import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'fdr-accordion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: ` <div class="fdr-accordion"><ng-content /></div> `,
  styleUrl: './accordion.component.scss',
})
export class AccordionComponent {}
