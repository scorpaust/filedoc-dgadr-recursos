import { Router } from '@angular/router';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'fdr-access-denied-page',
  imports: [EmptyStateComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fdr-empty-state
      icon="ban"
      title="Acesso não autorizado"
      description="Não tem permissões para consultar esta página. Se acredita que isto é um erro, contacte a equipa de suporte."
      actionLabel="Voltar ao início"
      (actionClicked)="goHome()"
    />
  `,
})
export class AccessDeniedPageComponent {
  private readonly router = inject(Router);

  goHome(): void {
    this.router.navigateByUrl('/inicio');
  }
}
