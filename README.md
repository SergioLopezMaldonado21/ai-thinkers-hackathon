# MiniOficina — Dashboards

Front del proyecto **MiniOficina** para el hackathon *Agents Everywhere* (AI Tinkerers CDMX).
Cinco pantallas listas, con la mascota y la estética ya definidas. **Todo es UI: no hay lógica de
negocio conectada** — ese es justo el trabajo que sigue.

## Cómo correrlo

```bash
npm run setup     # instala front y motor, y crea server/.env la primera vez
npm run dev       # levanta los dos: motor en :3001 y front en :5173
```

Una sola terminal. El front habla con el motor por `/api` (proxy de Vite), así que no hay URLs
quemadas ni CORS que pelear.

**Para que los agentes usen el modelo de verdad:** pon tu llave en `server/.env`

```
OPENROUTER_API_KEY=sk-or-v1-...
MODEL=google/gemini-2.5-flash-lite
```

y reinicia (`Ctrl+C` y `npm run dev`). Sin llave arranca en **modo simulación**: la oficina corre
igual, con los mismos eventos y los mismos tiempos, usando salidas de ejemplo. La app te avisa en
qué modo está con una franja arriba.

> **Ojo con el modelo.** No uses `openrouter/auto`: rutea a modelos de razonamiento que gastan todos
> los tokens pensando y devuelven respuesta vacía, y la oficina se queda en blanco sin marcar error.
> Usa un modelo rápido y fijo. Probados: `google/gemini-2.5-flash-lite` (2.4 s por llamada) y
> `openai/gpt-4o-mini` (5 s).

**Si algo no funciona**

| Síntoma | Qué pasa |
|---|---|
| Pantalla en blanco en `localhost:5173` | el front no está corriendo. `npm run dev` y deja la terminal abierta |
| Franja roja "El motor no responde" | el server de :3001 no arrancó. Míralo en la misma terminal, panel `motor` |
| Franja amarilla "Modo simulación" | no hay `OPENROUTER_API_KEY` en `server/.env` |
| Guardo un agente y no pasa nada | es el motor otra vez: sin él no hay dónde guardar |

**Sólo quieres ver el diseño:** abre `mockups/minioficina/prototipo-dashboards.html`. No necesita nada.

---

## Qué hay aquí

| SPEC | Pantalla | Archivo | Ruta |
|---|---|---|---|
| §6.1 | Lobby | `src/pages/Lobby.tsx` | `#/` |
| §6.2 | Oficina en vivo | `src/pages/Office.tsx` | `#/p/:id` |
| §6.3 | Creador de agentes | `src/components/agents/AgentBuilder.tsx` | `#/agentes/nuevo`, `#/agentes/:id` |
| §6.4 | Plano | `src/pages/Plano.tsx` | `#/p/:id/plano` |
| §6.5 | Panel generativo | `src/components/copilot/CopilotPanel.tsx` | ⌘K / botón ✨ |
| — | Armazón (barra lateral + cabecera) | `src/components/shell/AppShell.tsx` | — |
| — | Mascota (3 partes + color) | `src/components/avatar/` | — |

```
src/
├─ App.tsx                  ← ÚNICO archivo con pegamento: ruteo y callbacks
├─ main.tsx  index.css
├─ types.ts                 ← contrato §7 (sección Avatar)
├─ pages/                   Lobby · Office · Plano  (+ README con las props)
└─ components/
   ├─ avatar/               parts.tsx · Avatar.tsx · AvatarPicker.tsx   ← CONGELADO
   ├─ agents/               AgentBuilder.tsx
   ├─ copilot/              CopilotPanel.tsx + <CopilotFab/>
   └─ shell/                AppShell.tsx
preview/                    prototipo estático (no forma parte de la app)
docs/BRIEF-estilo.md        tokens, contrato y reglas para escribir pantallas nuevas
```

## La regla que sostiene todo

Cada módulo es **UI pura**: sin store, sin fetch, sin SSE, sin router propio, sin timers de negocio.
Los datos entran por props y las acciones salen por callbacks `onX`. Sólo guardan estado de interfaz
(pestaña activa, selección, borrador del formulario).

Todos renderizan **sin props** con datos de ejemplo del seed (§16), por eso la app levanta poblada.
`App.tsx` hoy sólo cablea la navegación y hace `console.log` de cada callback: abre la consola del
navegador y mueve la app para ver exactamente qué payload recibe cada uno.

## El motor (`server/`)

Node + Express, sin build. Implementa §13 del SPEC:

| Ruta | Qué hace |
|---|---|
| `GET /health` | `{ ok, simMode, model, agentes, pasos }` — lo primero que revisas si algo falla |
| `GET /api/state` | el estado completo (seed §16 la primera vez, luego `server/data/state.json`) |
| `POST /api/runs` | arranca un pedido y devuelve `{ runId }` |
| `GET /api/events` | SSE con los `OfficeEvent` del motor — es lo que anima la oficina |
| `GET /api/runs/:id` | el pedido con sus tareas y el entregable |

El motor (§8) recorre el plano en el orden de las aristas `flow`: por cada proceso emite
`task.assigned → task.working → task.done`, reparte experiencia, emite `handoff` al siguiente y al
final el supervisor consolida todo en el entregable. Si el modelo falla o tarda más de 30s, cae solo
a la salida de ejemplo **sin cambiar el ritmo ni los eventos** — por eso la demo no se rompe en vivo.

Modelo por defecto: `google/gemini-2.5-flash-lite` (una corrida completa tarda ~12 s y cuesta menos de
un centavo de dólar). Se cambia con `MODEL` en `server/.env`.

## Lo que sigue

1. **Store (Zustand) + `/api/state`.** Hoy `src/lib/useOffice.ts` trae el estado y traduce los eventos
   a props. Lobby, Plano y Creador siguen con sus datos de ejemplo: falta pasarles los reales
   (`src/pages/README.md` trae el bloque listo).
2. **`onSave`** del Plano y del Creador → `PUT /api/state`. El Plano ya devuelve el objeto del
   contrato §7 con `nodes` y `edges` encadenados.
3. **`onSubmit`** del Copiloto → CopilotKit (o `/api/ops`), devolviendo las ChangeCards por `changes`.
4. **Telegram** (P1): el mismo motor, otra entrada. `POST /api/runs` con `source: 'telegram'`.
5. **Router de verdad.** `App.tsx` usa un ruteo por hash de 15 líneas. Al cambiar a react-router se
   sustituye `useRoute()` y **ningún módulo cambia**.

## Si vas a escribir una pantalla nueva

Léete `docs/BRIEF-estilo.md` antes: trae los tokens de color, radios, tipografía, el contrato de
datos y el seed. Las cinco pantallas se construyeron contra ese documento; si te lo saltas, la
estética se abre.

Dos detalles heredados que conviene respetar:

- Los CSS usan prefijos por módulo (`.lb- .of- .pl- .ab- .cp- .sh-`) y **no dependen de Tailwind**.
- La regla base de cada módulo es `.xx :where(button){font:inherit;color:inherit}`. El `:where()`
  no es adorno: sin él, esa regla le gana en especificidad a los botones primarios y el texto blanco
  sobre fondo navy se vuelve invisible.

## Mascota

`src/components/avatar/` está **congelado**. Un solo dato, `avatar.color`, genera toda la paleta del
sprite (cuerpo claro, contorno del mismo matiz, accesorio, ojos). Hay 64 combos del contrato más 8
piezas extra (lentes, brote, audífonos, moño, placa, y las expresiones pensando/sorpresa/dormido)
que `<Avatar/>` ya dibuja si llegan en el dato. Detalles en `src/components/avatar/README.md`.
