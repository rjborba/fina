import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';

const safeGenerationEnvironment = {
  NODE_ENV: 'test',
  DATABASE_HOST: '127.0.0.1',
  DATABASE_USER: 'fina_openapi',
  DATABASE_PASSWORD: 'local-openapi-only',
  DATABASE_NAME: 'fina_openapi_test',
  DATABASE_SSL: 'false',
  SUPABASE_URL: 'https://local-openapi.supabase.co',
  SUPABASE_JWT_SECRET: 'local-openapi-jwt-secret',
  CORS_ORIGINS: 'http://localhost:5173',
};

function outputPath(): string {
  const index = process.argv.indexOf('--output');
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  return resolve(value ?? 'openapi.json');
}

async function generate(): Promise<void> {
  Object.assign(process.env, safeGenerationEnvironment);

  const [{ AppModule }, { createOpenApiDocument }] = await Promise.all([
    import('../src/app.module'),
    import('../src/swagger'),
  ]);

  const app = await NestFactory.create(AppModule, {
    abortOnError: false,
    preview: true,
    logger: false,
  });
  const document = createOpenApiDocument(app);
  await writeFile(outputPath(), `${JSON.stringify(document, null, 2)}\n`);
  await app.close();
}

void generate().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : 'OpenAPI generation failed',
  );
  process.exitCode = 1;
});
