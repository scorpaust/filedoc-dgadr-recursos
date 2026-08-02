import { Router, RouterLink } from '@angular/router';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AuthService } from '../../auth/auth.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { NavDrawerService } from '../../services/nav-drawer.service';
import { ThemeService } from '../../services/theme.service';
import { UserMenuComponent } from '../user-menu/user-menu.component';

@Component({
  selector: 'fdr-app-header',
  imports: [RouterLink, ReactiveFormsModule, IconComponent, UserMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.scss',
})
export class AppHeaderComponent {
  private readonly router = inject(Router);

  protected readonly themeService = inject(ThemeService);
  protected readonly navDrawerService = inject(NavDrawerService);
  protected readonly authService = inject(AuthService);

  protected readonly themeToggleLabel = computed(() =>
    this.themeService.theme() === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro',
  );

  // Bug corrigido: este campo nunca tinha estado ligado a nada desde a Fase 1 — UI (Design
  // System & Casca da Aplicação) — um `<input type="search">` puramente decorativo, sem
  // `(ngSubmit)`/serviço nenhum, apesar de visível e "clicável" em todas as páginas. Mesma
  // navegação já usada pela pesquisa rápida da Página Inicial (`HomePageComponent`) — quem
  // pesquisa efetivamente é sempre o Catálogo (Fase 3 — UI).
  protected readonly searchForm = new FormGroup({
    query: new FormControl('', { nonNullable: true }),
  });

  protected onSearchSubmit(): void {
    const term = this.searchForm.controls.query.value.trim();
    this.router.navigate(['/recursos'], { queryParams: { q: term.length > 0 ? term : null } });
  }
}
