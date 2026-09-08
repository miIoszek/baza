import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { type Mock, vi } from 'vitest';
import { AuthService } from '../auth.service';
import { guestAuthGuard } from './guest-auth.guard';

describe('guestAuthGuard', () => {
  let auth: {
    whenReady: Mock;
    isLoggedIn: Mock;
  };
  let router: { createUrlTree: Mock };

  beforeEach(() => {
    auth = {
      whenReady: vi.fn().mockResolvedValue(undefined),
      isLoggedIn: vi.fn(),
    };
    router = {
      createUrlTree: vi.fn((commands) => ({ commands })),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('allows access when logged out', async () => {
    auth.isLoggedIn.mockReturnValue(false);

    const result = await TestBed.runInInjectionContext(() =>
      guestAuthGuard({} as never, {} as never)
    );

    expect(result).toBe(true);
  });

  it('redirects logged-in users to company profile', async () => {
    auth.isLoggedIn.mockReturnValue(true);
    const urlTree = { kind: 'profile' } as unknown as UrlTree;
    router.createUrlTree.mockReturnValue(urlTree);

    const result = await TestBed.runInInjectionContext(() =>
      guestAuthGuard({} as never, {} as never)
    );

    expect(router.createUrlTree).toHaveBeenCalledWith(['/company/profile']);
    expect(result).toBe(urlTree);
  });
});
