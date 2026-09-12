import {
  DEFAULT_OPENROUTER_MODEL,
  DEFAULT_OPENROUTER_URL,
  type OpenRouterClientOptions,
} from '../infrastructure/openrouter/openrouter-client.js';

const DEFAULT_PORT = 3001;
const DEFAULT_BODY_LIMIT_BYTES = 64 * 1024;
const DEFAULT_REQUEST_TIMEOUT_MS = 120_000;

export interface EnvironmentConfig {
  port: number;
  frontendOrigin: string;
  maxBodyBytes: number;
  openRouter: OpenRouterClientOptions;
}

function positiveInteger(value: string | undefined, fallback: number, name: string): number {
  if (value === undefined || value.trim() === '') return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${name} debe ser un entero positivo.`);
  }
  return parsed;
}

function optionalValue(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized || undefined;
}

export function loadEnvironment(env: NodeJS.ProcessEnv = process.env): EnvironmentConfig {
  const port = positiveInteger(env.PORT, DEFAULT_PORT, 'PORT');
  if (port > 65_535) throw new Error('PORT debe estar entre 1 y 65535.');

  return {
    port,
    frontendOrigin: optionalValue(env.FRONTEND_ORIGIN) ?? 'http://localhost:5173',
    maxBodyBytes: positiveInteger(
      env.MAX_BODY_BYTES,
      DEFAULT_BODY_LIMIT_BYTES,
      'MAX_BODY_BYTES',
    ),
    openRouter: {
      apiKey: optionalValue(env.OPENROUTER_API_KEY),
      model: optionalValue(env.OPENROUTER_MODEL) ?? DEFAULT_OPENROUTER_MODEL,
      apiUrl: optionalValue(env.OPENROUTER_API_URL) ?? DEFAULT_OPENROUTER_URL,
      appUrl: optionalValue(env.OPENROUTER_SITE_URL),
      appName: optionalValue(env.OPENROUTER_APP_NAME) ?? 'Agent Canvas',
      requestTimeoutMs: positiveInteger(
        env.OPENROUTER_REQUEST_TIMEOUT_MS,
        DEFAULT_REQUEST_TIMEOUT_MS,
        'OPENROUTER_REQUEST_TIMEOUT_MS',
      ),
    },
  };
}
