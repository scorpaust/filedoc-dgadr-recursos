import { RouterLink, RouterLinkActive } from '@angular/router';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { navGroups } from './nav-items';

@Component({
  selector: 'fdr-app-nav',
  imports: [RouterLink, RouterLinkActive, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app-nav.component.html',
  styleUrl: './app-nav.component.scss',
})
export class AppNavComponent {
  protected readonly navGroups = navGroups;
}
