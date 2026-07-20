import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

@Component({
  selector: 'fdr-video-player',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './video-player.component.html',
  styleUrl: './video-player.component.scss',
})
export class VideoPlayerComponent {
  readonly src = input.required<string>();
  readonly title = input.required<string>();
  readonly captionsUrl = input<string | undefined>(undefined);

  // A duração exibida junto ao leitor deve refletir o ficheiro real, não um valor
  // de mock desatualizado — por isso é emitida a partir do próprio elemento <video>.
  readonly durationChange = output<number>();

  protected onLoadedMetadata(event: Event): void {
    const duration = (event.target as HTMLVideoElement).duration;
    if (Number.isFinite(duration)) {
      this.durationChange.emit(duration);
    }
  }
}
