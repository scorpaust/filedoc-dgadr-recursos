import { A11yModule } from '@angular/cdk/a11y';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { ChangeDetectionStrategy, Component, DestroyRef, effect, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { filter } from 'rxjs';
import { ToastComponent } from '../../../shared/components/toast/toast.component';
import { NavDrawerService } from '../../services/nav-drawer.service';
import { AppFooterComponent } from '../app-footer/app-footer.component';
import { AppHeaderComponent } from '../app-header/app-header.component';
import { AppNavComponent } from '../app-nav/app-nav.component';

@Component({
  selector: 'fdr-app-shell',
  imports: [
    RouterOutlet,
    A11yModule,
    AppHeaderComponent,
    AppNavComponent,
    AppFooterComponent,
    ToastComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
})
export class AppShellComponent {
  protected readonly navDrawerService = inject(NavDrawerService);

  private lastFocusedBeforeDrawer: HTMLElement | null = null;

  constructor() {
    const router = inject(Router);
    const destroyRef = inject(DestroyRef);
    router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe(() => this.navDrawerService.close());

    // Guarda o elemento com foco (o botão que abriu a gaveta) para o devolver ao fechar
    // com Escape — o fecho por navegação (acima) não deve roubar o foco à página seguinte.
    effect(() => {
      if (this.navDrawerService.isOpen()) {
        this.lastFocusedBeforeDrawer = document.activeElement as HTMLElement | null;
      }
    });
  }

  closeDrawerOnEscape(): void {
    this.navDrawerService.close();
    this.lastFocusedBeforeDrawer?.focus();
  }
}
