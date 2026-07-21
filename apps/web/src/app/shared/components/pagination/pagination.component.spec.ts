import { TestBed } from '@angular/core/testing';
import { PaginationComponent } from './pagination.component';

describe('PaginationComponent', () => {
  function setup(currentPage: number, totalPages: number) {
    const fixture = TestBed.createComponent(PaginationComponent);
    fixture.componentRef.setInput('currentPage', currentPage);
    fixture.componentRef.setInput('totalPages', totalPages);
    fixture.detectChanges();
    return fixture;
  }

  it('renders a button for every page when the total is small', async () => {
    const fixture = setup(1, 5);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const pageButtons = el.querySelectorAll('.fdr-pagination__page');
    expect(pageButtons.length).toBe(5);
    expect(pageButtons[0].getAttribute('aria-current')).toBe('page');
  });

  it('collapses distant pages behind an ellipsis when the total is large', async () => {
    const fixture = setup(5, 20);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('.fdr-pagination__ellipsis').length).toBeGreaterThan(0);
    const pageButtons = Array.from(el.querySelectorAll('.fdr-pagination__page')).map((button) =>
      button.textContent?.trim(),
    );
    expect(pageButtons).toEqual(['1', '4', '5', '6', '20']);
  });

  it('disables the previous button on the first page and the next button on the last page', async () => {
    const first = setup(1, 5);
    await first.whenStable();
    const firstEl = first.nativeElement as HTMLElement;
    expect(
      (firstEl.querySelectorAll('.fdr-pagination__nav')[0] as HTMLButtonElement).disabled,
    ).toBe(true);

    const last = setup(5, 5);
    await last.whenStable();
    const lastEl = last.nativeElement as HTMLElement;
    expect((lastEl.querySelectorAll('.fdr-pagination__nav')[1] as HTMLButtonElement).disabled).toBe(
      true,
    );
  });

  it('emits pageChange with the target page when a page button is clicked', async () => {
    const fixture = setup(1, 5);
    await fixture.whenStable();
    const emitted: number[] = [];
    fixture.componentInstance.pageChange.subscribe((page) => emitted.push(page));

    const el = fixture.nativeElement as HTMLElement;
    (el.querySelectorAll('.fdr-pagination__page')[2] as HTMLButtonElement).click();

    expect(emitted).toEqual([3]);
  });

  it('emits pageChange with the next/previous page when the nav buttons are clicked', async () => {
    const fixture = setup(2, 5);
    await fixture.whenStable();
    const emitted: number[] = [];
    fixture.componentInstance.pageChange.subscribe((page) => emitted.push(page));

    const el = fixture.nativeElement as HTMLElement;
    const navButtons = el.querySelectorAll('.fdr-pagination__nav');
    (navButtons[0] as HTMLButtonElement).click();
    (navButtons[1] as HTMLButtonElement).click();

    expect(emitted).toEqual([1, 3]);
  });
});
