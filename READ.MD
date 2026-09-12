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
`POST /api/message/:threadId` inicia la coordinación desde el agente elegido.
Ese agente recibe su perfil, el directorio de la oficina, sus contactos permitidos
y la memoria relevante. Decide resolver la solicitud, delegar partes del trabajo
a subordinados directos o combinar ambas acciones. Su respuesta final es la que
se guarda en el chat personal; las solicitudes internas tienen un registro separado.

## Conexiones y auditoría

1. Crea agentes con sus perfiles. El botón **Autorrellenar al azar** prepara datos
   de prueba; pulsa **Crear agente** para confirmar.
2. Activa **Conectar**, selecciona al jefe y después a un subordinado sin jefe.
   La primera conexión define la raíz. Las siguientes amplían ese mismo árbol.
3. Abre el chat personal de cualquier agente y envía una tarea. El agente elige
   a qué subordinados consultar según sus capacidades y el trabajo solicitado.
4. Durante una consulta, su flecha se ilumina. Abre la auditoría de esa pareja
   para ver la solicitud, la respuesta, el estado y la ronda.
5. El ojo oculta o muestra las flechas sin borrar relaciones. La auditoría sigue
   disponible mediante los controles de conexiones.

El frontend consulta el estado de la oficina periódicamente. Las animaciones
dependen de consultas pendientes reales; una respuesta o error cierra la actividad.
La preferencia del sistema para reducir movimiento conserva la indicación visual
sin animaciones. Las preguntas y respuestas de otros agentes no se añaden al
historial personal del subordinado.

La jerarquía se valida en el servidor: un jefe inicial, un padre por subordinado,
sin ciclos ni conexiones laterales. Durante una ejecución no se cambia el árbol.
Cada relación tiene como máximo cuatro intercambios por solicitud del usuario;
las delegaciones anidadas comparten ese presupuesto. El cierre debe reconocer
pendientes o desacuerdos cuando se alcanza el límite. Un agente puede trabajar
solo y finalizar antes de consumir rondas de coordinación.

Rutas de coordinación:

- `GET /api/office`: perfiles, árbol, consultas y agentes activos.
- `PUT /api/office/tree`: sustituye el árbol completo después de validarlo.
- `GET /api/communications?bossId=...&subordinateId=...`: consultas de una pareja.
- `GET /api/chats/:id/messages`: historial personal del agente.

## Persistencia y limitaciones

La oficina, las conversaciones, la auditoría y las mini memorias se conservan en
memoria del backend. Las mini memorias permiten reutilizar aprendizajes entre
solicitudes mientras ese proceso siga vivo. Reiniciar el backend borra ese estado.
Recargar el navegador recupera la oficina desde el backend; la posición de los
nodos y las preferencias visuales no se guardan de forma permanente.

El límite de rondas controla los intercambios, pero no garantiza acuerdo ni
exactitud del modelo. Las solicitudes al proveedor tienen su propio timeout.
Si una tarea requiere ayuda fuera de la rama del agente, su respuesta explica
esa limitación. Esta versión no ejecuta escalamiento automático hacia el jefe.

## Verificación visual sin llamadas al modelo

Con Playwright disponible, estas comprobaciones levantan servidores temporales
y los cierran al terminar:

```bash
node scripts/verify-office-ui.mjs
node --import tsx scripts/verify-office-e2e.mjs
```

La primera usa respuestas HTTP de prueba para revisar la interfaz. La segunda
usa el backend real con un proveedor simulado y verifica creación, conexiones,
delegación, auditoría, memoria e historial tras recargar. Ninguna carga `.env`
ni contacta al modelo. Si Playwright está en otro directorio, define
`PLAYWRIGHT_MODULE` con la ruta de su paquete antes de ejecutarlas.

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
