import { Router, provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { LastViewedResourceService } from '../../../core/services/last-viewed-resource.service';
import { resources } from '../../../shared/mocks/resources.mock';
import { users } from '../../../shared/mocks/users.mock';
import { UserRole } from '../../../shared/models';
import { ResourceDetailPageComponent } from './resource-detail-page.component';

const VIDEO_WITH_CAPTIONS_SLUG = 'criar-um-novo-processo-de-correspondencia'; // res-1
const GUIDE_SLUG = 'assinar-um-despacho-digitalmente'; // res-2
const DRAFT_SLUG = 'corrigir-metadados-de-um-oficio'; // res-3, related to res-1

describe('ResourceDetailPageComponent', () => {
  function createFixture(role: UserRole, slug: string) {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
    const authService = TestBed.inject(AuthService);
    const user = users.find(
      (candidate) => candidate.role === role && candidate.status === 'active',
    );
    if (!user) {
      throw new Error(`No active mock user for role ${role}`);
    }
    authService.currentUser.set(user);

    const fixture = TestBed.createComponent(ResourceDetailPageComponent);
    fixture.componentRef.setInput('slug', slug);
    return fixture;
  }

  async function settle(fixture: ReturnType<typeof createFixture>) {
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(600);
    fixture.detectChanges();
  }

  beforeEach(() => {
    localStorage.removeItem('fdr-last-viewed-resource');
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows skeleton placeholders while the resource is loading', () => {
    const fixture = createFixture('EMPLOYEE', VIDEO_WITH_CAPTIONS_SLUG);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('fdr-skeleton').length).toBeGreaterThan(0);
  });

  it('shows the video player, with captions, for a video resource', async () => {
    const fixture = createFixture('EMPLOYEE', VIDEO_WITH_CAPTIONS_SLUG);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const resource = resources.find((candidate) => candidate.slug === VIDEO_WITH_CAPTIONS_SLUG)!;

    expect(el.textContent).toContain(resource.title);
    const video = el.querySelector('video') as HTMLVideoElement;
    expect(video).toBeTruthy();
    expect(video.hasAttribute('autoplay')).toBe(false);
    expect(el.querySelector('track')).toBeTruthy();
    expect(el.querySelector('fdr-pdf-viewer')).toBeFalsy();
  });

  it('shows the PDF viewer, with a download link, for a guide resource', async () => {
    const fixture = createFixture('EMPLOYEE', GUIDE_SLUG);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('iframe')).toBeTruthy();
    expect(el.querySelector('.fdr-pdf-viewer__download')).toBeTruthy();
    expect(el.querySelector('fdr-video-player video')).toBeFalsy();
  });

  it('shows resource metadata alongside the content', async () => {
    const fixture = createFixture('EMPLOYEE', GUIDE_SLUG);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const resource = resources.find((candidate) => candidate.slug === GUIDE_SLUG)!;

    expect(el.querySelector('fdr-resource-meta')).toBeTruthy();
    expect(el.textContent).toContain(resource.workflow);
  });

  it('shows related resources, filtered by visibility for the current role', async () => {
    const fixture = createFixture('EMPLOYEE', VIDEO_WITH_CAPTIONS_SLUG);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;

    // res-1 relates to res-3 (draft, hidden from EMPLOYEE) and res-2 (published).
    const guideTitle = resources.find((r) => r.slug === GUIDE_SLUG)!.title;
    const draftTitle = resources.find((r) => r.slug === DRAFT_SLUG)!.title;
    expect(el.textContent).toContain(guideTitle);
    expect(el.textContent).not.toContain(draftTitle);
  });

  it('shows a generic "not found" state for a non-existent slug', async () => {
    const fixture = createFixture('EMPLOYEE', 'nao-existe');
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Recurso não encontrado');
  });

  it('shows the same generic "not found" state for a draft resource an EMPLOYEE cannot see', async () => {
    const fixture = createFixture('EMPLOYEE', DRAFT_SLUG);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('Recurso não encontrado');
  });

  it('shows a draft resource to a CONTENT_EDITOR', async () => {
    const fixture = createFixture('CONTENT_EDITOR', DRAFT_SLUG);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const resource = resources.find((candidate) => candidate.slug === DRAFT_SLUG)!;
    expect(el.textContent).toContain(resource.title);
  });

  it('navigates to the support page, with the resource identified, when requesting support', async () => {
    const fixture = createFixture('EMPLOYEE', GUIDE_SLUG);
    await settle(fixture);
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');

    const el = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(el.querySelectorAll('button'));
    const supportButton = buttons.find((button) =>
      button.textContent?.includes('Pedir suporte sobre este tema'),
    ) as HTMLButtonElement;
    supportButton.click();

    const resource = resources.find((candidate) => candidate.slug === GUIDE_SLUG)!;
    expect(navigateSpy).toHaveBeenCalledWith(['/suporte'], {
      queryParams: { recurso: resource.slug, assunto: resource.title },
    });
  });

  it('records the resource as last viewed once it loads successfully', async () => {
    const fixture = createFixture('EMPLOYEE', VIDEO_WITH_CAPTIONS_SLUG);
    await settle(fixture);

    const lastViewedResourceService = TestBed.inject(LastViewedResourceService);
    const resource = resources.find((candidate) => candidate.slug === VIDEO_WITH_CAPTIONS_SLUG)!;
    expect(lastViewedResourceService.lastViewed()).toEqual({
      slug: resource.slug,
      title: resource.title,
    });
  });

  it('does not record anything as last viewed for a "not found" slug', async () => {
    const fixture = createFixture('EMPLOYEE', 'nao-existe');
    await settle(fixture);

    const lastViewedResourceService = TestBed.inject(LastViewedResourceService);
    expect(lastViewedResourceService.lastViewed()).toBeNull();
  });

  it('shows the real video duration in the metadata panel once the player reports it', async () => {
    const fixture = createFixture('EMPLOYEE', VIDEO_WITH_CAPTIONS_SLUG);
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;

    const video = el.querySelector('video') as HTMLVideoElement;
    Object.defineProperty(video, 'duration', { value: 65, configurable: true });
    video.dispatchEvent(new Event('loadedmetadata'));
    fixture.detectChanges();

    expect(el.textContent).toContain('1:05');
  });
});
