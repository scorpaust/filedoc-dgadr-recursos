import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Difficulty, Resource } from '../../models';
import { CarimboComponent } from '../carimbo/carimbo.component';
import { TagComponent } from '../tag/tag.component';

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  iniciacao: 'Iniciação',
  intermedia: 'Intermédia',
  avancada: 'Avançada',
};

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

@Component({
  selector: 'fdr-resource-meta',
  imports: [TagComponent, CarimboComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './resource-meta.component.html',
  styleUrl: './resource-meta.component.scss',
})
export class ResourceMetaComponent {
  readonly resource = input.required<Resource>();

  // Duração real do ficheiro de vídeo, lida pelo VideoPlayerComponent quando os
  // metadados carregam — substitui o valor do mock, que pode estar desatualizado
  // em relação ao ficheiro de demonstração efetivamente associado ao recurso.
  readonly liveDurationSeconds = input<number | undefined>(undefined);

  protected readonly difficultyLabel = computed(
    () => DIFFICULTY_LABELS[this.resource().difficulty],
  );
  protected readonly extentLabel = computed(() =>
    this.resource().type === 'video' ? 'Duração' : 'Extensão',
  );
  protected readonly extentValue = computed(() => {
    const resource = this.resource();
    if (resource.type === 'video') {
      const liveDuration = this.liveDurationSeconds();
      return liveDuration !== undefined ? formatDuration(liveDuration) : resource.duration;
    }
    return `${resource.pages} páginas`;
  });
}
