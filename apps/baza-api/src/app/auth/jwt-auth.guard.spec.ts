import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SupabaseAuthService } from './supabase-auth.service';

describe('JwtAuthGuard', () => {
  const getUserFromAccessToken = jest.fn();
  let guard: JwtAuthGuard;

  beforeEach(() => {
    getUserFromAccessToken.mockReset();
    guard = new JwtAuthGuard({
      getUserFromAccessToken,
    } as unknown as SupabaseAuthService);
  });

  function createContext(authHeader?: string): ExecutionContext {
    const req: { headers: Record<string, string>; user?: unknown } = {
      headers: {},
    };
    if (authHeader) {
      req.headers['authorization'] = authHeader;
    }
    return {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as ExecutionContext;
  }

  it('throws 401 when Authorization header is missing', async () => {
    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(
      UnauthorizedException
    );
  });

  it('throws 401 when token is invalid', async () => {
    getUserFromAccessToken.mockResolvedValue(null);

    await expect(
      guard.canActivate(createContext('Bearer bad-token'))
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('attaches user and returns true for valid token', async () => {
    const user = { id: 'user-1', email: 'a@b.c' };
    getUserFromAccessToken.mockResolvedValue(user);
    const ctx = createContext('Bearer good-token');
    const req = ctx.switchToHttp().getRequest<{ user?: unknown }>();

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(req.user).toBe(user);
  });
});
