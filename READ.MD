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

También puedes copiar `.env.example` como `.env` en la raíz del repositorio:

```dotenv
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=openrouter/auto
```

Los scripts del backend cargan ese archivo automáticamente. Debe vivir en la
raíz, no dentro de `backend`, porque los comandos se ejecutan desde la raíz del
repositorio. `.env` está excluido de Git; la API key no se incluye en respuestas
HTTP ni se expone al navegador.

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

Genera los artefactos de producción y arranca el JavaScript compilado:

```bash
npm run build
npm run start:backend
```

## Arquitectura

El backend usa una arquitectura por capas y dependencias dirigidas hacia el
dominio:

```text
backend/
├── src/
│   ├── application/       Casos de uso y coordinación de conversaciones
│   ├── config/            Lectura y validación de variables de entorno
│   ├── core/              Errores comunes de la aplicación
│   ├── domain/            Tipos e interfaces independientes de proveedores
│   ├── http/              Rutas, CORS, parsing y respuestas HTTP
│   ├── infrastructure/    Adaptadores externos, actualmente OpenRouter
│   ├── bootstrap.ts       Composición e inicio del servidor
│   └── index.ts           Punto de entrada y apagado ordenado
├── test/                  Pruebas TypeScript sin llamadas reales al modelo
├── tsconfig.json          Compilación a backend/dist
└── tsconfig.test.json     Tipado estricto de código y pruebas
```

`ConversationService` depende de `ChatCompletionGateway`, no de OpenRouter. De
este modo puede añadirse otro proveedor o un adaptador de pruebas sin modificar
el caso de uso ni las rutas. `OpenRouterClient` implementa esa interfaz y llama a
`POST https://openrouter.ai/api/v1/chat/completions` con la API key únicamente en
el encabezado `Authorization`.

`POST /api/chats` crea una conversación local con un identificador opaco y el
perfil obligatorio del agente. El contrato requiere `name`, `position`,
`responsibilities`, `limitations`, `deliverables`, `skills`, `operationalRole`
y `thinkingRole`. Los dos roles son identificadores controlados y corresponden,
respectivamente, a los roles de operación y de pensamiento en `Descriptions/`.
`POST /api/message/:threadId` envía su historial completo y sólo guarda el nuevo
par usuario/asistente si el proveedor responde correctamente. Cada conversación
tiene su propio bloqueo, así que otro agente puede continuar mientras una
respuesta está en curso.

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

## Reglas para agentes colaboradores

1. Antes de modificar archivos, revisa la estructura del proyecto y entiende el
   contexto existente.
2. Trabaja únicamente dentro del alcance de la tarea asignada. No cambies
   funcionalidades no relacionadas.
3. No subas, muestres ni imprimas secretos. Nunca incluyas valores de `.env`,
   API keys, tokens o credenciales en el código, commits o mensajes.
4. Respeta los archivos existentes y los cambios realizados por otros agentes.
   No sobrescribas trabajo ajeno sin verificarlo primero.
5. Usa nombres claros y mantén el estilo de código ya utilizado en el proyecto.
6. Si agregas una dependencia, justifica por qué es necesaria y evita
   dependencias innecesarias.
7. Valida tus cambios antes de entregarlos: ejecuta las pruebas, el build o las
   verificaciones disponibles.
8. Si encuentras un error fuera de tu alcance, repórtalo indicando el archivo,
   el problema, el impacto y una posible solución.
9. No borres archivos ni hagas cambios destructivos sin autorización explícita.
10. Mantén los cambios pequeños, enfocados y fáciles de revisar.
11. Antes de finalizar, informa qué cambiaste, qué archivos modificaste, qué
    verificaciones ejecutaste y cualquier pendiente o riesgo.
12. Si una instrucción es ambigua o puede afectar la arquitectura, solicita
    aclaración antes de implementar.
13. Si otro agente ya trabaja en la misma área, coordina los cambios y evita
    duplicar trabajo o modificar simultáneamente los mismos archivos.
