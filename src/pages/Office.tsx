/**
 * MiniOficina · Oficina en vivo — §6.2 del SPEC
 * ------------------------------------------------------------------
 * MÓDULO DE UI, sin lógica de negocio: no lee ni escribe el store, no llama al
 * server, no escucha eventos, no navega y NO simula el pedido. Todo entra por
 * props y sale por callbacks:
 *
 *   <Office
 *     project={proyecto}                       // cabecera
 *     areas={areasDelProyecto}                 // zonas del piso
 *     agents={agentesDelProyecto}              // con su estado ya calculado
 *     activity={eventosYaFormateados}          // el log, ya en español
 *     results={entregables}
 *     onRun={(p) => store.runProject(p)}
 *     onSelectAgent={(a) => abrirFicha(a)}
 *     onOpenResult={(r) => abrirEntregable(r)}
 *     onTabChange={(t) => …}
 *     onAddAgent={() => nav('/agentes/nuevo')}
 *     onOpenPlano={() => nav('/plano/pl1')}
 *     onOpenCopilot={() => abrirAyudante()}
 *   />
 *
 * Lo único que hace por su cuenta es estado de UI: pestaña activa, agente
 * seleccionado, borrador del pedido, vista isométrica y la animación de
 * presentación (los agentes entran caminando desde la puerta al montar).
 * El estado de cada agente ('libre' | 'trabajando' | 'termino') SIEMPRE llega
 * por props; el componente nunca lo cambia solo.
 */
import React, { useEffect, useMemo, useState } from 'react';
import type { Avatar as AvatarModel } from '../types';
import { Avatar } from '../components/avatar/Avatar';
import './office.css';

/* ───────────────────────── Tipos del módulo ───────────────────────── */
// local: no está en el contrato §7 (types.ts sólo define Avatar por ahora).

export type AgentStatus = 'libre' | 'trabajando' | 'termino';
export type OfficeTab = 'oficina' | 'plano' | 'agentes';

export interface OfficeAgent {
  id: string;
  name: string;
  role: string;
  avatar: AvatarModel;
  xp: number;
  areaId?: string;
  isSupervisor?: boolean;
  status?: AgentStatus;
}

export interface OfficeArea {
  id: string;
  name: string;
  emoji: string;
  color: string;
  xp: number;
}

export interface OfficeProject {
  id: string;
  name: string;
  emoji: string;
  description: string;
  xp: number;
}

/** Evento del log, YA formateado por quien nos usa (§6.2: aquí no se generan). */
export interface OfficeActivityItem {
  id: string;
  time: string;      // "09:41"
  icon: string;      // emoji
  text: string;
  tone?: 'normal' | 'ok' | 'alta';
}

export interface OfficeResult {
  id: string;
  title: string;
  format: string;    // "documento", "lista", "mensaje"…
  summary?: string;
  author?: string;
  time?: string;
}

export interface RunPayload {
  request: string;
  areaIds: string[];
  supervisorId?: string;
}

export interface OfficeProps {
  project?: OfficeProject;
  areas?: OfficeArea[];
  agents?: OfficeAgent[];
  activity?: OfficeActivityItem[];
  results?: OfficeResult[];
  /** Pasos del plano, sólo para la vista previa de la pestaña "Plano". */
  steps?: string[];
  /** Texto con el que abre el campo de pedido. */
  draftRequest?: string;
  onRun?: (payload: RunPayload) => void;
  onSelectAgent?: (agent: OfficeAgent) => void;
  onOpenResult?: (result: OfficeResult) => void;
  onTabChange?: (tab: OfficeTab) => void;
  onAddAgent?: () => void;
  onOpenPlano?: () => void;
  onOpenCopilot?: () => void;
}

/* ───────────────────────── Seed de ejemplo (§5 del brief) ───────────────────────── */

const SEED_PROJECT: OfficeProject = {
  id: 'p1', name: 'Lanzamiento Café Frío', emoji: '☕',
  description: 'Lanzar nuestra bebida de café frío en CDMX en 4 semanas.', xp: 120,
};

const SEED_AREAS: OfficeArea[] = [
  { id: 'inv', name: 'Investigación', emoji: '🔎', color: '#4D96FF', xp: 40 },
  { id: 'mkt', name: 'Marketing', emoji: '🎨', color: '#FF6B6B', xp: 25 },
  { id: 'ven', name: 'Ventas', emoji: '💰', color: '#6BCB77', xp: 15 },
];

const SEED_AGENTS: OfficeAgent[] = [
  { id: 'ramon', name: 'Don Ramón', role: 'Gerente', xp: 280, isSupervisor: true, status: 'libre',
    avatar: { body: 'round', eyes: 'focused', hat: 'crown', color: '#FFD93D' } },
  { id: 'lupita', name: 'Lupita', role: 'Investigadora de mercado', areaId: 'inv', xp: 145, status: 'termino',
    avatar: { body: 'bean', eyes: 'big', hat: 'none', color: '#4D96FF' } },
  { id: 'beto', name: 'Beto', role: 'Analista de competencia', areaId: 'inv', xp: 60, status: 'trabajando',
    avatar: { body: 'square', eyes: 'focused', hat: 'cap', color: '#B892FF' } },
  { id: 'monica', name: 'Mónica', role: 'Redactora creativa', areaId: 'mkt', xp: 95, status: 'libre',
    avatar: { body: 'round', eyes: 'happy', hat: 'none', color: '#FF6B6B' } },
  { id: 'diego', name: 'Diego', role: 'Diseñador de campaña', areaId: 'mkt', xp: 30, status: 'libre',
    avatar: { body: 'tall', eyes: 'star', hat: 'antenna', color: '#FF9F1C' } },
  { id: 'sofia', name: 'Sofía', role: 'Estratega de ventas', areaId: 'ven', xp: 45, status: 'libre',
    avatar: { body: 'bean', eyes: 'happy', hat: 'cap', color: '#6BCB77' } },
];

const SEED_ACTIVITY: OfficeActivityItem[] = [
  { id: 'e1', time: '09:41', icon: '▶️', text: 'Don Ramón repartió el pedido entre 3 áreas.', tone: 'alta' },
  { id: 'e2', time: '09:41', icon: '📋', text: 'Lupita tomó: Investigar mercado.' },
  { id: 'e3', time: '09:44', icon: '✅', text: 'Lupita entregó su parte. +10 de experiencia.', tone: 'ok' },
  { id: 'e4', time: '09:45', icon: '🤝', text: 'Lupita le pasó el trabajo a Beto.' },
  { id: 'e5', time: '09:46', icon: '✏️', text: 'Beto está analizando a la competencia.' },
];

const SEED_RESULTS: OfficeResult[] = [
  { id: 'r1', title: 'Hallazgos de mercado', format: 'documento', author: 'Lupita', time: '09:44',
    summary: 'Quiénes toman café frío en la Roma y la Condesa, y cuánto pagan.' },
];

const SEED_STEPS = ['Investigar mercado', 'Analizar competencia', 'Redactar campaña', 'Plan de ventas'];

const SEED_REQUEST =
  'Quiero lanzar el café frío en la Roma y la Condesa el próximo mes con presupuesto de 20 mil pesos.';

/* ───────────────────────── Niveles (§7) ───────────────────────── */

const LEVELS = [0, 50, 150, 300, 500];
const levelFor = (xp: number) => LEVELS.filter((t) => xp >= t).length;
function xpPct(xp: number): number {
  const l = levelFor(xp);
  const lo = LEVELS[l - 1] ?? 0;
  const hi = LEVELS[l] ?? lo + 200;
  return Math.max(5, Math.min(100, ((xp - lo) / (hi - lo)) * 100));
}

const STATUS_LABEL: Record<AgentStatus, string> = {
  libre: 'Libre', trabajando: 'Trabajando', termino: 'Terminó',
};

/* ───────────────────────── Geometría del piso (lienzo 960×540) ───────────────────────── */

const STAGE_W = 960;
const STAGE_H = 540;
const ZONE_GAP = 18;
const AREAS_X = 92;                    // deja la columna de la puerta libre
const AREAS_R = 936;
const AREAS_TOP = 140;
const AREAS_BOT = 482;
const BOSS_ZONE = { x: 318, y: 22, w: 324, h: 102 };
const DOOR = { x: 24, y: 418, w: 56, h: 64 };
const DOOR_FEET = { x: DOOR.x + DOOR.w / 2, y: DOOR.y + DOOR.h };
const STRIP = { x: 24, y: 492, w: 912, h: 36 };

interface Rect { x: number; y: number; w: number; h: number }
interface Seat { agent: OfficeAgent; cx: number; feetY: number; deskY: number; deskW: number }
interface Zone { area: OfficeArea; rect: Rect; seats: Seat[] }

const pctX = (v: number) => `${(v / STAGE_W) * 100}%`;
const pctY = (v: number) => `${(v / STAGE_H) * 100}%`;

/** Reparte las zonas de área en filas de máximo 3. */
function layoutZones(areas: OfficeArea[]): Rect[] {
  const n = Math.max(areas.length, 1);
  const rows = Math.ceil(n / 3);
  const regionW = AREAS_R - AREAS_X;
  const rowH = (AREAS_BOT - AREAS_TOP - (rows - 1) * ZONE_GAP) / rows;
  return areas.map((_, i) => {
    const r = Math.floor(i / 3);
    const inRow = Math.min(3, n - r * 3);
    const c = i % 3;
    const w = (regionW - (inRow - 1) * ZONE_GAP) / inRow;
    return { x: AREAS_X + c * (w + ZONE_GAP), y: AREAS_TOP + r * (rowH + ZONE_GAP), w, h: rowH };
  });
}

/** Mesas en rejilla de 2 columnas dentro de una zona. */
function layoutSeats(rect: Rect, list: OfficeAgent[]): Seat[] {
  const padX = 14, padTop = 36, padBottom = 12, gap = 8;
  const innerX = rect.x + padX;
  const innerY = rect.y + padTop;
  const innerW = rect.w - padX * 2;
  const innerH = Math.max(rect.h - padTop - padBottom, 60);
  const cols = Math.min(2, Math.max(list.length, 1));
  const rows = Math.max(Math.ceil(list.length / cols), 1);
  const cellW = (innerW - (cols - 1) * gap) / cols;
  const cellH = Math.min(innerH / rows, 132);          // mesas juntas, no estiradas
  const top = innerY + (innerH - cellH * rows) / 2;    // y centradas en la zona
  return list.map((agent, i) => {
    const c = i % cols;
    const r = Math.floor(i / cols);
    const deskW = Math.min(cellW - 6, 140);
    const deskY = top + r * cellH + cellH - 28;
    return { agent, cx: innerX + c * (cellW + gap) + cellW / 2, deskW, deskY, feetY: deskY + 7 };
  });
}

/* ───────────────────────── Iconos mínimos ───────────────────────── */

const I = {
  people: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 20v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="9.5" cy="7" r="3.2" /><path d="M17 11a3 3 0 1 0-1.8-5.4M21 20v-1.8a3.6 3.6 0 0 0-2.6-3.4" /></svg>,
  send: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 3L10.5 13.5M21 3l-6.6 18-3.9-7.5L3 9.6z" /></svg>,
  bolt: <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4 14h6l-1 8 9-12h-6z" /></svg>,
  pulse: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h4l2.5-7 4 14L16 12h5" /></svg>,
  box: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M3 7.5L12 3l9 4.5v9L12 21l-9-4.5z" /><path d="M3 7.5L12 12l9-4.5M12 12v9" /></svg>,
  map: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M9 4L3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5z" /><path d="M9 4v13M15 6.5v13" /></svg>,
  wand: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 20L16 8M14.5 4.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9zM19 13l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z" /></svg>,
  plus: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>,
  doc: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v4h4" /></svg>,
  fwd: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>,
};

const TABS: { id: OfficeTab; label: string }[] = [
  { id: 'oficina', label: 'Oficina' },
  { id: 'plano', label: 'Plano' },
  { id: 'agentes', label: 'Agentes' },
];

/* ───────────────────────── Componente ───────────────────────── */

export const Office: React.FC<OfficeProps> = ({
  project = SEED_PROJECT,
  areas = SEED_AREAS,
  agents = SEED_AGENTS,
  activity = SEED_ACTIVITY,
  results = SEED_RESULTS,
  steps = SEED_STEPS,
  draftRequest = '',
  onRun, onSelectAgent, onOpenResult, onTabChange, onAddAgent, onOpenPlano, onOpenCopilot,
}) => {
  /* ── estado de UI, nada más ── */
  const [tab, setTab] = useState<OfficeTab>('oficina');
  const [selected, setSelected] = useState<string | undefined>(undefined);
  const [request, setRequest] = useState(draftRequest);
  const [picked, setPicked] = useState<string[]>(areas.map((a) => a.id));
  const [boss, setBoss] = useState<string>(agents.find((a) => a.isSupervisor)?.id ?? '');
  const [iso, setIso] = useState(false);
  const [entering, setEntering] = useState(true);   // animación de presentación

  const supervisors = useMemo(() => agents.filter((a) => a.isSupervisor), [agents]);
  const staff = useMemo(() => agents.filter((a) => !a.isSupervisor), [agents]);

  /** Agentes por área, ordenados por experiencia de mayor a menor. */
  const byArea = useMemo(() => {
    const map: Record<string, OfficeAgent[]> = {};
    for (const a of areas) {
      map[a.id] = staff.filter((s) => s.areaId === a.id).sort((x, y) => y.xp - x.xp);
    }
    return map;
  }, [areas, staff]);

  const loose = useMemo(
    () => staff.filter((s) => !s.areaId || !areas.some((a) => a.id === s.areaId)).sort((x, y) => y.xp - x.xp),
    [areas, staff],
  );

  const zones: Zone[] = useMemo(() => {
    const rects = layoutZones(areas);
    return areas.map((area, i) => ({ area, rect: rects[i], seats: layoutSeats(rects[i], byArea[area.id] ?? []) }));
  }, [areas, byArea]);

  const bossSeats: Seat[] = useMemo(() => layoutSeats(BOSS_ZONE, supervisors), [supervisors]);

  /** Orden de entrada: primero el supervisor, luego las áreas. */
  const entryOrder = useMemo(
    () => [...supervisors.map((a) => a.id), ...zones.flatMap((z) => z.seats.map((s) => s.agent.id))],
    [supervisors, zones],
  );

  // Único temporizador del módulo: apaga el "caminando" cuando todos llegaron
  // a su mesa. Es presentación, no lógica de negocio.
  useEffect(() => {
    const total = 620 + entryOrder.length * 280;
    const t = window.setTimeout(() => setEntering(false), total);
    return () => window.clearTimeout(t);
  }, [entryOrder.length]);

  const go = (t: OfficeTab) => { setTab(t); onTabChange?.(t); };
  const choose = (a: OfficeAgent) => { setSelected(a.id); onSelectAgent?.(a); };
  const toggleArea = (id: string) =>
    setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);

  const canRun = request.trim().length > 0 && picked.length > 0;
  const run = () => {
    if (!canRun) return;
    onRun?.({ request: request.trim(), areaIds: picked, supervisorId: boss || undefined });
  };

  const stateOf = (a: OfficeAgent, idx: number): 'idle' | 'walking' | 'working' | 'done' | 'static' => {
    if (entering && idx >= 0) return 'walking';
    if (a.status === 'trabajando') return 'working';
    if (a.status === 'termino') return 'done';
    return 'idle';
  };

  /** Un agente parado detrás de su mesa. */
  const renderSeat = (s: Seat, zoneColor: string) => {
    const idx = entryOrder.indexOf(s.agent.id);
    const lvl = levelFor(s.agent.xp);
    return (
      <React.Fragment key={s.agent.id}>
        <button
          className={`of-seat${selected === s.agent.id ? ' is-sel' : ''}`}
          style={{
            left: pctX(s.cx), top: pctY(s.feetY),
            ['--fx' as string]: pctX(DOOR_FEET.x),
            ['--fy' as string]: pctY(DOOR_FEET.y),
            animationDelay: `${Math.max(idx, 0) * 280}ms`,
          }}
          onClick={() => choose(s.agent)}
          aria-label={`${s.agent.name}, ${s.agent.role}`}
          title={`${s.agent.name} · ${s.agent.role}`}
        >
          <Avatar avatar={s.agent.avatar} size={52} state={stateOf(s.agent, idx)} />
        </button>
        <div
          className="of-desk"
          style={{ left: pctX(s.cx), top: pctY(s.deskY), width: pctX(s.deskW), borderColor: `${zoneColor}55` }}
        >
          <span className="of-desk-nm">{s.agent.name}</span>
          <span className="of-desk-lv">Nv.{lvl}</span>
        </div>
      </React.Fragment>
    );
  };

  return (
    <div className="of">
      {/* ── encabezado ── */}
      <header className="of-head">
        <div className="of-head-l">
          <span className="of-emoji" aria-hidden="true">{project.emoji}</span>
          <div>
            <h1 className="of-title">{project.name}</h1>
            <p className="of-sub">{project.description}</p>
          </div>
        </div>
        <div className="of-head-r">
          <div className="of-xp-box" title={`${project.xp} de experiencia`}>
            <span className="of-xp-lb">Nivel {levelFor(project.xp)}</span>
            <span className="of-bar"><i style={{ width: `${xpPct(project.xp)}%` }} /></span>
          </div>
          <button className="of-btn" onClick={onOpenPlano}>{I.map} Ver plano</button>
          <button className="of-btn" onClick={onOpenCopilot}>{I.wand} Ayudante</button>
          <button className="of-btn primary" onClick={onAddAgent}>{I.plus} Nuevo agente</button>
        </div>
      </header>

      <div className="of-grid">
        {/* ══ izquierda: Tu gente ══ */}
        <aside className="of-card of-people">
          <div className="of-card-hd">
            <span className="of-ico">{I.people}</span>
            <h2>Tu gente</h2>
            <span className="of-count">{agents.length}</span>
          </div>
          <div className="of-card-bd">
            {[
              { key: 'dir', title: 'Dirección', emoji: '👔', color: '#1B2340', list: supervisors, xp: project.xp },
              ...areas.map((a) => ({ key: a.id, title: a.name, emoji: a.emoji, color: a.color, list: byArea[a.id] ?? [], xp: a.xp })),
              ...(loose.length ? [{ key: 'sin', title: 'Sin área', emoji: '🪑', color: '#9AA1B4', list: loose, xp: 0 }] : []),
            ].map((g) => (
              <section className="of-group" key={g.key}>
                <div className="of-group-hd">
                  <span className="of-dot" style={{ background: g.color }} aria-hidden="true" />
                  <span className="of-group-nm">{g.emoji} {g.title}</span>
                  <span className="of-group-lv">Nv.{levelFor(g.xp)}</span>
                </div>
                {g.list.length === 0 && <p className="of-empty">Todavía no hay nadie sentado aquí.</p>}
                {g.list.map((a) => {
                  const st = a.status ?? 'libre';
                  return (
                    <button key={a.id} className={`of-person${selected === a.id ? ' is-sel' : ''}`}
                      onClick={() => choose(a)} aria-pressed={selected === a.id}>
                      <Avatar avatar={a.avatar} size={34} state={st === 'trabajando' ? 'working' : 'static'} />
                      <span className="of-person-tx">
                        <span className="of-person-nm">{a.name}</span>
                        <span className="of-person-rl">{a.role}</span>
                        <span className="of-bar sm"><i style={{ width: `${xpPct(a.xp)}%`, background: g.color }} /></span>
                      </span>
                      <span className="of-person-rt">
                        <span className={`of-state ${st}`}>{STATUS_LABEL[st]}</span>
                        <span className="of-lv">Nv.{levelFor(a.xp)}</span>
                      </span>
                    </button>
                  );
                })}
              </section>
            ))}
          </div>
        </aside>

        {/* ══ centro: Oficina ══ */}
        <section className="of-main">
          <div className="of-tabs">
            <div className="of-tabs-l" role="tablist" aria-label="Vistas del proyecto">
              {TABS.map((t) => (
                <button key={t.id} role="tab" aria-selected={tab === t.id}
                  className={`of-tab${tab === t.id ? ' is-on' : ''}`} onClick={() => go(t.id)}>
                  {t.label}
                </button>
              ))}
            </div>
            <label className="of-switch" title="Ver el piso en perspectiva">
              <input type="checkbox" checked={iso} onChange={(e) => setIso(e.target.checked)} />
              <span className="of-track"><i /></span>
              Isométrico
            </label>
          </div>

          {tab === 'oficina' && (
            <div className="of-canvas">
              <div className="of-stage" data-iso={iso ? 'true' : undefined}>
                <div className="of-floor">
                  {/* zona fija del supervisor */}
                  <div className="of-zone boss" style={{
                    left: pctX(BOSS_ZONE.x), top: pctY(BOSS_ZONE.y),
                    width: pctX(BOSS_ZONE.w), height: pctY(BOSS_ZONE.h),
                  }}>
                    <span className="of-zone-lb">👔 Dirección</span>
                  </div>

                  {/* zonas de área */}
                  {zones.map((z) => {
                    const lvl = levelFor(z.area.xp);
                    return (
                      <div key={z.area.id} className="of-zone" style={{
                        left: pctX(z.rect.x), top: pctY(z.rect.y),
                        width: pctX(z.rect.w), height: pctY(z.rect.h),
                        background: `${z.area.color}26`, borderColor: `${z.area.color}80`,
                      }}>
                        <span className="of-zone-lb" style={{ color: z.area.color }}>
                          {z.area.emoji} {z.area.name} · Nv.{lvl}{lvl >= 3 ? ' ⭐' : ''}
                        </span>
                      </div>
                    );
                  })}

                  {/* puerta y franja de entregables */}
                  <div className="of-door" style={{
                    left: pctX(DOOR.x), top: pctY(DOOR.y), width: pctX(DOOR.w), height: pctY(DOOR.h),
                  }}>
                    <span aria-hidden="true">🚪</span>
                    <small>Entrada</small>
                  </div>
                  <div className="of-strip" style={{
                    left: pctX(STRIP.x), top: pctY(STRIP.y), width: pctX(STRIP.w), height: pctY(STRIP.h),
                  }}>
                    <span className="of-strip-lb">📬 Entregables</span>
                    {results.slice(0, 3).map((r) => (
                      <button key={r.id} className="of-strip-chip" onClick={() => onOpenResult?.(r)}>
                        {r.title}
                      </button>
                    ))}
                    {results.length === 0 && <span className="of-strip-mut">Aquí caerá lo que terminen.</span>}
                  </div>

                  {/* gente en sus mesas */}
                  {bossSeats.map((s) => renderSeat(s, '#1B2340'))}
                  {zones.map((z) => z.seats.map((s) => renderSeat(s, z.area.color)))}
                </div>
              </div>
            </div>
          )}

          {tab === 'plano' && (
            <div className="of-canvas flat">
              <div className="of-plan">
                <p className="of-plan-tt">Así se pasan el trabajo</p>
                <div className="of-flow">
                  {steps.map((s, i) => (
                    <React.Fragment key={s}>
                      <span className="of-step">{i + 1}. {s}</span>
                      <span className="of-arrow" aria-hidden="true">{I.fwd}</span>
                    </React.Fragment>
                  ))}
                  <span className="of-step end">◆ Entregable final</span>
                </div>
                <button className="of-btn primary" onClick={onOpenPlano}>{I.map} Abrir el plano completo</button>
              </div>
            </div>
          )}

          {tab === 'agentes' && (
            <div className="of-canvas flat">
              <div className="of-cards">
                {agents.map((a) => (
                  <button key={a.id} className={`of-mini${selected === a.id ? ' is-sel' : ''}`} onClick={() => choose(a)}>
                    <Avatar avatar={a.avatar} size={56} state="static" />
                    <b>{a.name}</b>
                    <span>{a.role}</span>
                    <span className="of-lv">Nv.{levelFor(a.xp)}</span>
                  </button>
                ))}
                <button className="of-mini add" onClick={onAddAgent}>
                  <span className="of-mini-plus" aria-hidden="true">+</span>
                  <b>Nuevo agente</b>
                  <span>Súmalo a un área</span>
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ══ derecha: Pedidos ══ */}
        <aside className="of-side">
          <div className="of-card">
            <div className="of-card-hd">
              <span className="of-ico amber">{I.bolt}</span>
              <h2>Pedidos</h2>
            </div>
            <div className="of-card-bd">
              <label className="of-lb" htmlFor="of-req">¿Qué necesitas?</label>
              <textarea id="of-req" className="of-ta" value={request} placeholder={SEED_REQUEST}
                onChange={(e) => setRequest(e.target.value)} />

              <div className="of-f">
                <span className="of-lb">¿Quiénes le entran?</span>
                <div className="of-chips">
                  {areas.map((a) => (
                    <button key={a.id} className={`of-chip${picked.includes(a.id) ? ' is-on' : ''}`}
                      aria-pressed={picked.includes(a.id)} onClick={() => toggleArea(a.id)}>
                      {a.emoji} {a.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="of-f">
                <label className="of-lb" htmlFor="of-boss">¿Quién reparte el trabajo?</label>
                <select id="of-boss" className="of-sel" value={boss} onChange={(e) => setBoss(e.target.value)}>
                  <option value="">Nadie por ahora</option>
                  {supervisors.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} · {s.role}</option>
                  ))}
                </select>
              </div>

              <button className="of-run" onClick={run} disabled={!canRun}>{I.send} Poner a trabajar</button>
              <p className="of-hint">Se lo pasa a {picked.length || 'ninguna'} {picked.length === 1 ? 'área' : 'áreas'}.</p>
            </div>
          </div>

          <div className="of-card">
            <div className="of-card-hd">
              <span className="of-ico">{I.pulse}</span>
              <h2>Lo que está pasando</h2>
            </div>
            <div className="of-card-bd">
              <ul className="of-log">
                {activity.map((e) => (
                  <li key={e.id} className={e.tone ?? 'normal'}>
                    <span className="of-log-h">{e.time}</span>
                    <span className="of-log-i" aria-hidden="true">{e.icon}</span>
                    <span className="of-log-t">{e.text}</span>
                  </li>
                ))}
                {activity.length === 0 && <li className="normal"><span className="of-log-t of-mut">Todo tranquilo por ahora.</span></li>}
              </ul>
            </div>
          </div>

          <div className="of-card">
            <div className="of-card-hd">
              <span className="of-ico">{I.box}</span>
              <h2>Entregables</h2>
              <span className="of-count">{results.length}</span>
            </div>
            <div className="of-card-bd">
              {results.map((r) => (
                <button key={r.id} className="of-result" onClick={() => onOpenResult?.(r)}>
                  <span className="of-result-ic">{I.doc}</span>
                  <span className="of-result-tx">
                    <b>{r.title}</b>
                    {r.summary && <span className="of-result-sm">{r.summary}</span>}
                    <span className="of-result-mt">{r.format}{r.author ? ` · ${r.author}` : ''}{r.time ? ` · ${r.time}` : ''}</span>
                  </span>
                </button>
              ))}
              {results.length === 0 && <p className="of-empty">Cuando terminen, lo dejan aquí.</p>}
              <p className="of-hand">Todo queda guardado ♡</p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Office;
