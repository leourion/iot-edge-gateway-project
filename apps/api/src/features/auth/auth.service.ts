import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SESSION_COOKIE } from './auth.constants';

const SESSION_TTL_SECONDS = 8 * 60 * 60;

export type AuthRole = 'admin' | 'user';
export interface AuthIdentity { username: string; role: AuthRole }

@Injectable()
export class AuthService {
  constructor(private readonly config: ConfigService) {}

  verifyCredentials(username: string, password: string): AuthIdentity | null {
    this.assertConfigured();
    for (const role of ['admin', 'user'] as const) {
      const expectedUsername = this.config.get<string>(`AUTH_${role.toUpperCase()}_USERNAME`) ?? '';
      const expectedPassword = this.config.get<string>(`AUTH_${role.toUpperCase()}_PASSWORD`) ?? '';
      if (this.constantTimeEquals(username, expectedUsername)
        && this.constantTimeEquals(password, expectedPassword)) {
        return { username: expectedUsername, role };
      }
    }
    return null;
  }

  createSession(identity: AuthIdentity): { token: string; maxAge: number } {
    this.assertConfigured();
    const payload = Buffer.from(JSON.stringify({
      sub: identity.username,
      role: identity.role,
      exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    })).toString('base64url');
    return { token: `${payload}.${this.sign(payload)}`, maxAge: SESSION_TTL_SECONDS };
  }

  verifySession(token: string): AuthIdentity | null {
    try {
      this.assertConfigured();
      const [payload, signature, extra] = token.split('.');
      if (!payload || !signature || extra) return null;
      if (!this.constantTimeEquals(signature, this.sign(payload))) return null;

      const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
        sub?: string;
        role?: AuthRole;
        exp?: number;
      };
      const role = session.role;
      if ((role !== 'admin' && role !== 'user') || typeof session.sub !== 'string'
        || typeof session.exp !== 'number' || session.exp <= Math.floor(Date.now() / 1000)) return null;

      const configuredUsername = this.config.get<string>(`AUTH_${role.toUpperCase()}_USERNAME`) ?? '';
      return session.sub === configuredUsername ? { username: session.sub, role } : null;
    } catch {
      return null;
    }
  }

  cookie(token: string, maxAge: number): string {
    const secure = this.config.get<string>('AUTH_COOKIE_SECURE') === 'true' ? '; Secure' : '';
    return `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`;
  }

  private assertConfigured(): void {
    const secret = this.config.get<string>('AUTH_SESSION_SECRET') ?? '';
    const adminUsername = this.config.get<string>('AUTH_ADMIN_USERNAME') ?? '';
    const adminPassword = this.config.get<string>('AUTH_ADMIN_PASSWORD') ?? '';
    const userUsername = this.config.get<string>('AUTH_USER_USERNAME') ?? '';
    const userPassword = this.config.get<string>('AUTH_USER_PASSWORD') ?? '';
    if (!adminUsername || !adminPassword || !userUsername || !userPassword
      || adminUsername === userUsername || secret.length < 32) {
      throw new ServiceUnavailableException(
        'Configure distinct admin and user credentials plus an AUTH_SESSION_SECRET of at least 32 characters in apps/api/.env.',
      );
    }
  }

  private sign(payload: string): string {
    const secret = this.config.get<string>('AUTH_SESSION_SECRET') ?? '';
    return createHmac('sha256', secret).update(payload).digest('base64url');
  }

  private constantTimeEquals(left: string, right: string): boolean {
    const leftHash = createHash('sha256').update(left).digest();
    const rightHash = createHash('sha256').update(right).digest();
    return timingSafeEqual(leftHash, rightHash);
  }
}
