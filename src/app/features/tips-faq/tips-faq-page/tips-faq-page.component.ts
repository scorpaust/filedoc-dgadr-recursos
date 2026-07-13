import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AccordionComponent } from '../../../shared/components/accordion/accordion.component';
import { AccordionItemComponent } from '../../../shared/components/accordion/accordion-item/accordion-item.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { TipCardComponent } from '../../../shared/components/tip-card/tip-card.component';
import { Faq, Tip } from '../../../shared/models';
import { TipsFaqMockService } from '../data/tips-faq-mock.service';

interface FaqGroup {
  readonly category: string | undefined;
  readonly faqs: readonly Faq[];
}

interface TipsFaqData {
  readonly tips: readonly Tip[];
  readonly faqs: readonly Faq[];
}

const EMPTY_DATA: TipsFaqData = { tips: [], faqs: [] };
const TIP_SKELETON_COUNT = 4;

@Component({
  selector: 'fdr-tips-faq-page',
  imports: [
    SkeletonComponent,
    EmptyStateComponent,
    TipCardComponent,
    AccordionComponent,
    AccordionItemComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tips-faq-page.component.html',
  styleUrl: './tips-faq-page.component.scss',
})
export class TipsFaqPageComponent {
  private readonly tipsFaqService = inject(TipsFaqMockService);

  protected readonly loading = signal(true);
  protected readonly tipSkeletonPlaceholders = Array.from(
    { length: TIP_SKELETON_COUNT },
    (_, index) => index,
  );

  private readonly data = toSignal(
    forkJoin({
      tips: this.tipsFaqService.getTips(),
      faqs: this.tipsFaqService.getFaqs(),
    }).pipe(tap(() => this.loading.set(false))),
    { initialValue: EMPTY_DATA },
  );

  protected readonly tips = computed(() => this.data().tips);
  protected readonly faqGroups = computed<readonly FaqGroup[]>(() =>
    this.groupFaqsByCategory(this.data().faqs),
  );
  protected readonly isEmpty = computed(
    () => !this.loading() && this.tips().length === 0 && this.data().faqs.length === 0,
  );

  private groupFaqsByCategory(faqs: readonly Faq[]): readonly FaqGroup[] {
    const groups = new Map<string | undefined, Faq[]>();
    for (const faq of faqs) {
      const group = groups.get(faq.category);
      if (group) {
        group.push(faq);
      } else {
        groups.set(faq.category, [faq]);
      }
    }
    return Array.from(groups.entries()).map(([category, items]) => ({ category, faqs: items }));
  }
}
