import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'fdr-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly root = this.document.documentElement;

  readonly theme = signal<Theme>(this.readInitialTheme());

  constructor() {
    this.applyTheme(this.theme());
  }

  toggle(): void {
    this.set(this.theme() === 'dark' ? 'light' : 'dark');
  }

  set(theme: Theme): void {
    this.theme.set(theme);
    this.applyTheme(theme);
    this.persistTheme(theme);
  }

  private readInitialTheme(): Theme {
    return this.root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  private applyTheme(theme: Theme): void {
    this.root.setAttribute('data-theme', theme);
  }

  private persistTheme(theme: Theme): void {
    try {
      this.document.defaultView?.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // localStorage pode estar indisponível (ex. modo privado); a preferência
      // fica válida apenas para a sessão atual.
    }
  }
}
