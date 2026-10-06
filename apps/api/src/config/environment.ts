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

export const environmentSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    DATABASE_URL: z.string().url().optional(),
    SUPABASE_DB_URI: z.string().url().optional(),
    DATABASE_HOST: z.string().min(1).optional(),
    DATABASE_PORT: z.coerce.number().int().min(1).max(65535).default(5432),
    DATABASE_USER: z.string().min(1).optional(),
    DATABASE_PASSWORD: z.string().min(1).optional(),
    DATABASE_NAME: z.string().min(1).optional(),
    DATABASE_SCHEMA: z.string().min(1).default('public'),
    DATABASE_SSL: booleanString.default('false'),
    SUPABASE_URL: z.string().url(),
    SUPABASE_JWT_SECRET: z.string().min(16).optional(),
    CORS_ORIGINS: corsOrigins.default('http://localhost:5173'),
  })
  .superRefine((environment, context) => {
    if (environment.DATABASE_URL || environment.SUPABASE_DB_URI) return;

    for (const field of [
      'DATABASE_HOST',
      'DATABASE_USER',
      'DATABASE_PASSWORD',
      'DATABASE_NAME',
    ] as const) {
      if (!environment[field]) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: `${field} is required when DATABASE_URL is not configured`,
        });
      }
    }
  })
  .transform(({ SUPABASE_DB_URI, ...environment }) => ({
    ...environment,
    DATABASE_URL: environment.DATABASE_URL ?? SUPABASE_DB_URI,
  }));

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
