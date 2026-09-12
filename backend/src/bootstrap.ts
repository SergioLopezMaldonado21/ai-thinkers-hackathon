import { randomUUID } from 'node:crypto';
import type { Server } from 'node:http';
import { ConversationService } from './application/conversation-service.js';
import { OfficeCoordinationService } from './application/office-coordination-service.js';
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
  const conversations = new ConversationService(openRouterClient, randomUUID);
  const office = new OfficeCoordinationService(conversations, randomUUID);
  const server = createApiServer({
    conversations,
    office,
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
