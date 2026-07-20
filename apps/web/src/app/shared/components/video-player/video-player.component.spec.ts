import { TestBed } from '@angular/core/testing';
import { VideoPlayerComponent } from './video-player.component';

describe('VideoPlayerComponent', () => {
  function setup(captionsUrl?: string) {
    const fixture = TestBed.createComponent(VideoPlayerComponent);
    fixture.componentRef.setInput('src', '/mock/resource-demo.mp4');
    fixture.componentRef.setInput('title', 'Vídeo de demonstração');
    if (captionsUrl) {
      fixture.componentRef.setInput('captionsUrl', captionsUrl);
    }
    fixture.detectChanges();
    return fixture;
  }

  it('renders a video element with controls, without autoplay, and with an accessible label', () => {
    const fixture = setup();
    const video = fixture.nativeElement.querySelector('video') as HTMLVideoElement;
    expect(video).toBeTruthy();
    expect(video.hasAttribute('controls')).toBe(true);
    expect(video.hasAttribute('autoplay')).toBe(false);
    expect(video.getAttribute('aria-label')).toBe('Vídeo de demonstração');
  });

  it('points the source at the given src', () => {
    const fixture = setup();
    const source = fixture.nativeElement.querySelector('source') as HTMLSourceElement;
    expect(source.getAttribute('src')).toBe('/mock/resource-demo.mp4');
  });

  it('does not render a captions track when none is provided', () => {
    const fixture = setup();
    expect(fixture.nativeElement.querySelector('track')).toBeFalsy();
  });

  it('renders a default captions track when one is provided', () => {
    const fixture = setup('/mock/resource-demo.vtt');
    const track = fixture.nativeElement.querySelector('track') as HTMLTrackElement;
    expect(track).toBeTruthy();
    expect(track.getAttribute('kind')).toBe('captions');
    expect(track.getAttribute('src')).toBe('/mock/resource-demo.vtt');
    expect(track.hasAttribute('default')).toBe(true);
  });

  it('emits durationChange with the real video duration once metadata loads', () => {
    const fixture = setup();
    const video = fixture.nativeElement.querySelector('video') as HTMLVideoElement;
    Object.defineProperty(video, 'duration', { value: 42, configurable: true });

    const emitted: number[] = [];
    fixture.componentInstance.durationChange.subscribe((seconds) => emitted.push(seconds));
    video.dispatchEvent(new Event('loadedmetadata'));

    expect(emitted).toEqual([42]);
  });

  it('does not emit durationChange when the duration is not a finite number', () => {
    const fixture = setup();
    const video = fixture.nativeElement.querySelector('video') as HTMLVideoElement;
    Object.defineProperty(video, 'duration', { value: NaN, configurable: true });

    const emitted: number[] = [];
    fixture.componentInstance.durationChange.subscribe((seconds) => emitted.push(seconds));
    video.dispatchEvent(new Event('loadedmetadata'));

    expect(emitted).toEqual([]);
  });
});
