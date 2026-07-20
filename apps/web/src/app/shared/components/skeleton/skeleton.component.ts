import { ChangeDetectionStrategy, Component, input } from '@angular/core';

export type SkeletonVariant = 'text' | 'card' | 'circle';

@Component({
  selector: 'fdr-skeleton',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="fdr-skeleton"
      [class.fdr-skeleton--text]="variant() === 'text'"
      [class.fdr-skeleton--card]="variant() === 'card'"
      [class.fdr-skeleton--circle]="variant() === 'circle'"
      [style.width]="width()"
      [style.height]="height()"
      aria-hidden="true"
    ></span>
  `,
  styleUrl: './skeleton.component.scss',
})
export class SkeletonComponent {
  readonly variant = input<SkeletonVariant>('text');
  readonly width = input<string | undefined>(undefined);
  readonly height = input<string | undefined>(undefined);
}
