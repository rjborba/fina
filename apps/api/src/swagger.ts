import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { patchNestJsSwagger } from 'nestjs-zod';

export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  patchNestJsSwagger();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Fina API')
    .setDescription('API for the Fina financial collaboration app')
    .setVersion('0.0.0')
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
  return document;
}

export function setupSwagger(app: INestApplication): void {
  SwaggerModule.setup('api', app, createOpenApiDocument(app));
}
