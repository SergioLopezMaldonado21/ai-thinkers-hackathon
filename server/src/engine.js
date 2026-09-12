/**
 * Motor de ejecución (§8 del SPEC).
 * El orden del plano ES el plan. El supervisor abre, consolida y cierra.
 * Emite OfficeEvent por el bus; la oficina se anima con eso.
 */
import { systemPrompt, userPrompt, supervisorPrompt, supervisorUser } from './prompts.js';
import { cannedFor, cannedFinal } from './sim.js';
import { levelFor, XP_TASK, XP_RUN_PROJECT, XP_AREA_PER_TASK } from './seed.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OPENROUTER = 'https://openrouter.ai/api/v1/chat/completions';

/** Una llamada al modelo. Si falla o no hay llave, devuelve null y el motor usa la salida de ejemplo. */
async function llm(system, user, { maxTokens = 900, temperature = 0.4 } = {}) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key || process.env.SIM_MODE === '1') return null;
  const model = process.env.MODEL || 'google/gemini-2.5-flash-lite';
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 30000);
  try {
    const res = await fetch(OPENROUTER, {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'X-Title': 'MiniOficina',
      },
      body: JSON.stringify({
        model, temperature, max_tokens: maxTokens,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      }),
    });
    const data = await res.json();
    if (data.error) { console.error('[motor] OpenRouter:', data.error.message); return null; }
    const text = data.choices?.[0]?.message?.content;
    return text && text.trim() ? text.trim() : null;
  } catch (e) {
    console.error('[motor] fallo de red:', e.message);
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Procesos del plano en orden de las aristas `flow`. */
function ordenar(plano) {
  const procs = plano.nodes.filter((n) => n.kind === 'process');
  const flow = (plano.edges || []).filter((e) => e.kind === 'flow');
  const destino = new Set(flow.map((e) => e.target));
  let actual = procs.find((p) => !destino.has(p.id)) || procs[0];
  const orden = [];
  const vistos = new Set();
  while (actual && !vistos.has(actual.id)) {
    orden.push(actual); vistos.add(actual.id);
    const sig = flow.find((e) => e.source === actual.id);
    actual = sig ? procs.find((p) => p.id === sig.target) : null;
  }
  procs.forEach((p) => { if (!vistos.has(p.id)) orden.push(p); });
  return orden;
}

export async function runProject(state, run, emit) {
  const project = state.projects.find((p) => p.id === run.projectId) || state.projects[0];
  const plano = state.planos.find((p) => p.id === project.planoId) || state.planos[0];
  const sup = state.agents.find((a) => a.id === run.supervisorId)
    || state.agents.find((a) => a.isSupervisor);
  const agentesDe = (id) => state.agents.find((a) => a.id === id);
  const areaDe = (id) => state.areas.find((a) => a.id === id);

  run.status = 'running';
  emit({ type: 'run.started', runId: run.id, projectId: project.id });

  let procesos = ordenar(plano);
  if (run.areaIds && run.areaIds.length) {
    procesos = procesos.filter((n) => !n.areaId || run.areaIds.includes(n.areaId));
  }

  const prev = [];
  let anterior = null;

  for (const node of procesos) {
    const agent = agentesDe(node.agentId);
    if (!agent) continue;
    const area = areaDe(node.areaId);
    const task = {
      id: `t-${run.id}-${node.id}`, runId: run.id, processNodeId: node.id,
      agentId: agent.id, status: 'pending', input: run.request,
    };
    run.tasks.push(task);

    emit({ type: 'task.assigned', runId: run.id, taskId: task.id, agentId: agent.id,
           processNodeId: node.id, title: node.title });
    await sleep(800);

    task.status = 'working';
    task.startedAt = new Date().toISOString();
    emit({ type: 'task.working', runId: run.id, taskId: task.id, agentId: agent.id });

    const t0 = Date.now();
    const salida = await llm(
      systemPrompt(agent, area, project, state.skills),
      userPrompt(run.request, node, prev),
    );
    const output = salida || cannedFor(node.title);
    if (!salida) await sleep(Math.max(0, 1500 - (Date.now() - t0)));  // el ritmo no cambia en simulación

    task.status = 'done';
    task.output = output;
    task.finishedAt = new Date().toISOString();
    emit({ type: 'task.done', runId: run.id, taskId: task.id, agentId: agent.id, output });

    // experiencia
    const antes = levelFor(agent.xp);
    agent.xp += XP_TASK; agent.tasksDone = (agent.tasksDone || 0) + 1;
    if (area) area.xp += XP_AREA_PER_TASK;
    emit({ type: 'xp', agentId: agent.id, areaId: area?.id, amount: XP_TASK });
    const despues = levelFor(agent.xp);
    if (despues > antes) emit({ type: 'levelup', agentId: agent.id, level: despues });

    if (anterior && anterior !== agent.id) {
      emit({ type: 'handoff', runId: run.id, fromAgentId: anterior, toAgentId: agent.id });
    }
    anterior = agent.id;
    prev.push({ agent: agent.name, title: node.title, output });
  }

  const resultNode = plano.nodes.find((n) => n.kind === 'result') || { title: 'Resultado', format: 'documento' };
  const cierre = prev.length
    ? await llm(supervisorPrompt(sup, resultNode), supervisorUser(run.request, prev), { maxTokens: 1400 })
    : null;
  const result = cierre || cannedFinal;

  run.status = 'done';
  run.result = result;
  run.resultTitle = resultNode.title;
  run.resultFormat = resultNode.format || 'documento';
  project.xp += XP_RUN_PROJECT;

  emit({ type: 'xp', projectId: project.id, amount: XP_RUN_PROJECT });
  emit({ type: 'run.done', runId: run.id, projectId: project.id, result,
         title: resultNode.title, format: resultNode.format || 'documento',
         author: sup?.name });
  return run;
}
