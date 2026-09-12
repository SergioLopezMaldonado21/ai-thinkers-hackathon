# MiniOficina · Avatares "Agent Spirit" (L2 · §10 del SPEC)

Copiar a `web/src/components/avatar/`. React + TS, sin dependencias.

```
avatar/
├─ parts.tsx        palette() + 4 cuerpos · 4 ojos · 4 gorros + EXTRA_EYES/EXTRA_HATS + SPIRITS
├─ Avatar.tsx       <Avatar/>, randomAvatar(), AVATAR_CSS
├─ AvatarPicker.tsx columna izquierda del creador de agentes (§6.3)
└─ index.ts         barril
```

## Cómo se ve

Espíritu suave: cuerpo en tono muy claro, **contorno del mismo matiz** (no negro), ojos ovalados
grandes con brillo, cachetes rosa, faldón ondulado y bracitos. Todo sale de `avatar.color`:

```ts
palette('#FFD93D')  // → fill crema, stroke ámbar, accent/accentDeep para el gorro, ink para los ojos
```

Un color oscuro (p. ej. `#3A3D4D`) cambia solo la fórmula: cuerpo grafito y ojos claros (el Supervisor).

## Uso

```tsx
import { Avatar, randomAvatar, AvatarPicker, SPIRITS } from '@/components/avatar';

<Avatar avatar={agent.avatar} size={48}  state="idle"    level={levelFor(agent.xp)} />
<Avatar avatar={agent.avatar} size={96}  state="working" />                   // burbuja "…"
<Avatar avatar={agent.avatar} size={256} state="idle" name="Lupita" level={3} />

const [av, setAv] = useState(randomAvatar());
<AvatarPicker value={av} onChange={setAv} previewSize={256} />
```

| prop | valores |
|---|---|
| `size` | 48 / 96 / 256 (cualquier número) |
| `state` | `idle` · `walking` · `working` · `done` |
| `level` | 1–5 → chevrons; en `size < 72` sólo badge |
| `cheeks` | `false` quita los cachetes |

## Contrato §7 y extras

Del contrato salen los 64 combos: `body` round·square·bean·tall · `eyes` big·happy·focused·star ·
`hat` none·cap·crown·antenna.

Además hay 8 piezas **fuera del contrato** que `<Avatar/>` ya dibuja si llegan en el dato
(`EXTRA_EYES`: thinking, surprise, sleepy, glasses · `EXTRA_HATS`: sprout, headphones, bow, badge).
Sirven para las expresiones del sheet y para los 6 personajes de `SPIRITS`
(General, Creativo, Analista, Organizador, Técnico, Supervisor). Si L3 quiere usarlos en el seed,
basta con ampliar `EyesVariant` / `HatVariant` en `types.ts`; el componente no cambia.

## Notas

- Silueta unida sin costuras: cada parte se pinta en dos pasadas (contorno grueso + relleno),
  así los bracitos, el faldón y el gorro comparten un solo contorno.
- Estilos autoinyectados al primer montaje; `AVATAR_CSS` disponible para SSR o CSS global.
- Respeta `prefers-reduced-motion`.
- El desplazamiento por la oficina lo hace `OfficeCanvas` (L1); el componente sólo anima el sprite.
- Verificado: los 64 combos + las 8 piezas extra renderizan en 48/96/256 px; `tsc --noEmit` limpio.
