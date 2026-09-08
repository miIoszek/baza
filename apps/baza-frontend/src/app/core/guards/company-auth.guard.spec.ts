import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { type Mock, vi } from 'vitest';
import { AuthService } from '../auth.service';
import { companyAuthGuard } from './company-auth.guard';

describe('companyAuthGuard', () => {
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
      createUrlTree: vi.fn((commands, extras) => ({ commands, extras })),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router },
      ],
    });
  });

  it('allows access when logged in', async () => {
    auth.isLoggedIn.mockReturnValue(true);

    const result = await TestBed.runInInjectionContext(() =>
      companyAuthGuard({} as never, { url: '/company/profile' } as never)
    );

    expect(result).toBe(true);
  });

  it('redirects to login with returnUrl when logged out', async () => {
    auth.isLoggedIn.mockReturnValue(false);
    const urlTree = { kind: 'login' } as unknown as UrlTree;
    router.createUrlTree.mockReturnValue(urlTree);

    const result = await TestBed.runInInjectionContext(() =>
      companyAuthGuard({} as never, { url: '/company/inbox' } as never)
    );

    expect(router.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/company/inbox' },
    });
    expect(result).toBe(urlTree);
  });
});
