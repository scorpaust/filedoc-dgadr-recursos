import { TestBed } from '@angular/core/testing';
import { AuthService } from '../auth/auth.service';
import { users } from '../../shared/mocks/users.mock';
import { UserRole } from '../../shared/models';
import { LastViewedResourceService } from './last-viewed-resource.service';

const STORAGE_KEY = 'fdr-last-viewed-resource';

describe('LastViewedResourceService', () => {
  let authService: AuthService;

  function loginAs(role: UserRole): void {
    const user = users.find(
      (candidate) => candidate.role === role && candidate.status === 'active',
    );
    if (!user) {
      throw new Error(`No active mock user for role ${role}`);
    }
    authService.currentUser.set(user);
  }

  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    TestBed.configureTestingModule({});
    authService = TestBed.inject(AuthService);
  });

  it('has no last viewed resource when nothing is persisted', () => {
    loginAs('EMPLOYEE');
    const service = TestBed.inject(LastViewedResourceService);
    expect(service.lastViewed()).toBeNull();
  });

  it('has no last viewed resource when no user is logged in', () => {
    const service = TestBed.inject(LastViewedResourceService);
    service.record('assinar-um-despacho-digitalmente', 'Assinar um despacho digitalmente');
    expect(service.lastViewed()).toBeNull();
  });

  it('records the resource for the current user and persists it to localStorage', () => {
    loginAs('EMPLOYEE');
    const service = TestBed.inject(LastViewedResourceService);
    service.record('assinar-um-despacho-digitalmente', 'Assinar um despacho digitalmente');

    expect(service.lastViewed()).toEqual({
      slug: 'assinar-um-despacho-digitalmente',
      title: 'Assinar um despacho digitalmente',
    });
    expect(localStorage.getItem(STORAGE_KEY)).toContain('assinar-um-despacho-digitalmente');
  });

  it("never shows one user's last viewed resource to a different user", () => {
    const employee = users.find((u) => u.role === 'EMPLOYEE' && u.status === 'active')!;
    const editor = users.find((u) => u.role === 'CONTENT_EDITOR' && u.status === 'active')!;

    authService.currentUser.set(employee);
    const service = TestBed.inject(LastViewedResourceService);
    service.record('assinar-um-despacho-digitalmente', 'Assinar um despacho digitalmente');

    authService.currentUser.set(editor);
    expect(service.lastViewed()).toBeNull();

    authService.currentUser.set(employee);
    expect(service.lastViewed()).toEqual({
      slug: 'assinar-um-despacho-digitalmente',
      title: 'Assinar um despacho digitalmente',
    });
  });

  it("restores each user's own last viewed resource from localStorage on a fresh instance", () => {
    const employee = users.find((u) => u.role === 'EMPLOYEE' && u.status === 'active')!;
    const editor = users.find((u) => u.role === 'CONTENT_EDITOR' && u.status === 'active')!;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        [employee.id]: { slug: 'res-a-slug', title: 'Recurso A' },
        [editor.id]: { slug: 'res-b-slug', title: 'Recurso B' },
      }),
    );

    const service = TestBed.inject(LastViewedResourceService);
    authService.currentUser.set(employee);
    expect(service.lastViewed()).toEqual({ slug: 'res-a-slug', title: 'Recurso A' });
    authService.currentUser.set(editor);
    expect(service.lastViewed()).toEqual({ slug: 'res-b-slug', title: 'Recurso B' });
  });

  it('ignores malformed data in localStorage', () => {
    localStorage.setItem(STORAGE_KEY, 'not valid json');
    loginAs('EMPLOYEE');
    const service = TestBed.inject(LastViewedResourceService);
    expect(service.lastViewed()).toBeNull();
  });

  it('overwrites a previously recorded resource for the same user when a new one is viewed', () => {
    loginAs('EMPLOYEE');
    const service = TestBed.inject(LastViewedResourceService);
    service.record('res-a-slug', 'Recurso A');
    service.record('res-b-slug', 'Recurso B');
    expect(service.lastViewed()).toEqual({ slug: 'res-b-slug', title: 'Recurso B' });
  });
});
