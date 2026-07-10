import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { AppUser } from '../../../shared/models';
import { AuthService } from '../../auth/auth.service';
import { UserMenuComponent } from './user-menu.component';

const mockUser: AppUser = {
  id: 'user-1',
  name: 'Marta Silva',
  email: 'marta.silva@dgadr.gov.pt',
  career: 'Técnico Superior',
  role: 'EMPLOYEE',
  status: 'active',
  lastAccess: '2026-07-08',
};

describe('UserMenuComponent', () => {
  beforeEach(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('renders the user name and initials', async () => {
    const fixture = TestBed.createComponent(UserMenuComponent);
    fixture.componentRef.setInput('user', mockUser);
    fixture.detectChanges();
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.fdr-user-menu__name')?.textContent).toContain('Marta Silva');
    expect(el.querySelector('.fdr-user-menu__avatar')?.textContent).toBe('MS');
  });

  it('opens the menu panel when the trigger is clicked', async () => {
    const fixture = TestBed.createComponent(UserMenuComponent);
    fixture.componentRef.setInput('user', mockUser);
    fixture.detectChanges();
    await fixture.whenStable();

    (fixture.nativeElement.querySelector('.fdr-user-menu__trigger') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance['isOpen']()).toBe(true);
  });

  it('calls AuthService.logout when "Terminar sessão" is triggered', async () => {
    const fixture = TestBed.createComponent(UserMenuComponent);
    fixture.componentRef.setInput('user', mockUser);
    fixture.detectChanges();
    await fixture.whenStable();

    const authService = TestBed.inject(AuthService);
    const logoutSpy = vi.spyOn(authService, 'logout').mockImplementation(() => undefined);

    fixture.componentInstance.logout();

    expect(logoutSpy).toHaveBeenCalled();
    expect(fixture.componentInstance['isOpen']()).toBe(false);
  });
});
