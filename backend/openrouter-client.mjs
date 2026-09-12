export const DEFAULT_OPENROUTER_MODEL = 'openrouter/auto';
export const DEFAULT_OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export class OpenRouterError extends Error {
  constructor(message, { code = 'OPENROUTER_ERROR', cause, statusCode, data } = {}) {
    super(message, { cause });
    this.name = 'OpenRouterError';
    this.code = code;
    this.statusCode = statusCode;
    this.data = data;
  }
}

export class OpenRouterAuthenticationError extends OpenRouterError {
  constructor(message = 'Falta configurar OPENROUTER_API_KEY o la credencial no es válida.') {
    super(message, { code: 'OPENROUTER_AUTHENTICATION_REQUIRED', statusCode: 401 });
    this.name = 'OpenRouterAuthenticationError';
  }
}

export class OpenRouterTimeoutError extends OpenRouterError {
  constructor(message = 'OpenRouter excedió el tiempo de espera.') {
    super(message, { code: 'OPENROUTER_TIMEOUT', statusCode: 504 });
    this.name = 'OpenRouterTimeoutError';
  }
}

function responseText(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .filter((part) => part?.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text)
    .join('');
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export class OpenRouterClient {
  constructor({
    apiKey = process.env.OPENROUTER_API_KEY,
    model = process.env.OPENROUTER_MODEL || DEFAULT_OPENROUTER_MODEL,
    apiUrl = process.env.OPENROUTER_API_URL || DEFAULT_OPENROUTER_URL,
    appUrl = process.env.OPENROUTER_SITE_URL,
    appName = process.env.OPENROUTER_APP_NAME || 'Agent Canvas',
    requestTimeoutMs = 120_000,
    fetchImpl = globalThis.fetch,
  } = {}) {
    Object.assign(this, { apiKey, model, apiUrl, appUrl, appName, requestTimeoutMs, fetchImpl });
    this.activeControllers = new Set();
  }

  async complete(messages, { sessionId, timeoutMs = this.requestTimeoutMs } = {}) {
    if (typeof this.apiKey !== 'string' || !this.apiKey.trim()) {
      throw new OpenRouterAuthenticationError();
    }
    if (typeof this.fetchImpl !== 'function') {
      throw new OpenRouterError('Este entorno no incluye una implementación de fetch.', { code: 'OPENROUTER_FETCH_UNAVAILABLE', statusCode: 503 });
    }

    const controller = new AbortController();
    this.activeControllers.add(controller);
    const timeout = setTimeout(() => controller.abort(new OpenRouterTimeoutError()), timeoutMs);
    timeout.unref?.();

    const headers = {
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
          ...(sessionId ? { session_id: sessionId } : {}),
        }),
        signal: controller.signal,
      });
      const payload = await readJson(response);
      if (!response.ok) {
        const message = payload?.error?.message || payload?.message || `OpenRouter respondió HTTP ${response.status}.`;
        if (response.status === 401 || response.status === 403) throw new OpenRouterAuthenticationError(message);
        throw new OpenRouterError(message, {
          code: response.status === 429 ? 'OPENROUTER_RATE_LIMITED' : 'OPENROUTER_UPSTREAM_ERROR',
          statusCode: response.status === 429 ? 429 : 502,
          data: payload,
        });
      }
      const reply = responseText(payload?.choices?.[0]?.message?.content);
      if (!reply.trim()) {
        throw new OpenRouterError('OpenRouter devolvió una respuesta vacía.', { code: 'OPENROUTER_EMPTY_RESPONSE', statusCode: 502, data: payload });
      }
      return reply;
    } catch (error) {
      if (error instanceof OpenRouterError) throw error;
      if (controller.signal.aborted) throw new OpenRouterTimeoutError();
      throw new OpenRouterError('No fue posible conectar con OpenRouter.', { code: 'OPENROUTER_CONNECTION_ERROR', statusCode: 503, cause: error });
    } finally {
      clearTimeout(timeout);
      this.activeControllers.delete(controller);
    }
  }

  async close() {
    for (const controller of this.activeControllers) controller.abort();
    this.activeControllers.clear();
  }
}
