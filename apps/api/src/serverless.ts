import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { INestApplication } from '@nestjs/common';
import { Request, Response } from 'express';
import { ExpressAdapter } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { Environment } from './config/environment';
import { setupSwagger } from './swagger';

let app: INestApplication;

async function bootstrap() {
  if (!app) {
    app = await NestFactory.create(AppModule, new ExpressAdapter());
    const config = app.get(ConfigService<Environment, true>);

    app.enableCors({
      origin: config.get('CORS_ORIGINS', { infer: true }),
    });

    setupSwagger(app);

    await app.init();
  }

  return app;
}

export default async function handler(req: Request, res: Response) {
  const app = await bootstrap();
  const expressApp = app.getHttpAdapter().getInstance() as (
    req: Request,
    res: Response,
  ) => void;

  return expressApp(req, res);
}
