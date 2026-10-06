import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { SupabaseAuthGuard } from './supabase-auth.guard';

const testSecret = 'local-test-jwt-secret';
const testUrl = 'https://fina-test.supabase.co';

function contextFor(authorization?: string, method = 'GET'): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        method,
        headers: authorization ? { authorization } : {},
      }),
    }),
  } as ExecutionContext;
}

describe('SupabaseAuthGuard', () => {
  const guard = new SupabaseAuthGuard(
    new ConfigService({
      SUPABASE_JWT_SECRET: testSecret,
      SUPABASE_URL: testUrl,
    }),
  );

  it('rejects a missing identity', async () => {
    await expect(guard.canActivate(contextFor())).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects an invalid token', async () => {
    await expect(
      guard.canActivate(contextFor('Bearer invalid')),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('accepts a token signed by the configured identity provider secret', async () => {
    const token = jwt.sign(
      { sub: 'user-1', role: 'authenticated', email: 'user@example.com' },
      testSecret,
      {
        expiresIn: '1m',
        audience: 'authenticated',
        issuer: `${testUrl}/auth/v1`,
      },
    );

    await expect(
      guard.canActivate(contextFor(`Bearer ${token}`)),
    ).resolves.toBe(true);
  });

  it('rejects anonymous Supabase identities', async () => {
    const token = jwt.sign(
      {
        sub: 'user-1',
        role: 'authenticated',
        is_anonymous: true,
      },
      testSecret,
      {
        expiresIn: '1m',
        audience: 'authenticated',
        issuer: `${testUrl}/auth/v1`,
      },
    );

    await expect(
      guard.canActivate(contextFor(`Bearer ${token}`)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a token issued for another audience', async () => {
    const token = jwt.sign(
      { sub: 'user-1', role: 'authenticated' },
      testSecret,
      {
        expiresIn: '1m',
        audience: 'other',
        issuer: `${testUrl}/auth/v1`,
      },
    );

    await expect(
      guard.canActivate(contextFor(`Bearer ${token}`)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('allows CORS preflight without a token', async () => {
    await expect(
      guard.canActivate(contextFor(undefined, 'OPTIONS')),
    ).resolves.toBe(true);
  });
});
