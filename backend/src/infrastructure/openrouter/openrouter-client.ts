import { AppError } from '../../core/errors.js';
import type {
  ChatCompletionGateway,
  ChatMessage,
  CompletionOptions,
} from '../../domain/chat.js';

export const DEFAULT_OPENROUTER_MODEL = 'openrouter/auto';
export const DEFAULT_OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export type FetchImplementation = (
  input: string | URL,
  init?: RequestInit,
) => Promise<Response>;

export interface OpenRouterClientOptions {
  apiKey?: string;
  model?: string;
  apiUrl?: string;
  appUrl?: string;
  appName?: string;
  requestTimeoutMs?: number;
  fetchImpl?: FetchImplementation;
}

export class OpenRouterError extends AppError {
  constructor(
    message: string,
    options: {
      code?: string;
      cause?: unknown;
      statusCode?: number;
      data?: unknown;
    } = {},
  ) {
    super(message, {
      code: options.code ?? 'OPENROUTER_ERROR',
      statusCode: options.statusCode ?? 502,
      cause: options.cause,
      data: options.data,
    });
  }
}

export class OpenRouterAuthenticationError extends OpenRouterError {
  constructor(message = 'Falta configurar OPENROUTER_API_KEY o la credencial no es válida.') {
    super(message, {
      code: 'OPENROUTER_AUTHENTICATION_REQUIRED',
      statusCode: 401,
    });
  }
}

export class OpenRouterTimeoutError extends OpenRouterError {
  constructor(message = 'OpenRouter excedió el tiempo de espera.') {
    super(message, { code: 'OPENROUTER_TIMEOUT', statusCode: 504 });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function responseText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';

  return content
    .filter(
      (part): part is { type: 'text'; text: string } =>
        isRecord(part) && part.type === 'text' && typeof part.text === 'string',
    )
    .map((part) => part.text)
    .join('');
}

function assistantContent(payload: unknown): unknown {
  if (!isRecord(payload) || !Array.isArray(payload.choices)) return undefined;
  const firstChoice = payload.choices[0];
  if (!isRecord(firstChoice) || !isRecord(firstChoice.message)) return undefined;
  return firstChoice.message.content;
}

function upstreamMessage(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) return fallback;
  if (typeof payload.message === 'string') return payload.message;
  if (isRecord(payload.error) && typeof payload.error.message === 'string') {
    return payload.error.message;
  }
  return fallback;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

export class OpenRouterClient implements ChatCompletionGateway {
  readonly apiKey?: string;
  readonly model: string;
  readonly apiUrl: string;
  readonly appUrl?: string;
  readonly appName: string;
  readonly requestTimeoutMs: number;
  private readonly fetchImpl?: FetchImplementation;
  private readonly activeControllers = new Set<AbortController>();

  constructor(options: OpenRouterClientOptions = {}) {
    this.apiKey = options.apiKey;
    this.model = options.model ?? DEFAULT_OPENROUTER_MODEL;
    this.apiUrl = options.apiUrl ?? DEFAULT_OPENROUTER_URL;
    this.appUrl = options.appUrl;
    this.appName = options.appName ?? 'Agent Canvas';
    this.requestTimeoutMs = options.requestTimeoutMs ?? 120_000;
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch;
  }

  async complete(
    messages: readonly ChatMessage[],
    { sessionId, timeoutMs = this.requestTimeoutMs }: CompletionOptions,
  ): Promise<string> {
    if (!this.apiKey?.trim()) throw new OpenRouterAuthenticationError();
    if (!this.fetchImpl) {
      throw new OpenRouterError('Este entorno no incluye una implementación de fetch.', {
        code: 'OPENROUTER_FETCH_UNAVAILABLE',
        statusCode: 503,
      });
    }

    const controller = new AbortController();
    this.activeControllers.add(controller);
    const timeout = setTimeout(
      () => controller.abort(new OpenRouterTimeoutError()),
      timeoutMs,
    );
    timeout.unref();

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey.trim()}`,
      'Content-Type': 'application/json',
      'X-Title': this.appName,
    };
    if (this.appUrl) headers['HTTP-Referer'] = this.appUrl;

    try {
      const response = await this.fetchImpl(this.apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: this.model,
          messages,
          session_id: sessionId,
        }),
        signal: controller.signal,
      });
      const payload = await readJson(response);

      if (!response.ok) {
        const message = upstreamMessage(
          payload,
          `OpenRouter respondió HTTP ${response.status}.`,
        );
        if (response.status === 401 || response.status === 403) {
          throw new OpenRouterAuthenticationError(message);
        }
        throw new OpenRouterError(message, {
          code:
            response.status === 429
              ? 'OPENROUTER_RATE_LIMITED'
              : 'OPENROUTER_UPSTREAM_ERROR',
          statusCode: response.status === 429 ? 429 : 502,
          data: payload,
        });
      }

      const reply = responseText(assistantContent(payload));
      if (!reply.trim()) {
        throw new OpenRouterError('OpenRouter devolvió una respuesta vacía.', {
          code: 'OPENROUTER_EMPTY_RESPONSE',
          statusCode: 502,
          data: payload,
        });
      }
      return reply;
    } catch (error) {
      if (error instanceof OpenRouterError) throw error;
      if (controller.signal.aborted) throw new OpenRouterTimeoutError();
      throw new OpenRouterError('No fue posible conectar con OpenRouter.', {
        code: 'OPENROUTER_CONNECTION_ERROR',
        statusCode: 503,
        cause: error,
      });
    } finally {
      clearTimeout(timeout);
      this.activeControllers.delete(controller);
    }
  }

  async close(): Promise<void> {
    for (const controller of this.activeControllers) controller.abort();
    this.activeControllers.clear();
  }
}
