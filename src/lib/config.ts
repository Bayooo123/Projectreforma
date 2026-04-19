import { z } from 'zod';

const envSchema = z.object({
    // Standard Node Env
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

    // Database
    DATABASE_URL: z.string().url(),

    // Authentication
    NEXTAUTH_SECRET: z.string().min(32),
    NEXTAUTH_URL: z.string().optional(),
    NEXT_PUBLIC_APP_URL: z.string().default('http://localhost:3000'),

    // External Services
    BLOB_READ_WRITE_TOKEN: z.string().optional(),
    CRON_SECRET: z.string().min(32).optional(),
    RESEND_API_KEY: z.string().optional(),
    GOOGLE_API_KEY: z.string().optional(),
    EMAIL_WEBHOOK_SECRET: z.string().optional(),


    // Email Service (Resend)
    MAIL_FROM: z.string().default('Reforma <Registration@reforma.ng>'),

    // BICA Integration
    BICA_PLATFORM_ID: z.string().default('reforma_os'),
    BICA_SHARED_SECRET: z.string().default('dev_secret_keys'),
    BICA_DISABLE_HMAC: z.preprocess((val) => val === 'true', z.boolean()).default(false),
    FLADOV_BASE_URL: z.string().url().default('https://fladov.com'),
    // ⚠️ SECURITY: exposes full error traces in API responses. NEVER enable in production.
    BICA_DEBUG_ERRORS: z.preprocess((val) => val === 'true', z.boolean()).default(false),
});

export type EnvConfig = z.infer<typeof envSchema>;

let _config: EnvConfig | null = null;

/**
 * Validates and returns the environment configuration.
 * In production, it expects process.env to be populated by the Secrets Manager.
 */
export function getConfig(): EnvConfig {
    if (_config) return _config;

    const env = Object.fromEntries(
        Object.entries(process.env).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value])
    );
    const result = envSchema.safeParse(env);

    if (!result.success) {
        console.error('❌ Invalid environment variables:', result.error.format());
        throw new Error('Invalid environment configuration');
    }

    _config = result.data;

    if (_config.BICA_DEBUG_ERRORS) {
        console.warn('⚠️  [BICA] BICA_DEBUG_ERRORS=true — full error traces will be exposed in API responses. Remove before production.');
    }

    return _config;
}

export const config = getConfig();
