import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { AuthService } from '../auth/auth.service';

export interface LastViewedResource {
  readonly slug: string;
  readonly title: string;
}

type LastViewedByUser = Readonly<Record<string, LastViewedResource>>;

const STORAGE_KEY = 'fdr-last-viewed-resource';

// Guardado por utilizador (chave = AppUser.id), nunca globalmente: esta app tem uma
// ferramenta de desenvolvimento que troca de utilizador mock no mesmo browser, e o
// último recurso aberto por um utilizador não pode "vazar" para o menu de outro.
@Injectable({ providedIn: 'root' })
export class LastViewedResourceService {
  private readonly document = inject(DOCUMENT);
  private readonly authService = inject(AuthService);

  private readonly byUser = signal<LastViewedByUser>(this.readAll());

  readonly lastViewed = computed<LastViewedResource | null>(() => {
    const userId = this.authService.currentUser()?.id;
    return userId ? (this.byUser()[userId] ?? null) : null;
  });

  record(slug: string, title: string): void {
    const userId = this.authService.currentUser()?.id;
    if (!userId) {
      return;
    }
    const entry: LastViewedResource = { slug, title };
    const updated: LastViewedByUser = { ...this.byUser(), [userId]: entry };
    this.byUser.set(updated);
    this.persist(updated);
  }

  private readAll(): LastViewedByUser {
    try {
      const raw = this.document.defaultView?.localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as LastViewedByUser) : {};
    } catch {
      return {};
    }
  }

  private persist(byUser: LastViewedByUser): void {
    try {
      this.document.defaultView?.localStorage.setItem(STORAGE_KEY, JSON.stringify(byUser));
    } catch {
      // localStorage pode estar indisponível (ex. modo privado); o último recurso
      // aberto fica disponível apenas para a sessão atual.
    }
  }
}
