import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import * as jwt from 'jsonwebtoken';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import { SupabaseAuthGuard } from '../src/supabase-auth.guard';

const testSecret = 'local-test-jwt-secret';
const testUrl = 'https://fina-test.supabase.co';

describe('authentication boundary (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              SUPABASE_JWT_SECRET: testSecret,
              SUPABASE_URL: testUrl,
            }),
          ],
        }),
      ],
      controllers: [AppController],
      providers: [
        AppService,
        { provide: APP_GUARD, useClass: SupabaseAuthGuard },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('rejects a request without an identity', async () => {
    await request(app.getHttpServer()).get('/').expect(401);
  });

  it('accepts a request with a token signed by configured identity provider', async () => {
    const token = jwt.sign(
      { sub: 'user-1', role: 'authenticated' },
      testSecret,
      {
        expiresIn: '1m',
        audience: 'authenticated',
        issuer: `${testUrl}/auth/v1`,
      },
    );

    await request(app.getHttpServer())
      .get('/')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect('Hello World!');
  });
});
