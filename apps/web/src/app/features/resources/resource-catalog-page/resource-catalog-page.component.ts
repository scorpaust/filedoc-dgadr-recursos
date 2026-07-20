import { ActivatedRoute, Params, Router } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormControl } from '@angular/forms';
import { debounceTime, distinctUntilChanged, switchMap, tap } from 'rxjs/operators';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import {
  DropdownFilterComponent,
  DropdownFilterOption,
} from '../../../shared/components/dropdown-filter/dropdown-filter.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ResourceCardComponent } from '../../../shared/components/resource-card/resource-card.component';
import {
  SegmentedControlComponent,
  SegmentedControlOption,
} from '../../../shared/components/segmented-control/segmented-control.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { Difficulty, WORKFLOWS } from '../../../shared/models';
import { ResourceMockService } from '../data/resource-mock.service';
import {
  ResourceSearchParams,
  ResourceSearchResult,
  ResourceSortOption,
  ResourceTypeFilter,
} from '../data/resource-search.model';

const PAGE_SIZE = 12;
const EMPTY_RESULT: ResourceSearchResult = { items: [], total: 0 };

const TYPE_OPTIONS: readonly SegmentedControlOption<ResourceTypeFilter>[] = [
  { value: 'all', label: 'Todos' },
  { value: 'video', label: 'Vídeo' },
  { value: 'guide', label: 'Guia PDF' },
];

const WORKFLOW_OPTIONS: readonly DropdownFilterOption[] = WORKFLOWS.map((workflow) => ({
  value: workflow,
  label: workflow,
}));

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  iniciacao: 'Iniciação',
  intermedia: 'Intermédia',
  avancada: 'Avançada',
};
const DIFFICULTY_ORDER: readonly Difficulty[] = ['iniciacao', 'intermedia', 'avancada'];
const DIFFICULTY_OPTIONS: readonly DropdownFilterOption[] = DIFFICULTY_ORDER.map((value) => ({
  value,
  label: DIFFICULTY_LABELS[value],
}));

const TYPE_URL_VALUES: Record<Exclude<ResourceTypeFilter, 'all'>, string> = {
  video: 'video',
  guide: 'guia',
};

interface CatalogFilters {
  readonly query: string;
  readonly type: ResourceTypeFilter;
  readonly workflows: readonly string[];
  readonly difficulties: readonly Difficulty[];
  readonly sort: ResourceSortOption;
  readonly page: number;
}

@Component({
  selector: 'fdr-resource-catalog-page',
  imports: [
    ReactiveFormsModule,
    SegmentedControlComponent,
    DropdownFilterComponent,
    ButtonComponent,
    ResourceCardComponent,
    SkeletonComponent,
    EmptyStateComponent,
    PaginationComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './resource-catalog-page.component.html',
  styleUrl: './resource-catalog-page.component.scss',
})
export class ResourceCatalogPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly resourceService = inject(ResourceMockService);

  private readonly initialFilters = this.readFiltersFromUrl();

  protected readonly typeOptions = TYPE_OPTIONS;
  protected readonly workflowOptions = WORKFLOW_OPTIONS;
  protected readonly difficultyOptions = DIFFICULTY_OPTIONS;
  protected readonly skeletonPlaceholders = Array.from(
    { length: PAGE_SIZE },
    (_, index) => index,
  );

  protected readonly searchControl = new FormControl(this.initialFilters.query, {
    nonNullable: true,
  });
  protected readonly filters = signal<CatalogFilters>(this.initialFilters);
  protected readonly loading = signal(false);

  private readonly searchResult = toSignal(
    toObservable(this.filters).pipe(
      tap(() => this.loading.set(true)),
      switchMap((filters) => this.resourceService.search(this.toSearchParams(filters))),
      tap(() => this.loading.set(false)),
    ),
    { initialValue: EMPTY_RESULT },
  );

  protected readonly items = computed(() => this.searchResult().items);
  protected readonly total = computed(() => this.searchResult().total);
  protected readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / PAGE_SIZE)));
  protected readonly hasActiveFilters = computed(() => {
    const current = this.filters();
    return (
      current.query.length > 0 ||
      current.type !== 'all' ||
      current.workflows.length > 0 ||
      current.difficulties.length > 0
    );
  });
  protected readonly resultsLabel = computed(() => {
    const total = this.total();
    return total === 1 ? '1 recurso encontrado' : `${total} recursos encontrados`;
  });

  constructor() {
    this.searchControl.valueChanges
      .pipe(debounceTime(250), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((query) => this.updateFilters({ query }));
  }

  protected onTypeChange(type: ResourceTypeFilter): void {
    this.updateFilters({ type });
  }

  protected onWorkflowsChange(workflows: readonly string[]): void {
    this.updateFilters({ workflows });
  }

  protected onDifficultiesChange(values: readonly string[]): void {
    this.updateFilters({ difficulties: values as readonly Difficulty[] });
  }

  protected onSortChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as ResourceSortOption;
    this.updateFilters({ sort: value });
  }

  protected onPageChange(page: number): void {
    this.filters.update((current) => ({ ...current, page }));
    this.syncUrl();
  }

  protected onClearFilters(): void {
    this.searchControl.setValue('', { emitEvent: false });
    this.updateFilters({ query: '', type: 'all', workflows: [], difficulties: [] });
  }

  private updateFilters(patch: Partial<Omit<CatalogFilters, 'page'>>): void {
    this.filters.update((current) => ({ ...current, ...patch, page: 1 }));
    this.syncUrl();
  }

  private syncUrl(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: this.toQueryParams(this.filters()),
      replaceUrl: true,
    });
  }

  private toSearchParams(filters: CatalogFilters): ResourceSearchParams {
    return {
      query: filters.query,
      type: filters.type,
      workflows: filters.workflows,
      difficulties: filters.difficulties,
      sort: filters.sort,
      page: filters.page,
      pageSize: PAGE_SIZE,
    };
  }

  private toQueryParams(filters: CatalogFilters): Params {
    return {
      q: filters.query || null,
      tipo: filters.type === 'all' ? null : TYPE_URL_VALUES[filters.type],
      fluxo: filters.workflows.length > 0 ? [...filters.workflows] : null,
      dificuldade: filters.difficulties.length > 0 ? [...filters.difficulties] : null,
      ordenar: filters.sort === 'alphabetical' ? 'alfabetica' : null,
      pagina: filters.page > 1 ? filters.page : null,
    };
  }

  private readFiltersFromUrl(): CatalogFilters {
    const params = this.route.snapshot.queryParamMap;
    return {
      query: params.get('q') ?? '',
      type: this.parseType(params.get('tipo')),
      workflows: params.getAll('fluxo'),
      difficulties: this.parseDifficulties(params.getAll('dificuldade')),
      sort: params.get('ordenar') === 'alfabetica' ? 'alphabetical' : 'recent',
      page: this.parsePage(params.get('pagina')),
    };
  }

  private parseType(value: string | null): ResourceTypeFilter {
    if (value === 'video') {
      return 'video';
    }
    if (value === 'guia') {
      return 'guide';
    }
    return 'all';
  }

  private parseDifficulties(values: readonly string[]): readonly Difficulty[] {
    return values.filter((value): value is Difficulty =>
      (DIFFICULTY_ORDER as readonly string[]).includes(value),
    );
  }

  private parsePage(value: string | null): number {
    const page = Number(value);
    return Number.isInteger(page) && page > 0 ? page : 1;
  }
}
