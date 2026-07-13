import { Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { of } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import {
  FileUploadComponent,
  FileUploadSelection,
} from '../../../shared/components/file-upload/file-upload.component';
import { Difficulty, Resource, ResourceType, Taxonomy } from '../../../shared/models';
import { ResourceMockService } from '../../resources/data/resource-mock.service';
import { ResourceFormInput } from '../data/resource-form-input.model';
import { TaxonomyMockService } from '../data/taxonomy-mock.service';
import { slugify } from '../slugify.util';

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  iniciacao: 'Iniciação',
  intermedia: 'Intermédia',
  avancada: 'Avançada',
};
const DIFFICULTIES: readonly Difficulty[] = ['iniciacao', 'intermedia', 'avancada'];

function basename(url: string | undefined): string | undefined {
  if (!url) {
    return undefined;
  }
  return url.split('/').pop();
}

// Formulário de criação/edição de recurso (Fase 8 — UI, tarefa C). Usado tanto em
// `/conteudos/recursos/novo` (sem `id`) como em `/conteudos/recursos/:id/editar`.
@Component({
  selector: 'fdr-resource-form-page',
  imports: [ReactiveFormsModule, ButtonComponent, FileUploadComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './resource-form-page.component.html',
  styleUrl: './resource-form-page.component.scss',
})
export class ResourceFormPageComponent {
  private readonly resourceService = inject(ResourceMockService);
  private readonly taxonomyService = inject(TaxonomyMockService);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly id = input<string | undefined>(undefined);

  protected readonly isEditMode = computed(() => !!this.id());
  protected readonly difficulties = DIFFICULTIES;
  protected readonly difficultyLabels = DIFFICULTY_LABELS;

  protected readonly isSubmitting = signal(false);
  protected readonly publishAttempted = signal(false);
  protected readonly mainFileSelection = signal<FileUploadSelection | undefined>(undefined);
  protected readonly thumbnailSelection = signal<FileUploadSelection | undefined>(undefined);

  protected readonly workflows = toSignal(this.taxonomyService.list('workflow'), {
    initialValue: [] as readonly Taxonomy[],
  });
  protected readonly documentTypes = toSignal(this.taxonomyService.list('documentType'), {
    initialValue: [] as readonly Taxonomy[],
  });

  protected readonly form = this.formBuilder.nonNullable.group({
    title: ['', Validators.required],
    slug: ['', Validators.required],
    summary: ['', Validators.required],
    description: ['', Validators.required],
    type: ['video' as ResourceType, Validators.required],
    workflow: ['', Validators.required],
    documentType: ['', Validators.required],
    difficulty: ['' as Difficulty | '', Validators.required],
    tags: [''],
    duration: [''],
    pages: [undefined as number | undefined],
    thumbnailAlt: [''],
  });

  protected readonly titleControl = this.form.controls.title;
  protected readonly slugControl = this.form.controls.slug;
  protected readonly summaryControl = this.form.controls.summary;
  protected readonly descriptionControl = this.form.controls.description;
  protected readonly typeControl = this.form.controls.type;
  protected readonly workflowControl = this.form.controls.workflow;
  protected readonly documentTypeControl = this.form.controls.documentType;
  protected readonly difficultyControl = this.form.controls.difficulty;
  protected readonly durationControl = this.form.controls.duration;
  protected readonly pagesControl = this.form.controls.pages;
  protected readonly thumbnailAltControl = this.form.controls.thumbnailAlt;

  private readonly typeValue = toSignal(this.typeControl.valueChanges, {
    initialValue: this.typeControl.value,
  });
  protected readonly isVideo = computed(() => this.typeValue() === 'video');

  private readonly existingResource = toSignal(
    toObservable(this.id).pipe(
      switchMap((id) => (id ? this.resourceService.getByIdForManagement(id) : of(undefined))),
      tap((resource) => {
        if (resource) {
          this.patchForm(resource);
        }
      }),
    ),
    { initialValue: undefined as Resource | undefined },
  );

  protected readonly currentMainFileName = computed(() =>
    this.isVideo()
      ? basename(this.existingResource()?.videoUrl)
      : basename(this.existingResource()?.pdfUrl),
  );
  protected readonly currentThumbnailFileName = computed(() =>
    basename(this.existingResource()?.thumbnailUrl),
  );

  protected readonly hasMainFile = computed(
    () => !!this.mainFileSelection() || !!this.currentMainFileName(),
  );
  protected readonly hasThumbnail = computed(
    () => !!this.thumbnailSelection() || !!this.currentThumbnailFileName(),
  );

  protected readonly canPreview = computed(() => !!this.existingResource()?.slug);
  protected readonly canUnpublish = computed(() => this.existingResource()?.status === 'published');

  constructor() {
    this.syncTypeValidators(this.typeControl.value);
    this.typeControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((type) => this.syncTypeValidators(type));
  }

  // Duração é obrigatória apenas para vídeos; páginas apenas para guias (project-spec.md,
  // secção N) — reajustado sempre que o tipo do recurso muda, incluindo ao carregar um
  // recurso existente para edição.
  private syncTypeValidators(type: ResourceType): void {
    this.durationControl.setValidators(type === 'video' ? [Validators.required] : []);
    this.durationControl.updateValueAndValidity({ emitEvent: false });
    this.pagesControl.setValidators(
      type === 'guide' ? [Validators.required, Validators.min(1)] : [],
    );
    this.pagesControl.updateValueAndValidity({ emitEvent: false });
  }

  protected isFieldInvalid(
    controlName:
      | 'title'
      | 'slug'
      | 'summary'
      | 'description'
      | 'workflow'
      | 'documentType'
      | 'difficulty'
      | 'duration'
      | 'pages',
  ): boolean {
    const control = this.form.controls[controlName];
    return control.invalid && (control.dirty || control.touched);
  }

  protected generateSlug(): void {
    this.slugControl.setValue(slugify(this.titleControl.value));
    this.slugControl.markAsDirty();
  }

  protected onMainFileSelected(selection: FileUploadSelection | undefined): void {
    this.mainFileSelection.set(selection);
  }

  protected onThumbnailSelected(selection: FileUploadSelection | undefined): void {
    this.thumbnailSelection.set(selection);
  }

  protected saveDraft(): void {
    if (this.isSubmitting()) {
      return;
    }
    if (this.titleControl.invalid || this.typeControl.invalid) {
      this.titleControl.markAsTouched();
      this.typeControl.markAsTouched();
      return;
    }
    if (!this.slugControl.value.trim()) {
      this.generateSlug();
    }
    this.save();
  }

  protected publish(): void {
    if (this.isSubmitting()) {
      return;
    }
    this.publishAttempted.set(true);
    const missingThumbnailAlt = this.hasThumbnail() && !this.thumbnailAltControl.value.trim();
    if (this.form.invalid || !this.hasMainFile() || missingThumbnailAlt) {
      this.form.markAllAsTouched();
      return;
    }
    this.save(true);
  }

  protected unpublish(): void {
    const id = this.id();
    if (!id || this.isSubmitting()) {
      return;
    }
    this.isSubmitting.set(true);
    this.resourceService
      .unpublish(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.router.navigateByUrl('/conteudos'));
  }

  protected preview(): void {
    const slug = this.existingResource()?.slug;
    if (slug) {
      this.router.navigate(['/conteudos/recursos', slug, 'pre-visualizacao']);
    }
  }

  private save(thenPublish = false): void {
    this.isSubmitting.set(true);
    const input = this.buildInput();
    const id = this.id();
    const save$ = id ? this.resourceService.update(id, input) : this.resourceService.create(input);

    save$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (resource) => {
        if (thenPublish) {
          this.resourceService
            .publish(resource.id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: () => this.router.navigateByUrl('/conteudos'),
              error: () => this.isSubmitting.set(false),
            });
        } else {
          this.router.navigateByUrl('/conteudos');
        }
      },
      error: () => this.isSubmitting.set(false),
    });
  }

  private buildInput(): ResourceFormInput {
    const raw = this.form.getRawValue();
    const existing = this.existingResource();
    const tags = raw.tags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    return {
      title: raw.title,
      slug: raw.slug,
      summary: raw.summary,
      description: raw.description,
      type: raw.type,
      workflow: raw.workflow,
      documentType: raw.documentType,
      difficulty: raw.difficulty as Difficulty,
      tags,
      duration: raw.type === 'video' ? raw.duration || undefined : undefined,
      pages: raw.type === 'guide' ? raw.pages : undefined,
      videoUrl:
        raw.type === 'video'
          ? (this.mainFileSelection()?.objectUrl ?? existing?.videoUrl)
          : undefined,
      captionsUrl: raw.type === 'video' ? existing?.captionsUrl : undefined,
      pdfUrl:
        raw.type === 'guide'
          ? (this.mainFileSelection()?.objectUrl ?? existing?.pdfUrl)
          : undefined,
      thumbnailUrl: this.thumbnailSelection()?.objectUrl ?? existing?.thumbnailUrl,
      thumbnailAlt: raw.thumbnailAlt || undefined,
    };
  }

  private patchForm(resource: Resource): void {
    this.form.patchValue({
      title: resource.title,
      slug: resource.slug,
      summary: resource.summary,
      description: resource.description,
      type: resource.type,
      workflow: resource.workflow,
      documentType: resource.documentType,
      difficulty: resource.difficulty,
      tags: resource.tags.join(', '),
      duration: resource.duration ?? '',
      pages: resource.pages,
      thumbnailAlt: resource.thumbnailAlt ?? '',
    });
  }
}
