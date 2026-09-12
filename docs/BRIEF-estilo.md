# BRIEF COMPARTIDO — módulos de dashboard de MiniOficina

Lee esto completo antes de escribir código. Todos los módulos deben salir idénticos en estética y
en frontera de responsabilidad. NO improvises tokens, nombres ni convenciones nuevas.

## 0. Regla número uno: MÓDULO DE UI, CERO LÓGICA

- No store, no fetch, no SSE, no router, no localStorage, no timers de negocio.
- Todo dato entra por props (con defaults de ejemplo) y todo evento sale por callbacks `onX`.
- El único estado permitido es estado de UI: pestaña activa, panel abierto, selección, borrador de
  formulario, hover. Nada más.
- El componente debe renderizar bien con `<Modulo />` sin props (usa los defaults de ejemplo del seed).

## 1. Dónde escribir

| Módulo | Archivos |
|---|---|
| Lobby (§6.1) | `web/src/pages/Lobby.tsx` + `web/src/pages/lobby.css` + `web/preview/lobby.js` |
| Oficina en vivo (§6.2) | `web/src/pages/Office.tsx` + `web/src/pages/office.css` + `web/preview/office.js` |
| Plano (§6.4) | `web/src/pages/Plano.tsx` + `web/src/pages/plano.css` + `web/preview/plano.js` |
| Panel generativo (§6.5) | `web/src/components/copilot/CopilotPanel.tsx` + `copilot-panel.css` + `web/preview/copilot.js` |

Escribe SOLO tus archivos. No toques archivos de otros módulos, ni `types.ts`, ni `components/avatar/*`,
ni `components/agents/*`, ni `components/shell/*`.

## 2. Estética — tokens exactos (copia este bloque al inicio de tu CSS, cambiando el prefijo)

Usa un prefijo propio por módulo: `.lb-` (Lobby), `.of-` (Oficina), `.pl-` (Plano), `.cp-` (Copilot).
El scope raíz es una clase: `.lb { …tokens… }`.

```css
.lb{
  --bg:#F7F8FC; --card:#FFFFFF; --soft:#F4F6FB; --line:#E9EBF4;
  --ink:#1D2237; --ink-2:#5B6379; --ink-3:#9AA1B4;
  --navy:#1B2340; --blue:#4D7CFE; --blue-soft:#EEF3FF;
  --amber:#FFD97A; --amber-deep:#C98A12; --ok:#2FA36B; --danger:#E15252;
  --r:18px; --r-sm:12px;
  --shadow:0 1px 2px rgba(29,34,55,.04),0 14px 30px -22px rgba(29,34,55,.35);
  color:var(--ink);
  font-family:"Nunito Sans",ui-sans-serif,system-ui,sans-serif;font-size:14px;line-height:1.5;
}
```

Reglas visuales (son las del módulo ya aprobado, `components/agents/agent-builder.css`):

- Tarjeta: `background:var(--card); border:1px solid var(--line); border-radius:var(--r); box-shadow:var(--shadow)`.
  Nada de bordes gruesos ni sombras duras.
- Cabecera de tarjeta: icono en cuadro `30x30` radio 9 con `background:var(--blue-soft); color:var(--blue)`
  (o `#FFF6DD`/`#C98A12` para acentos ámbar), seguido de `<h2>` en Fredoka 17px/600.
- Títulos: `font-family:Fredoka, system-ui` peso 600, `letter-spacing:-.02em`. Título de página 28px.
- Etiquetas de campo: 13px peso 700. Texto auxiliar 12–12.5px en `--ink-3`.
- Botón primario: `background:var(--navy); color:#fff; border-radius:12px; padding:11px 18px; font-weight:700`.
  Botón secundario: fondo `--card`, borde `--line`. Botón fantasma: sin borde, color `--ink-2`.
- Chips/tokens: `background:var(--blue-soft); color:#2C4BA8; border-radius:8px; padding:5px 8px; font-weight:600`.
- Estado seleccionado: `border-color:var(--blue); box-shadow:0 0 0 3px var(--blue-soft)`.
- Notas manuscritas decorativas: `font-family:"Caveat",cursive; color:var(--ink-3)` (úsalas con MUCHA moderación,
  máximo una por pantalla).
- Radios: 18px tarjetas, 12px controles, 999px pills. Nada intermedio.
- Tema claro únicamente (§6 del SPEC). Pinta siempre fondo y color explícitos.
- Responsive: a <900px las rejillas colapsan a una columna. Sin scroll horizontal del body.
- `@media (prefers-reduced-motion:reduce){ .xx *{animation:none!important;transition:none!important} }`

## 3. La mascota

```tsx
import { Avatar } from '../components/avatar/Avatar';   // ajusta la ruta relativa
<Avatar avatar={agent.avatar} size={48} state="idle" level={3} name="Lupita" />
```
- `size`: número (48 listas, 96 tarjetas, 206+ preview). `state`: `idle|walking|working|done|static`.
  Usa `static` en listas densas y menús para que no se muevan 20 sprites a la vez.
- `level` 1–5 → chevrons; en `size < 72` sólo badge numérico.
- No dibujes SVG de personaje a mano. Siempre `<Avatar/>`.

## 4. Contrato de datos (§7) — usa estos nombres tal cual

```ts
Avatar { eyes:'big'|'happy'|'focused'|'star'; body:'round'|'square'|'bean'|'tall';
         hat:'none'|'cap'|'crown'|'antenna'; color:string }
Agent  { id,name,role,avatar,does,doesNot,delivers,skillIds,supervisorId?,isSupervisor?,xp,tasksDone }
Area   { id,name,emoji,color,rules,xp }
PlanoNode { id, kind:'area'|'agent'|'process'|'result', position:{x,y}, refId?, parentId?,
            title?, instructions?, agentId?, areaId?, format? }
PlanoEdge { id, source, target, kind:'flow'|'reports_to' }
Plano  { id,name,nodes,edges }
Project{ id,name,emoji,description,planoId,areaIds,agentIds,xp,createdAt }
Task   { id,runId,processNodeId,agentId,status:'pending'|'working'|'done'|'failed',input,output? }
Run    { id,projectId,request,areaIds,supervisorId,source:'web'|'telegram',
         status:'queued'|'running'|'done'|'failed',tasks,result?,createdAt }
OfficeEvent = run.started | task.assigned | task.working | task.done | handoff | run.done |
              run.failed | xp | levelup     (ver §7)
Op = addArea | addAgent | addProcess | updateAgent | remove | runProject
LEVELS=[0,50,150,300,500]; levelFor(xp)=LEVELS.filter(t=>xp>=t).length
XP_TASK=10; XP_RUN_PROJECT=25; XP_AREA_PER_TASK=5
```

Importa los tipos con `import type { … } from '../types'` (o `'../../types'` según tu carpeta).
Si un tipo que necesitas no existe en `types.ts`, defínelo LOCAL en tu archivo y márcalo con un
comentario `// local: no está en el contrato §7`. NO edites `types.ts`.

## 5. Seed compartido (idéntico en los 4 módulos, §16 del SPEC)

Proyecto `p1` ☕ **Lanzamiento Café Frío** — "Lanzar nuestra bebida de café frío en CDMX en 4 semanas." xp 120.
Segundo proyecto `p2` 🛟 **Atención a clientes** — "Responder dudas y quejas en menos de 2 horas." xp 30.

Áreas: `inv` 🔎 Investigación `#4D96FF` xp 40 · `mkt` 🎨 Marketing `#FF6B6B` xp 25 · `ven` 💰 Ventas `#6BCB77` xp 15.

Agentes (id · nombre · puesto · área · xp · avatar):
```
ramon  Don Ramón  Gerente (supervisor)      —    280  {body:'round', eyes:'focused',hat:'crown',  color:'#FFD93D'}
lupita Lupita     Investigadora de mercado  inv  145  {body:'bean',  eyes:'big',    hat:'none',   color:'#4D96FF'}
beto   Beto       Analista de competencia   inv   60  {body:'square',eyes:'focused',hat:'cap',    color:'#B892FF'}
monica Mónica     Redactora creativa        mkt   95  {body:'round', eyes:'happy',  hat:'none',   color:'#FF6B6B'}
diego  Diego      Diseñador de campaña      mkt   30  {body:'tall',  eyes:'star',   hat:'antenna',color:'#FF9F1C'}
sofia  Sofía      Estratega de ventas       ven   45  {body:'bean',  eyes:'happy',  hat:'cap',    color:'#6BCB77'}
```

Plano `pl1` "Lanzamiento de producto": procesos en orden
1. Investigar mercado · lupita · inv
2. Analizar competencia · beto · inv
3. Redactar campaña · monica · mkt
4. Plan de ventas · sofia · ven
→ resultado `Plan de lanzamiento` (formato `documento`).
Plano `pl2` "Atención a clientes" (plantilla sin responsables): Entender la queja → Proponer solución → ◆ Respuesta al cliente (mensaje).

Skills: `resumir` Resumir · `redactar` Redactar · `analizar` Analizar · `traducir` Traducir · `revisar` Revisar · `buscar` Buscar en web.

Pedido de demo: *"Quiero lanzar el café frío en la Roma y la Condesa el próximo mes con presupuesto de 20 mil pesos."*

## 6. Copia de prototipo (`web/preview/<nombre>.js`)

Además del componente React, entrega un archivo JS plano que pinta la MISMA pantalla para un
prototipo navegable. Es JS de navegador, sin imports ni build. Registra así:

```js
MO.register('lobby', {
  title: 'Lobby',
  subtitle: 'Proyectos, agentes y planos',   // opcional
  css: `  .lb{ … }  `,                        // el mismo CSS del módulo, como string
  render(root){ root.innerHTML = `…`; /* y aquí enganchas los listeners */ }
});
```

El host te da estos globales, YA DEFINIDOS — úsalos, no los redefinas:

```js
avatar(a, size=96, state='idle', opt={})  // devuelve HTML string del sprite; opt:{level,name,cheeks}
palette(color)                             // {fill,stroke,accent,accentDeep,ink,cheek,dark}
GEO, BODIES, EYES, HATS, LABELS            // catálogos de partes
SEED                                       // el seed de §5 de este brief, ya construido:
   SEED.projects, SEED.areas, SEED.agents, SEED.planos, SEED.skills, SEED.processes
levelFor(xp)                               // 1..5
$(sel), el(htmlString)                     // helpers DOM ($ = querySelector, el = crea elemento)
MO.toast(titulo, cuerpo)                   // muestra un toast oscuro abajo a la derecha
MO.go(nombreModulo)                        // navega a otra sección del prototipo
```

Reglas del preview:
- `render(root)` se llama cada vez que se entra a la sección; deja todo montado y funcional.
- Nada de `fetch`, `setInterval` infinitos, ni librerías externas.
- Las acciones que en la app real tocarían el store muestran `MO.toast('onAlgo(payload)', JSON.stringify(payload,null,2))`.
  Así el equipo ve el contrato del callback. Esa es la gracia del prototipo.
- La pantalla debe abrir en un estado realista (con el seed cargado), nunca vacía.

## 7. Calidad

- TypeScript estricto: `npx tsc --noEmit` debe pasar. Nada de `any` suelto; usa tipos del contrato.
- Cierra todos los elementos, `aria-label` en botones de sólo icono, foco visible.
- Comenta arriba del archivo qué sección del SPEC implementa y cuál es la frontera del módulo.
- Español de México en toda la UI. Sin jerga técnica visible (§26 del spec hermano: nada de prompt,
  token, JSON, nodo, MCP en pantalla).
