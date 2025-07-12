import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    // Allow OPTIONS requests for CORS preflight
    if (request.method === 'OPTIONS') {
      return true;
    }

    const authHeader = request.headers['authorization'];
    if (!authHeader) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    const token = authHeader.replace(/^Bearer /, '');

    const secret = this.configService.get<string>('SUPABASE_JWT_SECRET');
    try {
      jwt.verify(token, secret!);
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
