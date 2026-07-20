import { RouterLink } from '@angular/router';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AuthService } from '../../auth/auth.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { NavDrawerService } from '../../services/nav-drawer.service';
import { ThemeService } from '../../services/theme.service';
import { UserMenuComponent } from '../user-menu/user-menu.component';

@Component({
  selector: 'fdr-app-header',
  imports: [RouterLink, IconComponent, UserMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.scss',
})
export class AppHeaderComponent {
  protected readonly themeService = inject(ThemeService);
  protected readonly navDrawerService = inject(NavDrawerService);
  protected readonly authService = inject(AuthService);

  protected readonly themeToggleLabel = computed(() =>
    this.themeService.theme() === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro',
  );
}
