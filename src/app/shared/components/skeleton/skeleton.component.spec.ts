import { TestBed } from '@angular/core/testing';
import { SkeletonComponent } from './skeleton.component';

describe('SkeletonComponent', () => {
  it('defaults to the text variant', async () => {
    const fixture = TestBed.createComponent(SkeletonComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const el = fixture.nativeElement.querySelector('.fdr-skeleton') as HTMLElement;
    expect(el.classList.contains('fdr-skeleton--text')).toBe(true);
    expect(el.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders the card and circle variants', async () => {
    const fixture = TestBed.createComponent(SkeletonComponent);
    fixture.componentRef.setInput('variant', 'circle');
    fixture.detectChanges();
    await fixture.whenStable();
    const el = fixture.nativeElement.querySelector('.fdr-skeleton') as HTMLElement;
    expect(el.classList.contains('fdr-skeleton--circle')).toBe(true);
  });
});
