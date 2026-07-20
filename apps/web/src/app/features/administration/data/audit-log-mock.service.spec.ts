import { firstValueFrom } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { AuditLogMockService } from './audit-log-mock.service';

describe('AuditLogMockService', () => {
  let service: AuditLogMockService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuditLogMockService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('lists the illustrative mock entries, most recent first', async () => {
    const promise = firstValueFrom(service.list());
    await vi.advanceTimersByTimeAsync(300);
    const entries = await promise;

    expect(entries.length).toBeGreaterThan(0);
    const timestamps = entries.map((entry) => entry.createdAt);
    expect(timestamps).toEqual([...timestamps].sort().reverse());
  });

  it('includes a role-change entry, consistent with users accumulating more than one role', async () => {
    const promise = firstValueFrom(service.list());
    await vi.advanceTimersByTimeAsync(300);
    const entries = await promise;

    expect(
      entries.some(
        (entry) => entry.entityType === 'utilizador' && entry.action.includes('Administrador'),
      ),
    ).toBe(true);
  });
});
