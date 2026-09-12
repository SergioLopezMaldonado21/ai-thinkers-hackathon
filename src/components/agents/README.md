# MiniOficina · Creador de agentes (§6.3) — MÓDULO DE UI

`AgentBuilder.tsx` + `agent-builder.css`. **No trae lógica de negocio**: no lee ni escribe el store,
no llama al server, no navega. Estado del formulario adentro, todo lo demás por props y callbacks.

```tsx
import AgentBuilder, { type AgentDraft } from '@/components/agents/AgentBuilder';

<AgentBuilder
  value={agentEnEdicion}          // opcional → modo edición (/agentes/:id)
  agents={state.agents}           // "Reporta a"
  areas={areasDelProyecto}        // si viene de un proyecto → aparece "Sentar en área"
  skills={state.skills}
  projectName={project.name}
  onSave={(d: AgentDraft) => { /* store.applyOps([{op:'addAgent', ...}]) */ }}
  onTest={(d) => {/* P1 */}}
  onCancel={() => nav(-1)}
  onBack={() => nav(-1)}
  onOpenLibrary={() => nav('/agentes')}
/>
```

## Lo que devuelve `onSave`

```ts
{
  id?: string,            // sólo en edición
  name, role,             // obligatorios
  avatar: { body, eyes, hat, color },
  does, doesNot,          // lenguaje natural
  delivers: string,       // los tokens de "¿Qué entrega?" unidos por ", "
  skillIds: string[],
  supervisorId?: string,  // undefined si isSupervisor
  isSupervisor: boolean,
  areaId?: string         // "Sentar en área" — sólo si pasaste `areas`
}
```

Mapea 1:1 con `Agent` del contrato §7 salvo `areaId`, que es la instrucción para meter el nodo agente
dentro del nodo área del plano (§6.3). `xp` y `tasksDone` los pone quien guarda.

## Lo que sí hace el módulo

- Preview en vivo 206 px con los 4 estados; **‹ ›** recorren los cuerpos y **▶ Vista previa en movimiento** lanza `walking`.
- Las 3 partes + color: 4 ojos · 4 cuerpos · 4 gorros · 6 colores (§6.3). Con `showExtras` aparecen las 8 piezas extra del sheet.
- 🎲 Aleatorio (conserva el color elegido; usa `randomAvatar()`).
- Validación §6.3: **nombre, puesto y "qué hace" obligatorios**, con mensaje bajo el campo. `Guardar` se bloquea sólo después del primer intento fallido.
- Tokens de "¿Qué entrega?" y chips de habilidades con sugerencias del catálogo.
- "Reporta a" con avatar del supervisor; se deshabilita si marcas **Es supervisor**.
- "Sentar en área" sólo aparece si le pasas `areas` (el caso "viene de un proyecto").

## Props útiles

| prop | qué hace |
|---|---|
| `colors` | paleta de los 6 tonos. Default `BUILDER_COLORS` (el 6º es el oscuro del Supervisor). Pasa `AVATAR_COLORS` si prefieres los del contrato |
| `showExtras` | agrega lentes/pensando/sorpresa/dormido y brote/audífonos/moño/placa a los selectores |
| `deliverables`, `skills` | catálogos de sugerencias |

## Armazón

`components/shell/AppShell.tsx` trae la barra lateral y la cabecera del mockup (también presentacional:
`onNavigate`, `onRules`, `onAsk`). Úsalo o cámbialo por el layout que ya tengas; `AgentBuilder` no
depende de él.

## Estilos

CSS plano con prefijos `.ab-` / `.sh-` importado por el componente — no depende de la config de Tailwind.
Tema claro (§6). Si tu `tsconfig` marca el import de CSS, agrega `src/css.d.ts` con `declare module '*.css';`
(va incluido).
