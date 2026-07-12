import { RouterLink, RouterLinkActive } from '@angular/router';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { LastViewedResourceService } from '../../services/last-viewed-resource.service';
import { NavGroup, navGroups as baseNavGroups } from './nav-items';

@Component({
  selector: 'fdr-app-nav',
  imports: [RouterLink, RouterLinkActive, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app-nav.component.html',
  styleUrl: './app-nav.component.scss',
})
export class AppNavComponent {
  private readonly lastViewedResourceService = inject(LastViewedResourceService);

  // O item "Recurso" só aparece no grupo Portal quando existe um último recurso
  // aberto (persistido em localStorage), e liga diretamente a esse recurso —
  // não faz sentido como link estático sem contexto nenhum.
  protected readonly navGroups = computed<readonly NavGroup[]>(() => {
    const lastViewed = this.lastViewedResourceService.lastViewed();
    if (!lastViewed) {
      return baseNavGroups;
    }
    return baseNavGroups.map((group) =>
      group.heading === 'Portal'
        ? {
            ...group,
            items: [
              group.items[0],
              group.items[1],
              { label: lastViewed.title, route: `/recursos/${lastViewed.slug}`, icon: 'file' },
              ...group.items.slice(2),
            ],
          }
        : group,
    );
  });
}
