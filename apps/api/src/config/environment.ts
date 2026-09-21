import { z } from 'zod';

const booleanString = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

const corsOrigins = z.string().transform((value, context) => {
  const origins = value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0 || origins.includes('*')) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'CORS_ORIGINS must contain explicit origins and cannot use *',
    });
    return z.NEVER;
  }

  for (const origin of origins) {
    try {
      const parsed = new URL(origin);
      if (
        parsed.origin !== origin ||
        !['http:', 'https:'].includes(parsed.protocol)
      ) {
        throw new Error('not an origin');
      }
    } catch {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `CORS_ORIGINS contains an invalid origin: ${origin}`,
      });
    }
  }

  return origins;
});

export const environmentSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_HOST: z.string().min(1),
  DATABASE_PORT: z.coerce.number().int().min(1).max(65535).default(5432),
  DATABASE_USER: z.string().min(1),
  DATABASE_PASSWORD: z.string().min(1),
  DATABASE_NAME: z.string().min(1),
  DATABASE_SCHEMA: z.string().min(1).default('public'),
  DATABASE_SSL: booleanString.default('false'),
  SUPABASE_JWT_SECRET: z.string().min(16),
  CORS_ORIGINS: corsOrigins,
});

export type Environment = z.infer<typeof environmentSchema>;

export function validateEnvironment(
  input: Record<string, unknown>,
): Environment {
  const result = environmentSchema.safeParse(input);
  if (!result.success) {
    const fields = result.error.issues
      .map((issue) => issue.path.join('.') || 'environment')
      .filter((field, index, all) => all.indexOf(field) === index)
      .join(', ');
    throw new Error(`Invalid environment configuration: ${fields}`);
  }

  return result.data;
}
