import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { OfficeRegistry } from './application/office-registry.js';
import { loadEnvironment, type EnvironmentConfig } from './config/environment.js';
import { createApiServer, type Logger } from './http/api-server.js';
import { OpenRouterClient } from './infrastructure/openrouter/openrouter-client.js';

export interface RunningBackend {
  server: Server;
  openRouterClient: OpenRouterClient;
  close(): Promise<void>;
}

export interface StartBackendOptions {
  config?: EnvironmentConfig;
  logger?: Logger;
}

export async function startBackend(options: StartBackendOptions = {}): Promise<RunningBackend> {
  const config = options.config ?? loadEnvironment();
  const openRouterClient = new OpenRouterClient(config.openRouter);
  const offices = new OfficeRegistry(openRouterClient, randomUUID);
  const defaultOffice = offices.get(offices.defaultOfficeId);
  const server = createApiServer({
    conversations: defaultOffice.conversations,
    office: defaultOffice.office,
    offices,
    allowedOrigin: config.frontendOrigin,
    maxBodyBytes: config.maxBodyBytes,
    logger: options.logger,
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(config.port, () => {
      server.off('error', reject);
      resolve();
    });
  });

  const close = async (): Promise<void> => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await openRouterClient.close();
  };

  return { server, openRouterClient, close };
}
