import { validateEnvironment } from './environment';

const validEnvironment = {
  NODE_ENV: 'test',
  DATABASE_HOST: '127.0.0.1',
  DATABASE_USER: 'fina_test',
  DATABASE_PASSWORD: 'local-test-password',
  DATABASE_NAME: 'fina_test',
  SUPABASE_URL: 'https://fina-test.supabase.co',
  SUPABASE_JWT_SECRET: 'local-test-jwt-secret',
  CORS_ORIGINS: 'http://localhost:5173,http://127.0.0.1:5173',
};

describe('validateEnvironment', () => {
  it('parses typed local configuration', () => {
    const environment = validateEnvironment(validEnvironment);

    expect(environment.DATABASE_PORT).toBe(5432);
    expect(environment.DATABASE_SSL).toBe(false);
    expect(environment.CORS_ORIGINS).toEqual([
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ]);
  });

  it('accepts and normalizes the existing Supabase connection-string variable', () => {
    const databaseUrl = [
      'postgresql:',
      '//fina_test:local-test-password@127.0.0.1:5432/fina_test',
    ].join('');
    const environment = validateEnvironment({
      NODE_ENV: 'development',
      SUPABASE_DB_URI: databaseUrl,
      SUPABASE_URL: 'https://fina-test.supabase.co',
      SUPABASE_JWT_SECRET: 'local-test-jwt-secret',
    });

    expect(environment.DATABASE_URL).toBe(databaseUrl);
    expect(environment.CORS_ORIGINS).toEqual(['http://localhost:5173']);
  });

  it('rejects wildcard CORS configuration', () => {
    expect(() =>
      validateEnvironment({ ...validEnvironment, CORS_ORIGINS: '*' }),
    ).toThrow('CORS_ORIGINS');
  });

  it('reports field names without exposing values', () => {
    expect(() =>
      validateEnvironment({ ...validEnvironment, DATABASE_PASSWORD: '' }),
    ).toThrow('DATABASE_PASSWORD');
  });
});
