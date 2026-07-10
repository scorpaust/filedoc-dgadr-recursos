import { A11yModule } from '@angular/cdk/a11y';
import { OverlayModule } from '@angular/cdk/overlay';
import { RouterLink } from '@angular/router';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { AppUser } from '../../../shared/models';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { PillComponent } from '../../../shared/components/pill/pill.component';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'fdr-user-menu',
  imports: [A11yModule, OverlayModule, RouterLink, IconComponent, PillComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './user-menu.component.html',
  styleUrl: './user-menu.component.scss',
})
export class UserMenuComponent {
  private readonly authService = inject(AuthService);

  private readonly triggerButton = viewChild<ElementRef<HTMLButtonElement>>('triggerButton');

  readonly user = input.required<AppUser>();

  protected readonly isOpen = signal(false);
  protected readonly initials = computed(() => this.getInitials(this.user().name));

  toggle(): void {
    this.isOpen.update((open) => !open);
  }

  close(): void {
    if (!this.isOpen()) {
      return;
    }
    this.isOpen.set(false);
    this.triggerButton()?.nativeElement.focus();
  }

  logout(): void {
    this.close();
    this.authService.logout();
  }

  private getInitials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');
  }
}
