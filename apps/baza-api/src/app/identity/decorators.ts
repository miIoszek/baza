import {
  createParamDecorator,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import type { Request } from 'express';

export const IS_PUBLIC_KEY = 'identity:isPublic';
export const ROLES_KEY = 'identity:roles';

/** Every route requires a valid access token unless marked `@Public()` (fail closed). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Requires at least one of the roles. Roles are read from the DB by the guard, not from the token. */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

export type AuthenticatedUser = {
  id: string;
  email: string;
  roles: string[];
};

export type AuthedRequest = Request & { user?: AuthenticatedUser };

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const user = ctx.switchToHttp().getRequest<AuthedRequest>().user;
    if (!user) {
      // Unreachable behind the global guard; guards against a route accidentally left @Public().
      throw new Error('CurrentUser used on a route without an authenticated user');
    }
    return user;
  }
);
