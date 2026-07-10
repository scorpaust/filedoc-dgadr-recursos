import { RouterLink } from '@angular/router';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { currentUser } from '../../../shared/mocks/users.mock';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { PillComponent } from '../../../shared/components/pill/pill.component';
import { NavDrawerService } from '../../services/nav-drawer.service';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'fdr-app-header',
  imports: [RouterLink, IconComponent, PillComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app-header.component.html',
  styleUrl: './app-header.component.scss',
})
export class AppHeaderComponent {
  protected readonly themeService = inject(ThemeService);
  protected readonly navDrawerService = inject(NavDrawerService);
  protected readonly currentUser = currentUser;

  protected readonly initials = computed(() => this.getInitials(this.currentUser.name));
  protected readonly themeToggleLabel = computed(() =>
    this.themeService.theme() === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro',
  );

  private getInitials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }
}
