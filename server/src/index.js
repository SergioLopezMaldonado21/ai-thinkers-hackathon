/**
 * MiniOficina · server (§13 del SPEC)
 *
 *   GET  /health           { ok, simMode, model }
 *   GET  /api/state        AppState
 *   PUT  /api/state        reemplaza el estado
 *   POST /api/runs         { projectId, request, areaIds, supervisorId, source } → { runId }
 *   GET  /api/runs/:id     Run (para reconstruir tras recargar)
 *   GET  /api/events       SSE con los OfficeEvent del motor
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { seed } from './seed.js';
import { runProject } from './engine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(__dirname, '..', 'data', 'state.json');
const PORT = process.env.PORT || 3001;
const simMode = process.env.SIM_MODE === '1' || !process.env.OPENROUTER_API_KEY;

/* ── estado ── */
let state;
try {
  state = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  console.log('[estado] cargado de data/state.json');
} catch {
  state = structuredClone(seed);
  console.log('[estado] arrancando con el seed §16');
}
const save = () => {
  try {
    fs.mkdirSync(path.dirname(DATA), { recursive: true });
    fs.writeFileSync(DATA, JSON.stringify(state, null, 2));
  } catch (e) { console.error('[estado] no se pudo guardar:', e.message); }
};

/* ── bus de eventos (SSE) ── */
const clientes = new Set();
const emit = (evento) => {
  const linea = `event: office\ndata: ${JSON.stringify(evento)}\n\n`;
  for (const res of clientes) { try { res.write(linea); } catch {} }
};

/* ── app ── */
const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => res.json({
  ok: true, simMode, model: process.env.MODEL || 'google/gemini-2.5-flash-lite',
  agentes: state.agents.length, pasos: state.planos[0].nodes.filter(n => n.kind === 'process').length,
}));

app.get('/api/state', (_req, res) => res.json(state));

app.put('/api/state', (req, res) => { state = req.body; save(); res.json({ ok: true }); });

app.get('/api/runs/:id', (req, res) => {
  const run = state.runs.find((r) => r.id === req.params.id);
  if (!run) return res.status(404).json({ error: 'No existe ese pedido.' });
  res.json(run);
});


/* ── escritura: lo que guardan el creador de agentes y el plano ── */

const nuevoId = (pre) => pre + '-' + Math.random().toString(36).slice(2, 8);

/** Crear o actualizar un agente (§6.3). `areaId` lo sienta en su mesa del plano. */
app.post('/api/agents', (req, res) => {
  const d = req.body || {};
  if (!d.name?.trim() || !d.role?.trim()) {
    return res.status(400).json({ error: 'Falta nombre o puesto.' });
  }
  const existente = d.id && state.agents.find((a) => a.id === d.id);
  const agent = existente || { id: nuevoId('ag'), xp: 0, tasksDone: 0 };

  Object.assign(agent, {
    name: d.name.trim(), role: d.role.trim(), avatar: d.avatar,
    does: d.does || '', doesNot: d.doesNot || '', delivers: d.delivers || '',
    skillIds: d.skillIds || [], supervisorId: d.supervisorId,
    isSupervisor: !!d.isSupervisor, areaId: d.areaId || undefined,
  });
  if (!existente) state.agents.push(agent);

  const project = state.projects[0];
  if (project && !project.agentIds.includes(agent.id)) project.agentIds.push(agent.id);
  save();
  emit({ type: 'state.changed', reason: existente ? 'agent.updated' : 'agent.created', agentId: agent.id });
  res.json({ ok: true, agent });
});

app.delete('/api/agents/:id', (req, res) => {
  state.agents = state.agents.filter((a) => a.id !== req.params.id);
  state.projects.forEach((p) => { p.agentIds = p.agentIds.filter((i) => i !== req.params.id); });
  state.planos.forEach((pl) => {
    pl.nodes.forEach((n) => { if (n.agentId === req.params.id) delete n.agentId; });
  });
  save();
  emit({ type: 'state.changed', reason: 'agent.removed', agentId: req.params.id });
  res.json({ ok: true });
});

/** Guardar el plano (§6.4). Llega el objeto completo con nodes y edges. */
app.put('/api/planos/:id', (req, res) => {
  const plano = req.body || {};
  if (!Array.isArray(plano.nodes)) return res.status(400).json({ error: 'El plano viene sin pasos.' });
  if (!plano.nodes.some((n) => n.kind === 'result')) {
    return res.status(400).json({ error: 'El plano necesita un resultado al final.' });
  }
  const i = state.planos.findIndex((p) => p.id === req.params.id);
  const limpio = { ...plano, id: req.params.id };
  if (i >= 0) state.planos[i] = limpio; else state.planos.push(limpio);
  save();
  emit({ type: 'state.changed', reason: 'plano.saved', planoId: req.params.id });
  res.json({ ok: true, plano: limpio });
});

/** Crear proyecto (§6.1). */
app.post('/api/projects', (req, res) => {
  const d = req.body || {};
  if (!d.name?.trim()) return res.status(400).json({ error: 'Ponle nombre al proyecto.' });
  const base = d.planoId && state.planos.find((p) => p.id === d.planoId);
  const planoId = nuevoId('pl');
  state.planos.push(base
    ? { ...structuredClone(base), id: planoId, name: base.name }
    : { id: planoId, name: 'Espacio de trabajo', nodes: [
        { id: planoId + '-r', kind: 'result', title: 'Entregable', format: 'documento', position: { x: 320, y: 140 } },
      ], edges: [] });

  const project = {
    id: nuevoId('p'), name: d.name.trim(), emoji: d.emoji || '📁',
    description: d.description || '', planoId, areaIds: [], agentIds: [],
    xp: 0, createdAt: new Date().toISOString(),
  };
  state.projects.push(project);
  save();
  emit({ type: 'state.changed', reason: 'project.created', projectId: project.id });
  res.json({ ok: true, project });
});

let corriendo = false;
app.post('/api/runs', async (req, res) => {
  const { projectId = 'p1', request, areaIds = [], supervisorId, source = 'web' } = req.body || {};
  if (!request || !request.trim()) return res.status(400).json({ error: 'Falta el pedido.' });
  if (corriendo) return res.status(409).json({ error: 'La oficina ya está trabajando en otro pedido.' });

  const run = {
    id: 'run-' + Date.now().toString(36), projectId, request: request.trim(),
    areaIds, supervisorId, source, status: 'queued', tasks: [], createdAt: new Date().toISOString(),
  };
  state.runs.push(run);
  res.json({ runId: run.id });

  corriendo = true;
  runProject(state, run, emit)
    .catch((e) => {
      console.error('[motor] error:', e);
      run.status = 'failed';
      emit({ type: 'run.failed', runId: run.id, error: e.message });
    })
    .finally(() => { corriendo = false; save(); });
});

app.get('/api/events', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();
  res.write('retry: 3000\n\n');
  clientes.add(res);
  const latido = setInterval(() => { try { res.write(': ping\n\n'); } catch {} }, 15000);
  req.on('close', () => { clearInterval(latido); clientes.delete(res); });
});

app.listen(PORT, () => {
  console.log(`\n  🏢 MiniOficina server en http://localhost:${PORT}`);
  console.log(`     modo: ${simMode ? 'SIMULACIÓN (sin llamar al modelo)' : 'REAL · ' + (process.env.MODEL || 'google/gemini-2.5-flash-lite')}`);
  console.log(`     rutas: /health · /api/state · /api/runs · /api/events\n`);
});
