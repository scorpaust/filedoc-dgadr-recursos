import { ActivatedRoute } from '@angular/router';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
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

const VALID_TABS: readonly ContentTab[] = ['resources', 'tips-faq', 'taxonomies'];

// O parâmetro `tab` (opcional) permite chegar diretamente a um separador — usado pelo
// atalho "Gerir →" do resumo de taxonomias na Administração (Fase 9 — UI).
function initialTabFrom(route: ActivatedRoute): ContentTab {
  const requested = route.snapshot.queryParamMap.get('tab');
  return VALID_TABS.includes(requested as ContentTab) ? (requested as ContentTab) : 'resources';
}

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
  private readonly route = inject(ActivatedRoute);

  protected readonly tabOptions = TAB_OPTIONS;
  protected readonly activeTab = signal<ContentTab>(initialTabFrom(this.route));
}
