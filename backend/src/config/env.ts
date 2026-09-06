import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load environment variables from .env file if available
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  PORT: z.string().transform((val) => parseInt(val, 10)).default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/capacity_connect'),
  FRONTEND_URL: z.string().default('http://localhost:3000'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  
  // Stage 1 Auth Configuration
  JWT_ACCESS_SECRET: z.string().default('capacity_connect_dev_access_secret_32chars_min'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_SECRET: z.string().default('capacity_connect_dev_refresh_secret_32chars_min'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_ROUNDS: z.string().transform((val) => parseInt(val, 10)).default('12'),
  
  ADMIN_SEED_EMAIL: z.string().default('admin@capacityconnect.com'),
  ADMIN_SEED_PASSWORD: z.string().default('AdminPassword123!'),
  ADMIN_SEED_ORGANIZATION_CODE: z.string().default('ORG001'),

  // Stage 0.5 AI & RAG Configuration
  AI_PROVIDER: z.enum(['openai', 'gemini', 'huggingface']).default('openai'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-1.5-pro'),
  
  HF_API_KEY: z.string().optional(),
  HF_MODEL: z.string().default('BAAI/bge-small-en-v1.5'),
  
  EMBEDDING_PROVIDER: z.enum(['huggingface', 'openai']).default('huggingface'),
  EMBEDDING_MODEL: z.string().default('BAAI/bge-small-en-v1.5'),
  EMBEDDING_DIMENSION: z.string().transform((val) => parseInt(val, 10)).default('384'),
  
  PGVECTOR_ENABLED: z.string().transform((val) => val === 'true').default('true'),
  
  GRAPHITI_ENABLED: z.string().transform((val) => val === 'true').default('false'),
  GRAPHITI_URL: z.string().default('http://localhost:8000'),
  
  AI_TIMEOUT_MS: z.string().transform((val) => parseInt(val, 10)).default('30000'),
  AI_MAX_TOKENS: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
  AI_TEMPERATURE: z.string().transform((val) => parseFloat(val)).default('0.7'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Environment validation error:', parsedEnv.error.format());
  throw new Error('Invalid environment configuration');
}

export const config = {
  env: {
    port: parsedEnv.data.PORT,
    nodeEnv: parsedEnv.data.NODE_ENV,
    databaseUrl: parsedEnv.data.DATABASE_URL,
    frontendUrl: parsedEnv.data.FRONTEND_URL,
    corsOrigin: parsedEnv.data.CORS_ORIGIN,
    logLevel: parsedEnv.data.LOG_LEVEL,
    isDevelopment: parsedEnv.data.NODE_ENV === 'development',
    isProduction: parsedEnv.data.NODE_ENV === 'production',
  },
  auth: {
    jwtAccessSecret: parsedEnv.data.JWT_ACCESS_SECRET,
    jwtAccessExpiresIn: parsedEnv.data.JWT_ACCESS_EXPIRES_IN,
    jwtRefreshSecret: parsedEnv.data.JWT_REFRESH_SECRET,
    jwtRefreshExpiresIn: parsedEnv.data.JWT_REFRESH_EXPIRES_IN,
    bcryptRounds: parsedEnv.data.BCRYPT_ROUNDS,
    adminSeedEmail: parsedEnv.data.ADMIN_SEED_EMAIL,
    adminSeedPassword: parsedEnv.data.ADMIN_SEED_PASSWORD,
    adminSeedOrgCode: parsedEnv.data.ADMIN_SEED_ORGANIZATION_CODE,
  },
  ai: {
    provider: parsedEnv.data.AI_PROVIDER,
    openaiApiKey: parsedEnv.data.OPENAI_API_KEY,
    openaiModel: parsedEnv.data.OPENAI_MODEL,
    geminiApiKey: parsedEnv.data.GEMINI_API_KEY,
    geminiModel: parsedEnv.data.GEMINI_MODEL,
    hfApiKey: parsedEnv.data.HF_API_KEY,
    hfModel: parsedEnv.data.HF_MODEL,
    timeoutMs: parsedEnv.data.AI_TIMEOUT_MS,
    maxTokens: parsedEnv.data.AI_MAX_TOKENS,
    temperature: parsedEnv.data.AI_TEMPERATURE,
  },
  embedding: {
    provider: parsedEnv.data.EMBEDDING_PROVIDER,
    model: parsedEnv.data.EMBEDDING_MODEL,
    dimension: parsedEnv.data.EMBEDDING_DIMENSION,
  },
  vector: {
    enabled: parsedEnv.data.PGVECTOR_ENABLED,
  },
  graphiti: {
    enabled: parsedEnv.data.GRAPHITI_ENABLED,
    url: parsedEnv.data.GRAPHITI_URL,
  },
};
