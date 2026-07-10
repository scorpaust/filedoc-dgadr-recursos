import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'fdr-app-footer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="fdr-app-footer">
      <span>Filedoc Recursos Formativos — protótipo visual, sem dados reais</span>
      <span>DGADR</span>
    </footer>
  `,
  styleUrl: './app-footer.component.scss',
})
export class AppFooterComponent {}
