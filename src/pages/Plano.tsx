/**
 * MiniOficina · Plano (dashboard de workflows) — §6.4 del SPEC · ruta '/p/:id/plano'
 * ------------------------------------------------------------------
 * MÓDULO DE UI, sin lógica de negocio: no lee ni escribe el store, no llama al
 * server, no navega, no usa librerías de diagramas. Todo entra por props y todo
 * sale por callbacks:
 *
 *   <Plano
 *     plano={state.planos[0]}                // §7
 *     agents={state.agents}
 *     areas={areasDelProyecto}
 *     templates={state.planos}               // lista de plantillas de la paleta
 *     projectName="Lanzamiento Café Frío"
 *     request={runDemo.request}              // texto de la tarjeta "Entrada"
 *     onSave={(plano) => store.savePlano(plano)}
 *     onOpenOffice={() => nav(`/p/${id}/oficina`)}
 *     onLoadTemplate={(planoId) => store.usarPlantilla(planoId)}
 *     onChange={(plano) => setBorrador(plano)}
 *   />
 *
 * Lo único que hace por su cuenta es estado de UI: el borrador del plano que se
 * está editando (orden de las etapas, títulos, responsables, instrucciones), qué
 * selector está abierto y qué pieza se está arrastrando. Al guardar devuelve el
 * Plano completo, con `nodes` y `edges` bien formados (`flow` entre procesos y
 * del último al resultado). Renderiza completo sin props (seed §16).
 */
import React, { useMemo, useState } from 'react';
import type { Avatar as AvatarModel } from '../types';
import { Avatar } from '../components/avatar/Avatar';
import './plano.css';

/* ───────────────────── Tipos del módulo ─────────────────────
   `types.ts` sólo publica el Avatar; lo demás sigue los nombres del contrato §7
   pero vive aquí para no tocar el contrato.                                   */

// local: no está en el contrato §7 (mismos campos que §7, declarados aquí)
export interface PlanoArea { id: string; name: string; emoji: string; color: string; xp?: number }

// local: no está en el contrato §7
export interface PlanoAgent {
  id: string; name: string; role: string; avatar: AvatarModel;
  areaId?: string; isSupervisor?: boolean; xp?: number;
}

// local: no está en el contrato §7
export type PlanoFormat = 'documento' | 'lista' | 'tabla' | 'mensaje';

// local: no está en el contrato §7
export interface PlanoNode {
  id: string;
  kind: 'area' | 'agent' | 'process' | 'result';
  position: { x: number; y: number };
  refId?: string;
  parentId?: string;
  title?: string;
  instructions?: string;
  agentId?: string;
  areaId?: string;
  format?: PlanoFormat;
}

// local: no está en el contrato §7
export interface PlanoEdge { id: string; source: string; target: string; kind: 'flow' | 'reports_to' }

// local: no está en el contrato §7
export interface PlanoModel { id: string; name: string; nodes: PlanoNode[]; edges: PlanoEdge[] }

/** Una etapa de la banda, tal como la edita esta pantalla. */
interface Stage {
  id: string;
  title: string;
  areaId?: string;
  agentId?: string;
  instructions: string;
  /** Lo que esta etapa le pasa a la siguiente ("hallazgos", "análisis"…). */
  handoff: string;
}

interface ResultDraft { id: string; title: string; format: PlanoFormat }

/** Borrador completo que vive en el estado de UI. */
interface Draft {
  id: string;
  name: string;
  areas: PlanoArea[];
  stages: Stage[];
  /** Piezas que aún no están enganchadas a la banda. */
  loose: Stage[];
  result?: ResultDraft;
}

export interface PlanoProps {
  plano?: PlanoModel;
  agents?: PlanoAgent[];
  areas?: PlanoArea[];
  templates?: PlanoModel[];
  projectName?: string;
  /** Texto de ejemplo de la tarjeta "Entrada". */
  request?: string;
  onSave?: (plano: PlanoModel) => void;
  onOpenOffice?: () => void;
  onLoadTemplate?: (planoId: string) => void;
  onChange?: (plano: PlanoModel) => void;
  onBack?: () => void;
}

/* ───────────────────── Seed compartido (§16) ───────────────────── */

const SEED_AREAS: PlanoArea[] = [
  { id: 'inv', name: 'Investigación', emoji: '🔎', color: '#4D96FF', xp: 40 },
  { id: 'mkt', name: 'Marketing', emoji: '🎨', color: '#FF6B6B', xp: 25 },
  { id: 'ven', name: 'Ventas', emoji: '💰', color: '#6BCB77', xp: 15 },
];

const SEED_AGENTS: PlanoAgent[] = [
  { id: 'ramon', name: 'Don Ramón', role: 'Gerente', isSupervisor: true, xp: 280, avatar: { body: 'round', eyes: 'focused', hat: 'crown', color: '#FFD93D' } },
  { id: 'lupita', name: 'Lupita', role: 'Investigadora de mercado', areaId: 'inv', xp: 145, avatar: { body: 'bean', eyes: 'big', hat: 'none', color: '#4D96FF' } },
  { id: 'beto', name: 'Beto', role: 'Analista de competencia', areaId: 'inv', xp: 60, avatar: { body: 'square', eyes: 'focused', hat: 'cap', color: '#B892FF' } },
  { id: 'monica', name: 'Mónica', role: 'Redactora creativa', areaId: 'mkt', xp: 95, avatar: { body: 'round', eyes: 'happy', hat: 'none', color: '#FF6B6B' } },
  { id: 'diego', name: 'Diego', role: 'Diseñador de campaña', areaId: 'mkt', xp: 30, avatar: { body: 'tall', eyes: 'star', hat: 'antenna', color: '#FF9F1C' } },
  { id: 'sofia', name: 'Sofía', role: 'Estratega de ventas', areaId: 'ven', xp: 45, avatar: { body: 'bean', eyes: 'happy', hat: 'cap', color: '#6BCB77' } },
];

const SEED_PL1: PlanoModel = {
  id: 'pl1', name: 'Lanzamiento de producto',
  nodes: [
    { id: 'pl1-p1', kind: 'process', position: { x: 40, y: 200 }, title: 'Investigar mercado', agentId: 'lupita', areaId: 'inv', instructions: 'Busca qué toman hoy en la Roma y la Condesa y a qué precio.' },
    { id: 'pl1-p2', kind: 'process', position: { x: 300, y: 200 }, title: 'Analizar competencia', agentId: 'beto', areaId: 'inv', instructions: 'Compara las tres cafeterías más cercanas y sus promociones.' },
    { id: 'pl1-p3', kind: 'process', position: { x: 560, y: 200 }, title: 'Redactar campaña', agentId: 'monica', areaId: 'mkt', instructions: 'Escribe los mensajes para redes y para el menú de la tienda.' },
    { id: 'pl1-p4', kind: 'process', position: { x: 820, y: 200 }, title: 'Plan de ventas', agentId: 'sofia', areaId: 'ven', instructions: 'Propón metas por semana y el precio de lanzamiento.' },
    { id: 'pl1-r', kind: 'result', position: { x: 1080, y: 200 }, title: 'Plan de lanzamiento', format: 'documento' },
  ],
  edges: [
    { id: 'pl1-e1', source: 'pl1-p1', target: 'pl1-p2', kind: 'flow' },
    { id: 'pl1-e2', source: 'pl1-p2', target: 'pl1-p3', kind: 'flow' },
    { id: 'pl1-e3', source: 'pl1-p3', target: 'pl1-p4', kind: 'flow' },
    { id: 'pl1-e4', source: 'pl1-p4', target: 'pl1-r', kind: 'flow' },
  ],
};

const SEED_PL2: PlanoModel = {
  id: 'pl2', name: 'Atención a clientes',
  nodes: [
    { id: 'pl2-p1', kind: 'process', position: { x: 40, y: 200 }, title: 'Entender la queja' },
    { id: 'pl2-p2', kind: 'process', position: { x: 300, y: 200 }, title: 'Proponer solución' },
    { id: 'pl2-r', kind: 'result', position: { x: 560, y: 200 }, title: 'Respuesta al cliente', format: 'mensaje' },
  ],
  edges: [
    { id: 'pl2-e1', source: 'pl2-p1', target: 'pl2-p2', kind: 'flow' },
    { id: 'pl2-e2', source: 'pl2-p2', target: 'pl2-r', kind: 'flow' },
  ],
};

const SEED_REQUEST = 'Quiero lanzar el café frío en la Roma y la Condesa el próximo mes con presupuesto de 20 mil pesos.';
/** Etiquetas de ejemplo de lo que se pasa entre etapas. */
const HANDOFFS = ['hallazgos', 'análisis', 'borrador', 'propuesta'];
const FORMATS: { id: PlanoFormat; label: string; emoji: string }[] = [
  { id: 'documento', label: 'Documento', emoji: '📄' },
  { id: 'lista', label: 'Lista', emoji: '📋' },
  { id: 'tabla', label: 'Tabla', emoji: '📊' },
  { id: 'mensaje', label: 'Mensaje', emoji: '💬' },
];

/* ───────────────────── Iconos mínimos ───────────────────── */

const I = {
  back: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>,
  prev: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>,
  next: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>,
  caret: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>,
  map: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M6 6h4v4H6zM14 14h4v4h-4zM10 8h4a2 2 0 0 1 2 2v4" /></svg>,
  check: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12.5l5.2 5L20 6.5" /></svg>,
  warn: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 4.5l8.2 14.2H3.8z" strokeLinejoin="round" /><path d="M12 10v3.6M12 16.4v.1" /></svg>,
  save: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M5 3h11l3 3v15H5z" /><path d="M8 3v6h8V3M8 21v-7h8v7" /></svg>,
  office: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M4 20V7l7-3v16M11 20h9V11h-9" /><path d="M14.5 14.5h2M14.5 17.5h2M7 9v.1M7 12v.1M7 15v.1" strokeLinecap="round" /></svg>,
  trash: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 7h14M10 7V5h4v2M6.5 7l1 13h9l1-13" /></svg>,
  link: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10 14a4 4 0 0 0 5.7 0l2.6-2.6a4 4 0 1 0-5.7-5.7L11 7.3" /><path d="M14 10a4 4 0 0 0-5.7 0L5.7 12.6a4 4 0 1 0 5.7 5.7L13 16.7" /></svg>,
};

/* ───────────────────── Del contrato §7 al borrador y de regreso ───────────────────── */

let seq = 0;
const nuevoId = (p: string) => `${p}-${Date.now().toString(36)}-${(seq += 1).toString(36)}`;

function toDraft(plano: PlanoModel, areas: PlanoArea[]): Draft {
  const procesos = plano.nodes.filter((n) => n.kind === 'process');
  const conectados = new Set<string>();
  plano.edges.forEach((e) => { conectados.add(e.source); conectados.add(e.target); });
  const enBanda = procesos.filter((n) => conectados.has(n.id) || procesos.length === 1);
  const sueltos = procesos.filter((n) => !enBanda.includes(n));
  const result = plano.nodes.find((n) => n.kind === 'result');

  const aStage = (n: PlanoNode, i: number): Stage => ({
    id: n.id,
    title: n.title ?? '',
    areaId: n.areaId,
    agentId: n.agentId,
    instructions: n.instructions ?? '',
    handoff: HANDOFFS[i % HANDOFFS.length],
  });

  return {
    id: plano.id,
    name: plano.name,
    areas,
    stages: enBanda.map(aStage),
    loose: sueltos.map(aStage),
    result: result
      ? { id: result.id, title: result.title ?? 'Resultado', format: result.format ?? 'documento' }
      : undefined,
  };
}

/** Arma el Plano del contrato §7 con `nodes` y `edges` bien formados. */
function toPlano(d: Draft): PlanoModel {
  const nodes: PlanoNode[] = [];
  const edges: PlanoEdge[] = [];

  d.areas.forEach((a, i) => nodes.push({
    id: `${d.id}-area-${a.id}`, kind: 'area', position: { x: 40 + i * 240, y: 24 },
    refId: a.id, areaId: a.id, title: a.name,
  }));

  d.stages.forEach((s, i) => nodes.push({
    id: s.id, kind: 'process', position: { x: 40 + i * 260, y: 220 },
    title: s.title, instructions: s.instructions, agentId: s.agentId, areaId: s.areaId,
    parentId: s.areaId ? `${d.id}-area-${s.areaId}` : undefined,
  }));

  d.loose.forEach((s, i) => nodes.push({
    id: s.id, kind: 'process', position: { x: 40 + i * 260, y: 460 },
    title: s.title, instructions: s.instructions, agentId: s.agentId, areaId: s.areaId,
  }));

  if (d.result) nodes.push({
    id: d.result.id, kind: 'result', position: { x: 40 + d.stages.length * 260, y: 220 },
    title: d.result.title, format: d.result.format,
  });

  for (let i = 0; i < d.stages.length - 1; i += 1) {
    edges.push({ id: `${d.stages[i].id}->${d.stages[i + 1].id}`, source: d.stages[i].id, target: d.stages[i + 1].id, kind: 'flow' });
  }
  const ultima = d.stages[d.stages.length - 1];
  if (ultima && d.result) {
    edges.push({ id: `${ultima.id}->${d.result.id}`, source: ultima.id, target: d.result.id, kind: 'flow' });
  }

  return { id: d.id, name: d.name, nodes, edges };
}

/* ───────────────────── Componente ───────────────────── */

type PieceKind = 'area' | 'agent' | 'process' | 'result';

const PIEZAS: { kind: PieceKind; glyph: string; label: string; hint: string }[] = [
  { kind: 'area', glyph: '▢', label: 'Área', hint: 'Un espacio del despacho' },
  { kind: 'agent', glyph: '☺', label: 'Agente', hint: 'Quién hace la etapa' },
  { kind: 'process', glyph: '▷', label: 'Proceso', hint: 'Un paso del trabajo' },
  { kind: 'result', glyph: '◆', label: 'Resultado', hint: 'Lo que se entrega' },
];

export const Plano: React.FC<PlanoProps> = ({
  plano = SEED_PL1,
  agents = SEED_AGENTS,
  areas = SEED_AREAS,
  templates = [SEED_PL1, SEED_PL2],
  projectName = 'Lanzamiento Café Frío',
  request = SEED_REQUEST,
  onSave, onOpenOffice, onLoadTemplate, onChange, onBack,
}) => {
  const [draft, setDraft] = useState<Draft>(() => toDraft(plano, areas));
  const [openPick, setOpenPick] = useState<string | null>(null);   // id de la etapa con el selector abierto
  const [dragging, setDragging] = useState<PieceKind | null>(null);

  /** Único punto de escritura del borrador: avisa el cambio hacia afuera. */
  const apply = (next: Draft) => { setDraft(next); onChange?.(toPlano(next)); };

  const agentById = useMemo(() => {
    const m = new Map<string, PlanoAgent>();
    agents.forEach((a) => m.set(a.id, a));
    return m;
  }, [agents]);
  const areaById = useMemo(() => {
    const m = new Map<string, PlanoArea>();
    draft.areas.forEach((a) => m.set(a.id, a));
    return m;
  }, [draft.areas]);

  /* ── edición de etapas ── */
  const patchStage = (id: string, patch: Partial<Stage>) => apply({
    ...draft,
    stages: draft.stages.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    loose: draft.loose.map((s) => (s.id === id ? { ...s, ...patch } : s)),
  });

  const moveStage = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= draft.stages.length) return;
    const stages = draft.stages.slice();
    const [s] = stages.splice(i, 1);
    stages.splice(j, 0, s);
    apply({ ...draft, stages });
  };

  const removeStage = (id: string) => apply({
    ...draft,
    stages: draft.stages.filter((s) => s.id !== id),
    loose: draft.loose.filter((s) => s.id !== id),
  });

  const addStage = () => {
    const s: Stage = { id: nuevoId('proc'), title: '', instructions: '', handoff: 'entrega' };
    apply({ ...draft, stages: [...draft.stages, s] });
  };

  const connectLoose = (id: string) => {
    const s = draft.loose.find((x) => x.id === id);
    if (!s) return;
    apply({ ...draft, loose: draft.loose.filter((x) => x.id !== id), stages: [...draft.stages, s] });
  };

  /* ── piezas de la paleta ── */
  const addPiece = (kind: PieceKind) => {
    if (kind === 'process') {
      const s: Stage = { id: nuevoId('proc'), title: '', instructions: '', handoff: 'entrega' };
      apply({ ...draft, loose: [...draft.loose, s] });
      return;
    }
    if (kind === 'result') {
      if (!draft.result) apply({ ...draft, result: { id: nuevoId('res'), title: 'Resultado final', format: 'documento' } });
      return;
    }
    if (kind === 'area') {
      const n = draft.areas.length + 1;
      apply({ ...draft, areas: [...draft.areas, { id: nuevoId('area'), name: `Área ${n}`, emoji: '🗂️', color: '#8FA0C8' }] });
      return;
    }
    // 'agent': abre el selector de responsable de la primera etapa que no tenga
    const pendiente = draft.stages.find((s) => !s.agentId) ?? draft.stages[0];
    if (pendiente) setOpenPick(pendiente.id);
  };

  const loadTemplate = (t: PlanoModel) => {
    const next = toDraft(t, draft.areas);
    setDraft(next);
    setOpenPick(null);
    onChange?.(toPlano(next));
    onLoadTemplate?.(t.id);
  };

  /* ── validación (§6.4) ── */
  const fueraDeArea = draft.stages.filter((s) => {
    const ag = s.agentId ? agentById.get(s.agentId) : undefined;
    return Boolean(ag && !ag.isSupervisor && ag.areaId && s.areaId && ag.areaId !== s.areaId);
  });
  const sinResponsable = draft.stages.filter((s) => !s.agentId);
  const sinConexion = draft.loose;
  const sinResultado = !draft.result;

  const avisos: { tono: 'warn' | 'stop'; texto: string }[] = [];
  if (fueraDeArea.length) avisos.push({ tono: 'warn', texto: `${fueraDeArea.length === 1 ? 'Un agente está sentado' : `${fueraDeArea.length} agentes están sentados`} fuera de su área.` });
  if (sinResponsable.length) avisos.push({ tono: 'warn', texto: `${sinResponsable.length === 1 ? 'Hay una etapa sin responsable' : `Hay ${sinResponsable.length} etapas sin responsable`}.` });
  if (sinConexion.length) avisos.push({ tono: 'warn', texto: `${sinConexion.length === 1 ? 'Hay una pieza sin conectar' : `Hay ${sinConexion.length} piezas sin conectar`} a la fila de trabajo.` });
  if (sinResultado) avisos.push({ tono: 'stop', texto: 'Falta la tarjeta de resultado: sin ella no se puede guardar.' });

  const motivo = sinResultado ? 'Agrega una tarjeta de resultado para poder guardar.' : '';

  const sentados = (areaId: string) => agents.filter((a) => a.areaId === areaId);
  const sinAsiento = agents.filter((a) => !a.areaId);

  return (
    <div className="pl">
      {/* ── encabezado ── */}
      <header className="pl-head">
        <div className="pl-head-l">
          <button className="pl-back" onClick={onBack} aria-label="Volver">{I.back}</button>
          <div>
            <h1 className="pl-title">Plano del despacho</h1>
            <p className="pl-sub">Así fluye el trabajo de {projectName}, de izquierda a derecha.</p>
          </div>
        </div>
        <span className="pl-crumb">Proyecto › <b>{draft.name}</b></span>
      </header>

      <div className="pl-wrap">
        {/* ── paleta ── */}
        <aside className="pl-pal">
          <div className="pl-card">
            <div className="pl-card-hd"><span className="pl-ico">{I.map}</span><h2>Piezas</h2></div>
            <div className="pl-card-bd">
              <p className="pl-help">Arrástralas a la fila o tócalas para agregarlas.</p>
              <div className="pl-pieces">
                {PIEZAS.map((p) => (
                  <button key={p.kind} className="pl-piece" draggable
                    onDragStart={() => setDragging(p.kind)}
                    onDragEnd={() => setDragging(null)}
                    onClick={() => addPiece(p.kind)}
                    title={p.hint}>
                    <span className="pl-glyph" aria-hidden>{p.glyph}</span>
                    <span>
                      <b>{p.label}</b>
                      <em>{p.hint}</em>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pl-card">
            <div className="pl-card-hd"><span className="pl-ico amber">✦</span><h2>Plantillas</h2></div>
            <div className="pl-card-bd">
              {templates.map((t) => {
                const pasos = t.nodes.filter((n) => n.kind === 'process').length;
                return (
                  <button key={t.id} className={`pl-tpl ${t.id === draft.id ? 'on' : ''}`} onClick={() => loadTemplate(t)}>
                    <b>{t.name}</b>
                    <em>{pasos} {pasos === 1 ? 'paso' : 'pasos'}</em>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pl-card">
            <div className="pl-card-hd">
              <span className={`pl-ico ${avisos.length ? 'amber' : 'ok'}`}>{avisos.length ? I.warn : I.check}</span>
              <h2>Revisión</h2>
            </div>
            <div className="pl-card-bd">
              {avisos.length === 0 && <p className="pl-ok-msg">Todo listo: cada etapa tiene responsable y hay un resultado al final.</p>}
              <ul className="pl-checks">
                {avisos.map((a) => (
                  <li key={a.texto} className={a.tono}>
                    <span className="pl-dot" aria-hidden />{a.texto}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pl-pal-foot">
            <button className="pl-btn primary" disabled={sinResultado} title={motivo}
              onClick={() => { if (!sinResultado) onSave?.(toPlano(draft)); }}>
              {I.save} Guardar
            </button>
            {motivo && <p className="pl-why">{motivo}</p>}
            <button className="pl-btn" onClick={onOpenOffice}>{I.office} Ver en la oficina</button>
          </div>
        </aside>

        {/* ── lienzo ── */}
        <section className={`pl-canvas ${dragging ? 'drop' : ''}`}
          onDragOver={(e) => { if (dragging) e.preventDefault(); }}
          onDrop={(e) => { e.preventDefault(); if (dragging) { addPiece(dragging); setDragging(null); } }}>

          {/* áreas del proyecto con sus agentes sentados */}
          <div className="pl-areas">
            {draft.areas.map((a) => (
              <div key={a.id} className="pl-area" style={{ borderColor: `${a.color}55`, background: `${a.color}0F` }}>
                <div className="pl-area-hd">
                  <span className="pl-area-em" aria-hidden>{a.emoji}</span>
                  <b>{a.name}</b>
                  <span className="pl-area-n">{sentados(a.id).length}</span>
                </div>
                <div className="pl-seats">
                  {sentados(a.id).map((ag, i) => (
                    <div key={ag.id} className="pl-seat" style={{ marginLeft: i ? -10 : 0 }} title={`${ag.name} · ${ag.role}`}>
                      <Avatar avatar={ag.avatar} size={38} state="static" />
                    </div>
                  ))}
                  {sentados(a.id).length === 0 && <span className="pl-empty">Nadie sentado aquí</span>}
                </div>
              </div>
            ))}
            {sinAsiento.length > 0 && (
              <div className="pl-area ghost">
                <div className="pl-area-hd"><span className="pl-area-em" aria-hidden>🪑</span><b>Sin área</b>
                  <span className="pl-area-n">{sinAsiento.length}</span></div>
                <div className="pl-seats">
                  {sinAsiento.map((ag, i) => (
                    <div key={ag.id} className="pl-seat" style={{ marginLeft: i ? -10 : 0 }} title={`${ag.name} · ${ag.role}`}>
                      <Avatar avatar={ag.avatar} size={38} state="static" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* banner de validación */}
          {avisos.length > 0 && (
            <div className={`pl-banner ${sinResultado ? 'stop' : ''}`} role="status">
              <span className="pl-banner-ico" aria-hidden>{I.warn}</span>
              <div>
                {avisos.map((a) => <p key={a.texto}>{a.texto}</p>)}
              </div>
            </div>
          )}

          {/* banda de etapas */}
          <div className="pl-band">
            {/* entrada */}
            <article className="pl-in">
              <span className="pl-tag">Entrada</span>
              <p className="pl-in-tx">“{request}”</p>
              <span className="pl-in-ft">Lo que pide la persona</span>
            </article>
            <Flecha etiqueta="el pedido" editable={false} />

            {draft.stages.map((s, i) => {
              const ag = s.agentId ? agentById.get(s.agentId) : undefined;
              const ar = s.areaId ? areaById.get(s.areaId) : undefined;
              const malSentado = fueraDeArea.includes(s);
              return (
                <React.Fragment key={s.id}>
                  <article className={`pl-step ${malSentado ? 'bad' : ''}`}>
                    <header className="pl-step-hd">
                      <span className="pl-num">{i + 1}</span>
                      <div className="pl-arrows">
                        <button onClick={() => moveStage(i, -1)} disabled={i === 0} aria-label={`Mover la etapa ${i + 1} a la izquierda`}>{I.prev}</button>
                        <button onClick={() => moveStage(i, 1)} disabled={i === draft.stages.length - 1} aria-label={`Mover la etapa ${i + 1} a la derecha`}>{I.next}</button>
                        <button className="pl-del" onClick={() => removeStage(s.id)} aria-label={`Quitar la etapa ${i + 1}`}>{I.trash}</button>
                      </div>
                    </header>

                    <input className="pl-step-title" value={s.title} placeholder="¿Qué se hace aquí?"
                      aria-label={`Nombre de la etapa ${i + 1}`}
                      onChange={(e) => patchStage(s.id, { title: e.target.value })} />

                    <label className="pl-lb" htmlFor={`area-${s.id}`}>Área</label>
                    <select id={`area-${s.id}`} className="pl-chipsel"
                      style={ar ? { background: `${ar.color}1A`, color: '#2C3550', borderColor: `${ar.color}66` } : undefined}
                      value={s.areaId ?? ''}
                      onChange={(e) => patchStage(s.id, { areaId: e.target.value || undefined })}>
                      <option value="">Sin área</option>
                      {draft.areas.map((a) => <option key={a.id} value={a.id}>{a.emoji} {a.name}</option>)}
                    </select>

                    <label className="pl-lb">Responsable</label>
                    <div className="pl-pickwrap">
                      <button className="pl-pick" aria-haspopup="listbox" aria-expanded={openPick === s.id}
                        onClick={() => setOpenPick(openPick === s.id ? null : s.id)}>
                        {ag
                          ? <><Avatar avatar={ag.avatar} size={26} state="static" /> <span className="pl-pick-nm">{ag.name}</span></>
                          : <span className="pl-none">Sin responsable</span>}
                        <span className="pl-car">{I.caret}</span>
                      </button>
                      {openPick === s.id && (
                        <div className="pl-menu" role="listbox">
                          <button onClick={() => { patchStage(s.id, { agentId: undefined }); setOpenPick(null); }}>
                            <span className="pl-none">Sin responsable</span>
                          </button>
                          {agents.map((a) => (
                            <button key={a.id} role="option" aria-selected={a.id === s.agentId}
                              onClick={() => { patchStage(s.id, { agentId: a.id }); setOpenPick(null); }}>
                              <Avatar avatar={a.avatar} size={26} state="static" />
                              <span>{a.name} <span className="pl-rl">· {a.role}</span></span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {malSentado && <p className="pl-bad-msg">Está sentado en otra área.</p>}

                    <label className="pl-lb" htmlFor={`ins-${s.id}`}>Instrucciones</label>
                    <textarea id={`ins-${s.id}`} className="pl-ta" value={s.instructions}
                      placeholder="Dile en pocas palabras qué esperas de esta etapa."
                      onChange={(e) => patchStage(s.id, { instructions: e.target.value })} />
                  </article>

                  <Flecha etiqueta={s.handoff} editable
                    onChange={(v) => patchStage(s.id, { handoff: v })} />
                </React.Fragment>
              );
            })}

            {/* resultado */}
            {draft.result ? (
              <article className="pl-res">
                <span className="pl-tag amber">Resultado</span>
                <input className="pl-step-title" value={draft.result.title} aria-label="Nombre del resultado"
                  placeholder="¿Qué se entrega?"
                  onChange={(e) => apply({ ...draft, result: { ...draft.result!, title: e.target.value } })} />
                <label className="pl-lb" htmlFor="pl-format">Formato</label>
                <select id="pl-format" className="pl-chipsel" value={draft.result.format}
                  onChange={(e) => apply({ ...draft, result: { ...draft.result!, format: e.target.value as PlanoFormat } })}>
                  {FORMATS.map((f) => <option key={f.id} value={f.id}>{f.emoji} {f.label}</option>)}
                </select>
                <button className="pl-del wide" onClick={() => apply({ ...draft, result: undefined })}>
                  {I.trash} Quitar resultado
                </button>
              </article>
            ) : (
              <button className="pl-add res" onClick={() => addPiece('result')}>
                <span aria-hidden>◆</span> Falta el resultado
              </button>
            )}

            <button className="pl-add" onClick={addStage}>
              <span aria-hidden>＋</span> Etapa
            </button>
          </div>

          {/* piezas sueltas */}
          {draft.loose.length > 0 && (
            <div className="pl-tray">
              <h3>Piezas sin conectar</h3>
              <div className="pl-tray-row">
                {draft.loose.map((s) => (
                  <div key={s.id} className="pl-loose">
                    <input className="pl-step-title sm" value={s.title} placeholder="¿Qué se hace aquí?"
                      aria-label="Nombre de la pieza suelta"
                      onChange={(e) => patchStage(s.id, { title: e.target.value })} />
                    <div className="pl-loose-ft">
                      <button className="pl-mini" onClick={() => connectLoose(s.id)}>{I.link} Conectar</button>
                      <button className="pl-mini del" onClick={() => removeStage(s.id)} aria-label="Quitar pieza suelta">{I.trash}</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="pl-hand">De izquierda a derecha,<br />como en la vida real ♡</p>
        </section>
      </div>
    </div>
  );
};

/* ───────────────────── Flecha gruesa entre etapas ───────────────────── */

const Flecha: React.FC<{ etiqueta: string; editable?: boolean; onChange?: (v: string) => void }> =
  ({ etiqueta, editable = true, onChange }) => (
    <div className="pl-flow" aria-hidden={!editable}>
      {editable
        ? <input className="pl-flow-lb" value={etiqueta} aria-label="Qué se pasa a la siguiente etapa"
            onChange={(e) => onChange?.(e.target.value)} />
        : <span className="pl-flow-lb ro">{etiqueta}</span>}
      <svg width="58" height="18" viewBox="0 0 58 18" fill="none" aria-hidden>
        <path d="M2 9h42" stroke="#C9D2E8" strokeWidth="6" strokeLinecap="round" />
        <path d="M42 2l12 7-12 7z" fill="#C9D2E8" />
      </svg>
    </div>
  );

export default Plano;
