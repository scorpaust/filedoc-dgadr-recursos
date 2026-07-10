import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  beforeEach(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  it('initializes from the data-theme attribute already applied to <html>', () => {
    document.documentElement.setAttribute('data-theme', 'light');
    const service = TestBed.inject(ThemeService);
    expect(service.theme()).toBe('light');
  });

  it('toggles between light and dark and updates the html attribute', () => {
    const service = TestBed.inject(ThemeService);
    const initial = service.theme();
    service.toggle();
    expect(service.theme()).not.toBe(initial);
    expect(document.documentElement.getAttribute('data-theme')).toBe(service.theme());
  });

  it('persists the chosen theme to localStorage', () => {
    const service = TestBed.inject(ThemeService);
    service.set('light');
    expect(localStorage.getItem('fdr-theme')).toBe('light');
  });
});
