import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { patchNestJsSwagger } from 'nestjs-zod';
import { INestApplication } from '@nestjs/common';
import { Request, Response } from 'express';
import { ExpressAdapter } from '@nestjs/platform-express';

let app: INestApplication;

async function bootstrap() {
  if (!app) {
    app = await NestFactory.create(AppModule, new ExpressAdapter());

    app.enableCors({
      origin: '*',
    });

    // Patch Swagger to support Zod schemas
    patchNestJsSwagger();

    const swaggerConfig = new DocumentBuilder()
      .setTitle('Finance API')
      .setDescription('API for the Finance app')
      .setVersion('1.0')
      .addTag('finance')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'Authorization',
          description: 'Enter JWT token here',
          in: 'header',
        },
        'access-token',
      )
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);
    document.security = [{ 'access-token': [] }];
    SwaggerModule.setup('api', app, document);

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
