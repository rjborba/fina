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

    const secret =
      'xa8rulz0l75emu/wX26izruvVPQbT7Mu6tfG9W7FxTeYrRmcYdK434CiwUCC070n0RxLf54KuPC37YLFlgBCMA==';
    try {
      jwt.verify(token, secret);
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
