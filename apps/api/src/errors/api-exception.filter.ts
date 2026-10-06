import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';

type ErrorBody = {
  code: string;
  message: string;
  details?: unknown;
  requestId: string;
};

const errorCodes: Partial<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: 'INVALID_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'AUTHENTICATION_REQUIRED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'RESOURCE_NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'VALIDATION_FAILED',
  [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMITED',
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const request = host.switchToHttp().getRequest<Request>();
    const requestId = randomUUID();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const body: ErrorBody = {
      code: this.safeCode(exception) ?? errorCodes[status] ?? 'INTERNAL_ERROR',
      message:
        status === 500
          ? 'An unexpected error occurred'
          : this.safeMessage(exception, status),
      requestId,
    };
    const details = this.safeDetails(exception);
    if (details !== undefined) body.details = details;

    response.setHeader('X-Request-Id', requestId);
    response.status(status).json(body);

    // The request method/path and opaque identifier are safe to retain. The
    // exception itself may contain SQL or customer data and is never logged.
    if (status >= 500) {
      console.error(
        `[${requestId}] ${request.method} ${request.path} failed unexpectedly`,
      );
    }
  }

  private safeCode(exception: unknown): string | undefined {
    if (!(exception instanceof HttpException)) return undefined;
    const response = exception.getResponse();
    if (!response || typeof response !== 'object') return undefined;
    const code = (response as { code?: unknown }).code;
    return typeof code === 'string' && /^[A-Z][A-Z0-9_]{2,63}$/.test(code)
      ? code
      : undefined;
  }

  private safeMessage(exception: unknown, status: number): string {
    if (!(exception instanceof HttpException)) {
      return 'An unexpected error occurred';
    }
    const response = exception.getResponse();
    if (typeof response === 'string') return response;
    if (
      response &&
      typeof response === 'object' &&
      typeof (response as { message?: unknown }).message === 'string'
    ) {
      return (response as { message: string }).message;
    }
    return HttpStatus[status] ?? 'Request failed';
  }

  private safeDetails(exception: unknown): unknown {
    if (!(exception instanceof HttpException)) return undefined;
    const response = exception.getResponse();
    if (!response || typeof response !== 'object') return undefined;
    const message = (response as { message?: unknown }).message;
    if (Array.isArray(message)) return { fields: message };
    return (response as { details?: unknown }).details;
  }
}
