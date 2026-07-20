import { RouterLink } from '@angular/router';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Difficulty, Resource } from '../../models';
import { IconComponent } from '../icon/icon.component';
import { TagComponent } from '../tag/tag.component';

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  iniciacao: 'Iniciação',
  intermedia: 'Intermédia',
  avancada: 'Avançada',
};

@Component({
  selector: 'fdr-resource-card',
  imports: [RouterLink, IconComponent, TagComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './resource-card.component.html',
  styleUrl: './resource-card.component.scss',
})
export class ResourceCardComponent {
  readonly resource = input.required<Resource>();

  protected readonly isVideo = computed(() => this.resource().type === 'video');
  protected readonly actionLabel = computed(() => (this.isVideo() ? 'Ver vídeo' : 'Abrir guia'));
  protected readonly difficultyLabel = computed(
    () => DIFFICULTY_LABELS[this.resource().difficulty],
  );
  protected readonly metaLabel = computed(() => {
    const resource = this.resource();
    return resource.type === 'video' ? resource.duration : `${resource.pages} páginas`;
  });
}
