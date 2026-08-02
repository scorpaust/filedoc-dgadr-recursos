import { RouterLink, RouterLinkActive } from '@angular/router';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AuthService } from '../../auth/auth.service';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { hasAnyRole } from '../../../shared/models';
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
  private readonly authService = inject(AuthService);
  private readonly lastViewedResourceService = inject(LastViewedResourceService);

  // O item "Recurso" só aparece no grupo Portal quando existe um último recurso
  // aberto (persistido em localStorage), e liga diretamente a esse recurso —
  // não faz sentido como link estático sem contexto nenhum. Os itens do grupo "Gestão"
  // (nav-items.ts) só aparecem quando a função do utilizador coincide com a exigida pelo
  // `roleGuard` da respetiva rota — a navegação nunca deve mostrar um link que a própria
  // aplicação depois bloqueia com "Acesso negado"; grupos sem nenhum item visível
  // desaparecem por completo (nunca um cabeçalho "Gestão" vazio).
  protected readonly navGroups = computed<readonly NavGroup[]>(() => {
    const roles = this.authService.roles();
    const lastViewed = this.lastViewedResourceService.lastViewed();

    const withLastViewed: readonly NavGroup[] = lastViewed
      ? baseNavGroups.map((group) =>
          group.heading === 'Portal'
            ? {
                ...group,
                items: [
                  group.items[0],
                  group.items[1],
                  {
                    label: lastViewed.title,
                    route: `/recursos/${lastViewed.slug}`,
                    icon: 'file' as const,
                  },
                  ...group.items.slice(2),
                ],
              }
            : group,
        )
      : baseNavGroups;

    return withLastViewed
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => !item.roles || hasAnyRole(roles, item.roles)),
      }))
      .filter((group) => group.items.length > 0);
  });
}
