import { Router } from '@angular/router';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'fdr-not-found-page',
  imports: [EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fdr-empty-state
      icon="alert-triangle"
      title="Página não encontrada"
      description="A página que procura não existe ou foi movida."
      actionLabel="Voltar ao início"
      (actionClicked)="goHome()"
    />
  `,
})
export class NotFoundPageComponent {
  private readonly router = inject(Router);

  goHome(): void {
    this.router.navigateByUrl('/inicio');
  }
}
