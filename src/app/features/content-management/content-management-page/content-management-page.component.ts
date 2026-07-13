import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  SegmentedControlComponent,
  SegmentedControlOption,
} from '../../../shared/components/segmented-control/segmented-control.component';
import { ResourceTableComponent } from '../resource-table/resource-table.component';
import { TaxonomyManagementComponent } from '../taxonomy-management/taxonomy-management.component';
import { TipsFaqManagementComponent } from '../tips-faq-management/tips-faq-management.component';

type ContentTab = 'resources' | 'tips-faq' | 'taxonomies';

const TAB_OPTIONS: readonly SegmentedControlOption<ContentTab>[] = [
  { value: 'resources', label: 'Recursos' },
  { value: 'tips-faq', label: 'Dicas & FAQ' },
  { value: 'taxonomies', label: 'Taxonomias' },
];

// Página de gestão de conteúdos (Fase 8 — UI), com três sub-áreas dentro da mesma página
// (decisão registada no `fase-8-ui-gestao-conteudos.md`: mais simples do que rotas
// dedicadas nesta fase, mantendo o padrão de tabs já usado noutras páginas do protótipo).
@Component({
  selector: 'fdr-content-management-page',
  imports: [
    SegmentedControlComponent,
    ResourceTableComponent,
    TipsFaqManagementComponent,
    TaxonomyManagementComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="fdr-content-management-page">
      <h1 class="fdr-content-management-page__title">Conteúdos</h1>

      <fdr-segmented-control
        [options]="tabOptions"
        [selected]="activeTab()"
        (selectedChange)="activeTab.set($event)"
      />

      @switch (activeTab()) {
        @case ('resources') {
          <fdr-resource-table />
        }
        @case ('tips-faq') {
          <fdr-tips-faq-management />
        }
        @case ('taxonomies') {
          <fdr-taxonomy-management />
        }
      }
    </section>
  `,
  styleUrl: './content-management-page.component.scss',
})
export class ContentManagementPageComponent {
  protected readonly tabOptions = TAB_OPTIONS;
  protected readonly activeTab = signal<ContentTab>('resources');
}
