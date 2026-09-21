import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { SupabaseAuthGuard } from './supabase-auth.guard';

const testSecret = 'local-test-jwt-secret';

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
    new ConfigService({ SUPABASE_JWT_SECRET: testSecret }),
  );

  it('rejects a missing identity', () => {
    expect(() => guard.canActivate(contextFor())).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects an invalid token', () => {
    expect(() => guard.canActivate(contextFor('Bearer invalid'))).toThrow(
      UnauthorizedException,
    );
  });

  it('accepts a token signed by the configured identity provider secret', () => {
    const token = jwt.sign({ sub: 'user-1' }, testSecret, { expiresIn: '1m' });

    expect(guard.canActivate(contextFor(`Bearer ${token}`))).toBe(true);
  });

  it('allows CORS preflight without a token', () => {
    expect(guard.canActivate(contextFor(undefined, 'OPTIONS'))).toBe(true);
  });
});
