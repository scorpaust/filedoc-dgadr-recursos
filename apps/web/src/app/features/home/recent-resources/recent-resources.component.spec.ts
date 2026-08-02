import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { resources } from '../../../shared/mocks/resources.mock';
import { users } from '../../../shared/mocks/users.mock';
import { UserRole } from '../../../shared/models';
import { ResourceMockService } from '../../resources/data/resource-mock.service';
import { ResourceService } from '../../resources/data/resource.service';
import { RECENT_RESOURCES_LIMIT, RecentResourcesComponent } from './recent-resources.component';

describe('RecentResourcesComponent', () => {
  function createFixture(role: UserRole) {
    TestBed.configureTestingModule({
      // O componente consome `ResourceService` (API real, Fase 3 — Integração); estes testes
      // continuam a exercitar as regras de visibilidade/ordenação através do mesmo mock de
      // dados (Fase 3 — UI), só trocando qual serviço a injeção resolve.
      providers: [
        provideRouter([]),
        { provide: ResourceService, useExisting: ResourceMockService },
      ],
    });
    const authService = TestBed.inject(AuthService);
    const user = users.find(
      (candidate) => candidate.roles.includes(role) && candidate.status === 'active',
    );
    if (!user) {
      throw new Error(`No active mock user for role ${role}`);
    }
    authService.currentUser.set(user);
    return TestBed.createComponent(RecentResourcesComponent);
  }

  async function settle(fixture: ReturnType<typeof createFixture>) {
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();
  }

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the section heading', async () => {
    const fixture = createFixture('EMPLOYEE');
    await settle(fixture);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Recursos recentes');
  });

  it('shows skeleton placeholders while loading', () => {
    const fixture = createFixture('EMPLOYEE');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('fdr-skeleton').length).toBe(
      RECENT_RESOURCES_LIMIT,
    );
  });

  it('lists the most recently updated resources as links, respecting role visibility', async () => {
    const fixture = createFixture('EMPLOYEE');
    await settle(fixture);
    const items = fixture.nativeElement.querySelectorAll('.fdr-recent-resources__item');
    expect(items.length).toBe(RECENT_RESOURCES_LIMIT);
    const draftResource = resources.find((resource) => resource.status === 'draft')!;
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain(draftResource.title);
  });

  it('shows an empty state when there are no recent resources', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ResourceService, useValue: { search: () => of({ items: [], total: 0 }) } },
      ],
    });
    const authService = TestBed.inject(AuthService);
    const user = users.find(
      (candidate) => candidate.roles.includes('EMPLOYEE') && candidate.status === 'active',
    )!;
    authService.currentUser.set(user);

    const fixture = TestBed.createComponent(RecentResourcesComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('fdr-empty-state')).toBeTruthy();
  });
});
