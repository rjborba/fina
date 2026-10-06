import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { Environment } from './config/environment';
import { setupSwagger } from './swagger';
import { IMPORT_LIMITS } from '@fina/types';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService<Environment, true>);

  app.useBodyParser('json', { limit: IMPORT_LIMITS.maxRequestBytes });

  app.set('query parser', 'extended');

  app.enableCors({
    origin: config.get('CORS_ORIGINS', { infer: true }),
  });

  setupSwagger(app);

  await app.listen(config.get('PORT', { infer: true }));
}
void bootstrap();
