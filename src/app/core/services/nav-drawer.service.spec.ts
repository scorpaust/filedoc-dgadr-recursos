import { TestBed } from '@angular/core/testing';
import { NavDrawerService } from './nav-drawer.service';

describe('NavDrawerService', () => {
  let service: NavDrawerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NavDrawerService);
  });

  it('starts closed', () => {
    expect(service.isOpen()).toBe(false);
  });

  it('opens and closes explicitly', () => {
    service.open();
    expect(service.isOpen()).toBe(true);
    service.close();
    expect(service.isOpen()).toBe(false);
  });

  it('toggles between states', () => {
    service.toggle();
    expect(service.isOpen()).toBe(true);
    service.toggle();
    expect(service.isOpen()).toBe(false);
  });
});
