import type { IncomingMessage, ServerResponse } from 'node:http';
import { AppError } from '../core/errors.js';

export interface ErrorResponse {
  error: string;
  code?: string;
}

export function sendJson(
  response: ServerResponse,
  statusCode: number,
  body: unknown,
  allowedOrigin: string,
): void {
  response.writeHead(statusCode, {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Content-Type': 'application/json; charset=utf-8',
  });
  response.end(JSON.stringify(body));
}

export function sendCorsPreflight(response: ServerResponse, allowedOrigin: string): void {
  response.writeHead(204, {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  response.end();
}

export async function readJsonBody(
  request: IncomingMessage,
  maxBodyBytes: number,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    let settled = false;

    request.setEncoding('utf8');
    request.on('data', (chunk: string) => {
      if (settled) return;
      size += Buffer.byteLength(chunk);
      if (size > maxBodyBytes) {
        settled = true;
        reject(
          new AppError('El cuerpo de la solicitud es demasiado grande.', {
            code: 'REQUEST_BODY_TOO_LARGE',
            statusCode: 413,
          }),
        );
        return;
      }
      body += chunk;
    });
    request.on('end', () => {
      if (settled) return;
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(
          new AppError('El cuerpo debe ser JSON válido.', {
            code: 'INVALID_JSON',
            statusCode: 400,
          }),
        );
      }
    });
    request.on('error', reject);
  });
}

export function errorResponse(error: unknown): {
  statusCode: number;
  body: ErrorResponse;
} {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      body: { error: error.message, code: error.code },
    };
  }

  return {
    statusCode: 500,
    body: { error: 'No se pudo completar la solicitud.', code: 'INTERNAL_ERROR' },
  };
}
