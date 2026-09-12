# Integración visual de MiniOficina

Rama destino: `codex/feature-office-coordination-audit`, nombre disponible para la rama funcional indicada en la solicitud. Base: `1c493ef`. Donante: `feature/dashboard-agentes`, revisión `0ec2eca`.

No había cambios locales pendientes. Los historiales no comparten ancestro; se adaptó la capa visual por áreas, sin sustituir la arquitectura ni usar resoluciones globales de Git.

## Coordinación

Se cubrieron los cinco roles solicitados por oleadas, reutilizando los tres subagentes disponibles junto al coordinador:

- Análisis: comparación de ramas, contratos, riesgos y verificaciones; después diseño compartido.
- Avatares y dashboard: componentes SVG originales, selector y dashboard conectado al catálogo real.
- Chats: interfaz de conversación, selector de agentes y estados; después validación independiente.
- Diseño compartido: layout, navegación, controles, formularios y auditoría visual.
- Validación: compilación, tipado, pruebas y recorridos en navegador.

El coordinador integra `src/main.ts`, `index.html`, dependencias, configuración y revisa el diff. Cada módulo y hoja de estilos tiene un único propietario durante su implementación.

## Elementos integrados

| Área | Archivos | Resultado |
| --- | --- | --- |
| Avatares | `src/components/avatar/*`, `src/types.ts` | Personajes SVG del donante, cuatro cuerpos, cuatro expresiones, cuatro accesorios, seis colores y selección aleatoria. |
| Dashboard | `src/visuals/agent-dashboard.tsx`, `src/visuals/agent-dashboard.css` | Tarjetas, búsqueda y estados a partir de agentes y conexiones reales. Adaptadores entre componentes visuales y DOM existente. |
| Chats | `src/visuals/chat-experience.ts`, `src/visuals/chat-experience.css` | Selector de conversaciones, cabecera con avatar, mensajes, sugerencias de inicio y estados de carga, actividad y error. |
| Diseño | `src/style.css`, `src/communication-audit.css`, `index.html` | Tema claro, tipografía, navegación lateral, formularios, controles y auditoría coherentes con MiniOficina. |
| Integración | `src/main.ts`, `package.json`, `package-lock.json`, `tsconfig.json` | Cableado al estado original y React 18 para reutilizar los avatares; Vite y backend originales conservados. |

La selección del avatar se guarda por identificador en el navegador como metadato visual. Los borradores se conservan por conversación durante la sesión. El dashboard y los chats comparten el catálogo de la oficina; no se muestran agentes de ejemplo.

## Funcionalidad preservada

Backend, `ConversationStore`, contratos, validaciones, OpenRouter, árbol jefe/subordinado, protección frente a concurrencia y respuestas antiguas, polling, auditoría y separación de memorias personales/internas permanecen en la implementación funcional original.

Los endpoints siguen siendo `POST /api/chats`, `POST /api/message/:id`, `GET /api/chats/:id/messages`, `GET /api/office`, `PUT /api/office/tree` y `GET /api/communications`. El proxy sigue apuntando al backend en el puerto 3001.

## Conflictos y exclusiones

- React del donante se usa para presentación aislada; no se migra el estado principal ni el servidor.
- El avatar se mantiene fuera de `AgentProfile`, para preservar el contrato de creación.
- No se incorpora el servidor Express/SSE ni sus APIs `/api/state` y `/api/runs`, incompatibles con la coordinación existente.
- Se excluyen proyectos, XP y resultados ficticios, simulación del donante, editor de planos y copiloto con callbacks incompletos.
- Se conservan identificadores originales del DOM; las tarjetas y el selector usan atributos distintos de los nodos del canvas.

## Límites existentes

Los datos funcionales viven en memoria del backend: recargar el navegador recupera la oficina mientras ese proceso sigue vivo; reiniciarlo borra agentes e historiales. Los avatares son preferencias locales del navegador y no se sincronizan entre dispositivos.

La rama funcional no implementa cuentas de usuario ni permisos por usuario. Se conserva la autenticación del proveedor OpenRouter y el tratamiento de errores 401/403. No se agregan cuentas ficticias.

No existe configuración ni comando de lint en el repositorio. Se mantiene el alcance de la integración y se ejecuta revisión de whitespace con `git diff --check`; esto no sustituye un linter.

## Verificación

Las pruebas usan fixtures o un proveedor determinista, sin cargar credenciales ni llamar a modelos externos.

| Comprobación | Resultado |
| --- | --- |
| `npm run build` | PASS: backend, tipado frontend y bundle Vite de producción. |
| `npm run typecheck` | PASS: frontend, backend y tipos de pruebas. |
| `npm test` | PASS: 19 pruebas backend y 3 de conversaciones frontend. |
| `node scripts/verify-office-ui.mjs` | PASS: flechas activas, auditoría con flechas ocultas, mensajes internos/personales separados, teclado, movimiento reducido, móvil y reset de oficina. |
| `node --import tsx scripts/verify-office-e2e.mjs` | PASS: creación por formulario, conexiones guardadas, delegación por API real, auditoría, memoria separada e historial tras recargar. |
| `node scripts/verify-dashboard-ui.mjs` | PASS: búsqueda con acentos, tarjetas reales, avatar y recarga, contrato de creación intacto, borradores independientes, cambio de chat durante envío, errores de historial y permisos, texto seguro, estados vacíos y anchos 390/320 px. |
| Revisión estática y diff | PASS: sin marcadores de conflicto, imports resueltos y `git diff --check` limpio; sin cambios al backend, store, auditoría funcional ni proxy. |
| Lint | No disponible: repositorio sin linter configurado. |

Se revisaron capturas de escritorio y móvil generadas por el recorrido automatizado. Se guardan localmente en `artifacts/`, excluido de Git. Esas imágenes contienen datos de prueba.

Para ejecutar los recorridos se utilizó Playwright disponible en el entorno mediante `PLAYWRIGHT_MODULE`. En Windows, el sandbox bloqueó inicialmente esbuild; las verificaciones se ejecutaron con la autorización de ejecución correspondiente.

No quedan fallos conocidos en las comprobaciones ejecutadas. La conexión con un modelo real de OpenRouter y la sincronización de avatares entre navegadores no están cubiertas: la primera requiere las credenciales del entorno y la segunda no forma parte de la persistencia existente.
