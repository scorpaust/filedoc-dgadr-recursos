import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

const ELLIPSIS = -1;

function buildPageList(current: number, total: number): readonly number[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, total, current]);
  if (current - 1 >= 1) {
    pages.add(current - 1);
  }
  if (current + 1 <= total) {
    pages.add(current + 1);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const result: number[] = [];
  for (let index = 0; index < sorted.length; index++) {
    if (index > 0 && sorted[index] - sorted[index - 1] > 1) {
      result.push(ELLIPSIS);
    }
    result.push(sorted[index]);
  }
  return result;
}

@Component({
  selector: 'fdr-pagination',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav class="fdr-pagination" aria-label="Paginação de resultados">
      <button
        type="button"
        class="fdr-pagination__nav"
        [disabled]="currentPage() === 1"
        (click)="goTo(currentPage() - 1)"
        aria-label="Página anterior"
      >
        <fdr-icon name="arrow-left" size="sm" />
      </button>

      <ul class="fdr-pagination__pages">
        @for (page of pages(); track $index) {
          <li>
            @if (page === ELLIPSIS) {
              <span class="fdr-pagination__ellipsis" aria-hidden="true">…</span>
            } @else {
              <button
                type="button"
                class="fdr-pagination__page"
                [class.fdr-pagination__page--current]="page === currentPage()"
                [attr.aria-current]="page === currentPage() ? 'page' : null"
                [attr.aria-label]="'Página ' + page"
                (click)="goTo(page)"
              >
                {{ page }}
              </button>
            }
          </li>
        }
      </ul>

      <button
        type="button"
        class="fdr-pagination__nav"
        [disabled]="currentPage() === totalPages()"
        (click)="goTo(currentPage() + 1)"
        aria-label="Próxima página"
      >
        <fdr-icon name="chevron-right" size="sm" />
      </button>
    </nav>
  `,
  styleUrl: './pagination.component.scss',
})
export class PaginationComponent {
  readonly currentPage = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly pageChange = output<number>();

  protected readonly ELLIPSIS = ELLIPSIS;
  protected readonly pages = computed(() => buildPageList(this.currentPage(), this.totalPages()));

  protected goTo(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.currentPage()) {
      return;
    }
    this.pageChange.emit(page);
  }
}
