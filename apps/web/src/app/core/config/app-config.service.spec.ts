import { TestBed } from '@angular/core/testing';
import { AppConfigService } from './app-config.service';

describe('AppConfigService', () => {
  afterEach(() => {
    delete window.__env;
  });

  it('uses the API URL injected via window.__env when present', () => {
    window.__env = { apiUrl: 'https://api.exemplo.pt/api/v1' };

    const service = TestBed.inject(AppConfigService);

    expect(service.apiUrl).toBe('https://api.exemplo.pt/api/v1');
  });

  it('falls back to the local development API URL when window.__env is absent', () => {
    const service = TestBed.inject(AppConfigService);

    expect(service.apiUrl).toBe('http://localhost:3000/api/v1');
  });
});
