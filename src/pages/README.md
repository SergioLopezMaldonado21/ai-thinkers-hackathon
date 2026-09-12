# MiniOficina · Pantallas (§6.1, §6.2, §6.4) — MÓDULOS DE UI

Mismo criterio que `components/agents/AgentBuilder.tsx`: **sin lógica de negocio**. Sin store, sin
fetch, sin SSE, sin router. Datos por props (con defaults del seed §16) y eventos por callbacks `onX`.
Cada componente renderiza bien sin props.

| Archivo | SPEC | Ruta prevista |
|---|---|---|
| `Lobby.tsx` + `lobby.css` | §6.1 | `/` |
| `Office.tsx` + `office.css` | §6.2 | `/p/:id` |
| `Plano.tsx` + `plano.css` | §6.4 | `/p/:id/plano` |
| `../components/agents/AgentBuilder.tsx` | §6.3 | `/agentes/nuevo`, `/agentes/:id` |
| `../components/copilot/CopilotPanel.tsx` | §6.5 | transversal (⌘K) |

## Callbacks que tiene que conectar el equipo

```tsx
<Lobby
  projects={s.projects} agents={s.agents} planos={s.planos} areas={s.areas}
  onOpenProject={id => nav(`/p/${id}`)}
  onCreateProject={p => store.createProject(p)}
  onCreateAgent={() => nav('/agentes/nuevo')}
  onEditAgent={a => nav(`/agentes/${a.id}`)}
  onNewPlano={() => nav('/planos/nuevo')}
  onUsePlano={id => store.usePlano(id)}
  onOpenCopilot={() => setCopilot(true)}
/>

<Office
  project={p} areas={areas} agents={agents} plano={plano}
  activity={eventosYaFormateados}      // el motor los manda por SSE; el componente sólo pinta
  deliverables={entregables}
  onRun={payload => api.post('/api/runs', payload)}
  onSelectAgent={a => …} onOpenResult={r => …} onTabChange={t => …}
  onAddAgent={…} onOpenPlano={…} onOpenCopilot={…}
/>

<Plano
  plano={plano} areas={areas} agents={agents} templates={planos}
  onSave={pl => store.savePlano(pl)}    // devuelve el Plano §7 con nodes y edges bien formados
  onOpenOffice={…} onLoadTemplate={id => …} onChange={pl => …}
/>

<CopilotPanel
  open={open} context="Agentes del proyecto Café Frío" thinking={pendiente}
  changes={cambios}                      // ChangeCards; el panel no las genera
  onSubmit={texto => api.post('/api/ops', {prompt: texto})}
  onUndo={id => store.undo(id)} onViewInOffice={id => …} onClose={() => setOpen(false)}
/>
<CopilotFab onClick={() => setOpen(true)} />
```

## Notas de integración

- **Office** anima la llegada de los agentes al montar (presentación, no lógica) y pinta estados
  `libre | trabajando | termino` que recibe por prop. No simula el pedido: eso lo hace el motor y
  llega por `activity`.
- **Plano** modela el workflow como banda de etapas (decisión de §18 para no gastar el día en un
  editor de nodos). `onSave` entrega el `Plano` del contrato con `edges` `flow` encadenados y el
  `result` al final.
- **CopilotPanel** engancha ⌘K/Ctrl+K por su cuenta (es UI). Las `Op` las produce quien conteste
  `onSubmit`.
- Estilos en CSS plano con prefijos `.lb-`, `.of-`, `.pl-`, `.cp-`; no dependen de Tailwind.
  Tema claro (§6).
- `web/preview/*.js` son copias en JS plano de cada pantalla para el prototipo navegable — no forman
  parte de la app, sirven para enseñar el flujo y el contrato de cada callback sin backend.
