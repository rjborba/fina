import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { Algorithm, JwtPayload } from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';
import { AuthenticatedRequest } from './auth/authenticated-user';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  private readonly supabaseUrl: string;
  private readonly jwks: JwksClient;

  constructor(private readonly configService: ConfigService) {
    this.supabaseUrl = this.configService
      .getOrThrow<string>('SUPABASE_URL')
      .replace(/\/$/, '');
    this.jwks = new JwksClient({
      jwksUri: `${this.supabaseUrl}/auth/v1/.well-known/jwks.json`,
      cache: true,
      rateLimit: true,
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    if (request.method === 'OPTIONS') return true;

    const authHeader = request.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    const match = /^Bearer (\S+)$/.exec(authHeader);
    if (!match) {
      throw new UnauthorizedException('Invalid Authorization header');
    }

    try {
      const payload = await this.verifyToken(match[1]);
      if (
        typeof payload.sub !== 'string' ||
        payload.role !== 'authenticated' ||
        payload.is_anonymous === true
      ) {
        throw new Error('Required identity claims are missing');
      }

      (request as AuthenticatedRequest).auth = {
        id: payload.sub,
        ...(typeof payload.email === 'string' ? { email: payload.email } : {}),
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private async verifyToken(token: string): Promise<JwtPayload> {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded === 'string') {
      throw new Error('Invalid token');
    }

    const algorithm = decoded.header.alg as Algorithm;
    let verificationKey: string;
    if (algorithm === 'HS256') {
      verificationKey = this.configService.getOrThrow<string>(
        'SUPABASE_JWT_SECRET',
      );
    } else if (
      ['RS256', 'ES256'].includes(algorithm) &&
      typeof decoded.header.kid === 'string'
    ) {
      const signingKey = await this.jwks.getSigningKey(decoded.header.kid);
      verificationKey = signingKey.getPublicKey();
    } else {
      throw new Error('Unsupported signing algorithm');
    }

    const payload = jwt.verify(token, verificationKey, {
      algorithms: [algorithm],
      audience: 'authenticated',
      issuer: `${this.supabaseUrl}/auth/v1`,
    });
    if (typeof payload === 'string') throw new Error('Invalid token payload');
    return payload;
  }
}
