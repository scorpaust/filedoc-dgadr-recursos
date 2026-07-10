import { TestBed } from '@angular/core/testing';
import { EmptyStateComponent } from './empty-state.component';

describe('EmptyStateComponent', () => {
  it('renders title and description without an action by default', async () => {
    const fixture = TestBed.createComponent(EmptyStateComponent);
    fixture.componentRef.setInput('title', 'Sem resultados');
    fixture.componentRef.setInput('description', 'Ajuste os filtros e tente novamente.');
    fixture.detectChanges();
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.fdr-empty-state__title')?.textContent).toContain('Sem resultados');
    expect(el.querySelector('fdr-button')).toBeNull();
  });

  it('renders and emits the optional action', async () => {
    const fixture = TestBed.createComponent(EmptyStateComponent);
    fixture.componentRef.setInput('title', 'Página não encontrada');
    fixture.componentRef.setInput('actionLabel', 'Voltar ao início');
    fixture.detectChanges();
    await fixture.whenStable();
    let emitted = 0;
    fixture.componentInstance.actionClicked.subscribe(() => emitted++);
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button).toBeTruthy();
    button.click();
    expect(emitted).toBe(1);
  });
});
