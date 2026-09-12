# Agent Canvas

Aplicación web con frontend Vite/TypeScript y backend Node.js que genera
respuestas mediante la API de OpenRouter.

Cada círculo del canvas representa una conversación independiente. El ID que
aparece en el tooltip es una sesión local generada por el backend y también se
envía a OpenRouter como `session_id` para mantener afinidad de enrutamiento.

## Requisitos

- Node.js y npm.
- Una API key de OpenRouter.
- Opcionalmente, un modelo de OpenRouter. El valor predeterminado es
  `openrouter/auto`.

```powershell
$env:OPENROUTER_API_KEY="sk-or-v1-..."
$env:OPENROUTER_MODEL="openrouter/auto"
```

También puedes guardarlas en un archivo `.env` en la raíz:

```dotenv
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=openrouter/auto
```

El script `dev:backend` carga ese archivo automáticamente. `.env` está excluido
de Git; la API key no se incluye en respuestas HTTP ni se expone al navegador.

## Desarrollo

Instala las dependencias una vez:

```bash
npm install
```

Inicia backend y frontend en dos terminales distintas:

```bash
npm run dev:backend
```

```bash
npm run dev:frontend
```

El frontend se sirve normalmente en `http://localhost:5173` y Vite reenvía
`/api` al backend en `http://localhost:3001`.

Ejecuta las pruebas automatizadas (todas usan fixtures y no llaman al modelo):

```bash
npm test
```

## Arquitectura

- El backend llama a `POST https://openrouter.ai/api/v1/chat/completions` con la
  API key en el encabezado `Authorization`.
- `POST /api/chats` crea una conversación local con un identificador opaco.
- `POST /api/message/:threadId` envía el historial completo de esa conversación
  a OpenRouter y guarda el nuevo par usuario/asistente cuando la llamada termina.
- El navegador conserva conversaciones y estados de espera independientes por
  identificador, por lo que se puede cambiar de agente mientras otro responde.

## Persistencia y limitaciones

Las conversaciones y sus historiales se conservan únicamente en memoria. Al
reiniciar el backend deben crearse agentes nuevos. El historial visual del
navegador tampoco se persiste al recargar la página.

## Diagnóstico

Si el chat muestra un error de autenticación:

1. Detén el backend.
2. Configura `OPENROUTER_API_KEY` en esa misma terminal.
3. Comprueba que `OPENROUTER_MODEL` contiene un identificador disponible en tu
   cuenta o usa `openrouter/auto`.
4. Vuelve a ejecutar `npm run dev:backend` y crea un agente nuevo.

Los errores de conexión o timeout aparecen dentro de la conversación sin borrar
los mensajes existentes.
