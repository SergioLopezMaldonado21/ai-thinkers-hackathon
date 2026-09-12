/**
 * PEGAMENTO (no es un módulo de UI).
 * Es el único puente entre las pantallas y el server: carga el estado, abre el SSE,
 * traduce los OfficeEvent del motor y expone las acciones de guardado.
 * Las pantallas siguen sin saber que esto existe.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Avatar as AvatarModel } from '../types';
import type { OfficeActivityItem, OfficeResult, RunPayload } from '../pages/Office';
import type { PlanoModel } from '../pages/Plano';
import type { NewProjectPayload } from '../pages/Lobby';
import type { AgentDraft } from '../components/agents/AgentBuilder';

export interface ServerAgent {
  id: string; name: string; role: string; avatar: AvatarModel;
  xp: number; tasksDone?: number; areaId?: string; isSupervisor?: boolean;
  does?: string; doesNot?: string; delivers?: string; skillIds?: string[]; supervisorId?: string;
}
export interface ServerArea { id: string; name: string; emoji: string; color: string; xp: number; rules?: string }
export interface ServerProject {
  id: string; name: string; emoji: string; description: string;
  planoId: string; areaIds: string[]; agentIds: string[]; xp: number; createdAt?: string;
}
export interface ServerState {
  projects: ServerProject[]; areas: ServerArea[]; agents: ServerAgent[];
  skills: Array<{ id: string; name: string }>; planos: PlanoModel[]; runs: unknown[];
}
export type Conexion = 'buscando' | 'ok' | 'caido';

const hora = () => new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
let seq = 0;
const linea = (icon: string, text: string, tone?: OfficeActivityItem['tone']): OfficeActivityItem =>
  ({ id: `ev-${++seq}`, time: hora(), icon, text, tone });

export function useMiniOficina() {
  const [state, setState] = useState<ServerState | null>(null);
  const [conexion, setConexion] = useState<Conexion>('buscando');
  const [motor, setMotor] = useState<{ simMode: boolean; model: string } | null>(null);
  const [statuses, setStatuses] = useState<Record<string, 'libre' | 'trabajando' | 'termino'>>({});
  const [xpVivo, setXpVivo] = useState<Record<string, number>>({});
  const [activity, setActivity] = useState<OfficeActivityItem[]>([]);
  const [results, setResults] = useState<OfficeResult[]>([]);
  const [aviso, setAviso] = useState<string | null>(null);
  const nombres = useRef<Record<string, string>>({});

  const cargar = useCallback(async () => {
    try {
      const [s, h] = await Promise.all([
        fetch('/api/state').then((r) => r.json()),
        fetch('/health').then((r) => r.json()).catch(() => null),
      ]);
      setState(s);
      setMotor(h ? { simMode: h.simMode, model: h.model } : null);
      setConexion('ok');
      nombres.current = Object.fromEntries(s.agents.map((a: ServerAgent) => [a.id, a.name]));
      setXpVivo(Object.fromEntries(s.agents.map((a: ServerAgent) => [a.id, a.xp])));
    } catch {
      setConexion('caido');
    }
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  useEffect(() => {
    const es = new EventSource('/api/events');
    const nom = (id: string) => nombres.current[id] || id;
    es.addEventListener('office', (m) => {
      const e = JSON.parse((m as MessageEvent).data) as Record<string, never> & { type: string };
      const ev = e as unknown as Record<string, string & number>;
      switch (e.type) {
        case 'state.changed': void cargar(); break;
        case 'run.started':
          setActivity([linea('📋', 'La oficina recibió el pedido y se puso a trabajar.')]);
          setResults([]); break;
        case 'task.assigned':
          setActivity((a) => [linea('📋', `Le tocó «${ev.title}» a ${nom(ev.agentId)}.`), ...a]); break;
        case 'task.working':
          setStatuses((s) => ({ ...s, [ev.agentId]: 'trabajando' })); break;
        case 'task.done':
          setStatuses((s) => ({ ...s, [ev.agentId]: 'termino' }));
          setActivity((a) => [linea('✅', `${nom(ev.agentId)} entregó su parte. +10 de experiencia.`, 'ok'), ...a]); break;
        case 'handoff':
          setActivity((a) => [linea('➡️', `${nom(ev.fromAgentId)} le pasó el trabajo a ${nom(ev.toAgentId)}.`), ...a]); break;
        case 'xp':
          if (ev.agentId) setXpVivo((x) => ({ ...x, [ev.agentId]: (x[ev.agentId] || 0) + Number(ev.amount) })); break;
        case 'levelup':
          setActivity((a) => [linea('🎉', `¡${nom(ev.agentId)} subió a nivel ${ev.level}!`, 'alta'), ...a]); break;
        case 'run.done':
          setStatuses({});
          setResults([{ id: String(ev.runId), title: String(ev.title || 'Entregable'),
                        format: String(ev.format || 'documento'),
                        summary: String(ev.result).replace(/[#*`|]/g, ' ').replace(/\s+/g, ' ').slice(0, 150) + '…',
                        author: ev.author ? String(ev.author) : undefined, time: hora() }]);
          setActivity((a) => [linea('🏁', `${ev.author || 'El supervisor'} entregó «${ev.title}».`, 'ok'), ...a]);
          (window as unknown as { __entregable?: string }).__entregable = String(ev.result);
          void cargar(); break;
        case 'run.failed':
          setStatuses({});
          setActivity((a) => [linea('⚠️', `El pedido se atoró: ${ev.error}`), ...a]); break;
      }
    });
    es.onerror = () => setConexion((c) => (c === 'ok' ? 'caido' : c));
    return () => es.close();
  }, [cargar]);

  /* ── acciones ── */

  const pedir = async (url: string, body: unknown, metodo = 'POST') => {
    const r = await fetch(url, {
      method: metodo, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || d.error) throw new Error(d.error || `El server respondió ${r.status}`);
    return d;
  };

  const conAviso = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); setAviso('✅ ' + ok); }
    catch (e) { setAviso('⚠️ ' + (e as Error).message); }
    finally { setTimeout(() => setAviso(null), 4000); }
  };

  const run = useCallback(async (payload: RunPayload) => {
    setActivity((a) => [linea('📤', 'Pedido enviado a la oficina.'), ...a]);
    try { await pedir('/api/runs', { projectId: state?.projects[0]?.id || 'p1', source: 'web', ...payload }); }
    catch (e) { setActivity((a) => [linea('⚠️', (e as Error).message), ...a]); }
  }, [state]);

  const guardarAgente = useCallback((d: AgentDraft) =>
    conAviso(() => pedir('/api/agents', d), `${d.name} quedó guardado.`), []);

  const guardarPlano = useCallback((pl: PlanoModel) =>
    conAviso(() => pedir(`/api/planos/${pl.id}`, pl, 'PUT'), 'Plano guardado.'), []);

  const crearProyecto = useCallback((p: NewProjectPayload) =>
    conAviso(() => pedir('/api/projects', p), `Proyecto "${p.name}" creado.`), []);

  /* ── datos derivados por pantalla ── */
  const project = state?.projects[0];
  const plano = state?.planos.find((p) => p.id === project?.planoId) || state?.planos[0];

  return {
    conexion, motor, aviso, state, recargar: cargar,
    agents: state?.agents.map((a) => ({ ...a, xp: xpVivo[a.id] ?? a.xp, skillIds: a.skillIds ?? [] })),
    areas: state?.areas,
    skills: state?.skills,
    planos: state?.planos,
    projects: state?.projects.map((p) => ({ ...p, lastActivity: 'hace un momento' })),
    project, plano,
    officeAgents: state?.agents.map((a) => ({ ...a, xp: xpVivo[a.id] ?? a.xp, skillIds: a.skillIds ?? [], status: statuses[a.id] || ('libre' as const) })),
    steps: plano?.nodes.filter((n) => n.kind === 'process').map((n) => n.title || ''),
    activity, results,
    run, guardarAgente, guardarPlano, crearProyecto,
  };
}
