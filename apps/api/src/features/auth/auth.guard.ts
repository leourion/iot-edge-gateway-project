import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY, REQUIRED_ROLES_KEY, SESSION_COOKIE } from './auth.constants';
import { AuthIdentity, AuthService, AuthRole } from './auth.service';

interface RequestWithHeaders {
  headers: { cookie?: string };
  user?: AuthIdentity;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<RequestWithHeaders>();
    const cookie = request.headers.cookie
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${SESSION_COOKIE}=`));
    const token = cookie?.slice(SESSION_COOKIE.length + 1);

    const identity = token ? this.authService.verifySession(token) : null;
    if (!identity) {
      throw new UnauthorizedException('Please sign in to continue.');
    }

    const requiredRoles = this.reflector.getAllAndOverride<AuthRole[]>(REQUIRED_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (requiredRoles?.length && !requiredRoles.includes(identity.role)) {
      throw new ForbiddenException('Your account does not have permission for this action.');
    }

    request.user = identity;
    return true;
  }
}
