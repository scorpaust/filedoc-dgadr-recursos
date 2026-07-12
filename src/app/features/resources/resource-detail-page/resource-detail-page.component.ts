import { Router, RouterLink } from '@angular/router';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { of } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { LastViewedResourceService } from '../../../core/services/last-viewed-resource.service';
import { ButtonComponent } from '../../../shared/components/button/button.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { PdfViewerComponent } from '../../../shared/components/pdf-viewer/pdf-viewer.component';
import { ResourceCardComponent } from '../../../shared/components/resource-card/resource-card.component';
import { ResourceMetaComponent } from '../../../shared/components/resource-meta/resource-meta.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { VideoPlayerComponent } from '../../../shared/components/video-player/video-player.component';
import { Resource } from '../../../shared/models';
import { ResourceMockService } from '../data/resource-mock.service';

interface ResourceDetail {
  readonly resource: Resource | undefined;
  readonly related: readonly Resource[];
}

const EMPTY_DETAIL: ResourceDetail = { resource: undefined, related: [] };

@Component({
  selector: 'fdr-resource-detail-page',
  imports: [
    RouterLink,
    IconComponent,
    ButtonComponent,
    SkeletonComponent,
    EmptyStateComponent,
    VideoPlayerComponent,
    PdfViewerComponent,
    ResourceMetaComponent,
    ResourceCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './resource-detail-page.component.html',
  styleUrl: './resource-detail-page.component.scss',
})
export class ResourceDetailPageComponent {
  private readonly resourceService = inject(ResourceMockService);
  private readonly lastViewedResourceService = inject(LastViewedResourceService);
  private readonly router = inject(Router);

  readonly slug = input.required<string>();

  protected readonly loading = signal(true);
  protected readonly videoDuration = signal<number | undefined>(undefined);

  private readonly detail = toSignal(
    toObservable(this.slug).pipe(
      tap(() => {
        this.loading.set(true);
        this.videoDuration.set(undefined);
      }),
      switchMap((slug) => this.resourceService.getBySlug(slug)),
      switchMap((resource) =>
        resource
          ? this.resourceService
              .getRelated(resource.relatedResourceIds)
              .pipe(switchMap((related) => of({ resource, related })))
          : of({ resource: undefined, related: [] as readonly Resource[] }),
      ),
      tap((detail) => {
        this.loading.set(false);
        if (detail.resource) {
          this.lastViewedResourceService.record(detail.resource.slug, detail.resource.title);
        }
      }),
    ),
    { initialValue: EMPTY_DETAIL },
  );

  protected readonly resource = computed(() => this.detail().resource);
  protected readonly related = computed(() => this.detail().related);
  protected readonly notFound = computed(() => !this.loading() && this.resource() === undefined);

  protected onVideoDurationChange(seconds: number): void {
    this.videoDuration.set(seconds);
  }

  protected goToCatalog(): void {
    this.router.navigateByUrl('/recursos');
  }

  protected requestSupport(resource: Resource): void {
    this.router.navigate(['/suporte'], {
      queryParams: { recurso: resource.slug, assunto: resource.title },
    });
  }
}
