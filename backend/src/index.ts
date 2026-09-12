import { startBackend } from './bootstrap.js';
import { loadEnvironment } from './config/environment.js';

const config = loadEnvironment();

startBackend({ config })
  .then(({ close, openRouterClient }) => {
    console.log(`Agent Canvas backend listening on http://localhost:${config.port}`);
    console.log(`OpenRouter model: ${openRouterClient.model}`);
    if (!openRouterClient.apiKey) {
      console.warn(
        'OPENROUTER_API_KEY no está configurada; los mensajes devolverán 401.',
      );
    }

    let closing = false;
    const shutdown = (): void => {
      if (closing) return;
      closing = true;
      close()
        .catch((error: unknown) => console.error('Error al cerrar el backend:', error))
        .finally(() => process.exit());
    };

    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`No se pudo iniciar el backend: ${message}`);
    process.exitCode = 1;
  });
