/**
 * MiniOficina · Lobby (dashboard de inicio) — §6.1 del SPEC · ruta '/'
 * ------------------------------------------------------------------
 * MÓDULO DE UI, sin lógica de negocio: no lee ni escribe el store, no llama al
 * server, no navega. Todo entra por props y sale por callbacks:
 *
 *   <Lobby
 *     userName="Christian"
 *     projects={state.projects}
 *     agents={state.agents}
 *     areas={state.areas}
 *     planos={state.planos}
 *     skills={state.skills}
 *     onOpenProject={(id) => nav(`/proyecto/${id}`)}
 *     onCreateProject={(p) => store.addProject(p)}
 *     onCreateAgent={() => nav('/agentes/nuevo')}
 *     onEditAgent={(a) => nav(`/agentes/${a.id}`)}
 *     onNewPlano={() => nav('/planos/nuevo')}
 *     onUsePlano={(planoId) => abrirNuevoProyectoCon(planoId)}
 *     onOpenCopilot={() => setCopilot(true)}
 *   />
 *
 * Lo único que hace por su cuenta es estado de UI: el filtro de área y el
 * borrador del modal "Nuevo proyecto". Renderiza completo sin props (seed §16).
 */
import React, { useMemo, useState } from 'react';
import type { Avatar as AvatarModel } from '../types';
import { Avatar } from '../components/avatar/Avatar';
import './lobby.css';

/* ───────────────────── Tipos del módulo ─────────────────────
   `types.ts` sólo publica el Avatar; lo demás sigue los nombres del contrato §7
   pero vive aquí para no tocar el contrato.                                   */

// local: no está en el contrato §7 (mismos campos que §7, declarados aquí)
export interface LobbyArea { id: string; name: string; emoji: string; color: string; xp: number }

// local: no está en el contrato §7
export interface LobbyAgent {
  id: string; name: string; role: string; avatar: AvatarModel;
  skillIds: string[]; areaId?: string; isSupervisor?: boolean; xp: number;
}

// local: no está en el contrato §7
export interface LobbyPlanoNode {
  id: string; kind: 'area' | 'agent' | 'process' | 'result';
  title?: string; agentId?: string; areaId?: string; format?: string;
}

// local: no está en el contrato §7
export interface LobbyPlano { id: string; name: string; nodes: LobbyPlanoNode[] }

// local: no está en el contrato §7
export interface LobbyProject {
  id: string; name: string; emoji: string; description: string;
  planoId?: string; areaIds: string[]; agentIds: string[]; xp: number;
  /** local: texto ya listo para mostrar ("hace 2 horas"). Lo arma quien tiene los datos. */
  lastActivity?: string;
}

export interface LobbySkill { id: string; name: string }

/** Lo que viaja en `onCreateProject`. */
export interface NewProjectPayload {
  name: string; emoji: string; description: string;
  /** `undefined` = empezar con un espacio de trabajo vacío. */
  planoId?: string;
}

export interface LobbyProps {
  userName?: string;
  projects?: LobbyProject[];
  agents?: LobbyAgent[];
  areas?: LobbyArea[];
  planos?: LobbyPlano[];
  skills?: LobbySkill[];
  /** Tira de emojis del modal. */
  emojis?: string[];
  onOpenProject?: (id: string) => void;
  onCreateProject?: (payload: NewProjectPayload) => void;
  onCreateAgent?: () => void;
  onEditAgent?: (agent: LobbyAgent) => void;
  onNewPlano?: () => void;
  onUsePlano?: (planoId: string) => void;
  onOpenCopilot?: () => void;
}

/* ───────────────────── Niveles (§7) ───────────────────── */

const LEVELS = [0, 50, 150, 300, 500];
const levelFor = (xp: number) => LEVELS.filter((t) => xp >= t).length;

/* ───────────────────── Seed compartido (§16) ───────────────────── */

export const LOBBY_AREAS: LobbyArea[] = [
  { id: 'inv', name: 'Investigación', emoji: '🔎', color: '#4D96FF', xp: 40 },
  { id: 'mkt', name: 'Marketing', emoji: '🎨', color: '#FF6B6B', xp: 25 },
  { id: 'ven', name: 'Ventas', emoji: '💰', color: '#6BCB77', xp: 15 },
];

export const LOBBY_SKILLS: LobbySkill[] = [
  { id: 'resumir', name: 'Resumir' }, { id: 'redactar', name: 'Redactar' },
  { id: 'analizar', name: 'Analizar' }, { id: 'traducir', name: 'Traducir' },
  { id: 'revisar', name: 'Revisar' }, { id: 'buscar', name: 'Buscar en web' },
];

export const LOBBY_AGENTS: LobbyAgent[] = [
  { id: 'ramon', name: 'Don Ramón', role: 'Gerente', isSupervisor: true, xp: 280,
    skillIds: ['revisar', 'resumir'], avatar: { body: 'round', eyes: 'focused', hat: 'crown', color: '#FFD93D' } },
  { id: 'lupita', name: 'Lupita', role: 'Investigadora de mercado', areaId: 'inv', xp: 145,
    skillIds: ['buscar', 'resumir'], avatar: { body: 'bean', eyes: 'big', hat: 'none', color: '#4D96FF' } },
  { id: 'beto', name: 'Beto', role: 'Analista de competencia', areaId: 'inv', xp: 60,
    skillIds: ['analizar', 'buscar'], avatar: { body: 'square', eyes: 'focused', hat: 'cap', color: '#B892FF' } },
  { id: 'monica', name: 'Mónica', role: 'Redactora creativa', areaId: 'mkt', xp: 95,
    skillIds: ['redactar', 'revisar'], avatar: { body: 'round', eyes: 'happy', hat: 'none', color: '#FF6B6B' } },
  { id: 'diego', name: 'Diego', role: 'Diseñador de campaña', areaId: 'mkt', xp: 30,
    skillIds: ['redactar', 'analizar'], avatar: { body: 'tall', eyes: 'star', hat: 'antenna', color: '#FF9F1C' } },
  { id: 'sofia', name: 'Sofía', role: 'Estratega de ventas', areaId: 'ven', xp: 45,
    skillIds: ['analizar', 'redactar'], avatar: { body: 'bean', eyes: 'happy', hat: 'cap', color: '#6BCB77' } },
];

export const LOBBY_PLANOS: LobbyPlano[] = [
  { id: 'pl1', name: 'Lanzamiento de producto', nodes: [
    { id: 'pl1-p1', kind: 'process', title: 'Investigar mercado', agentId: 'lupita', areaId: 'inv' },
    { id: 'pl1-p2', kind: 'process', title: 'Analizar competencia', agentId: 'beto', areaId: 'inv' },
    { id: 'pl1-p3', kind: 'process', title: 'Redactar campaña', agentId: 'monica', areaId: 'mkt' },
    { id: 'pl1-p4', kind: 'process', title: 'Plan de ventas', agentId: 'sofia', areaId: 'ven' },
    { id: 'pl1-r', kind: 'result', title: 'Plan de lanzamiento', format: 'documento' },
  ] },
  { id: 'pl2', name: 'Atención a clientes', nodes: [
    { id: 'pl2-p1', kind: 'process', title: 'Entender la queja' },
    { id: 'pl2-p2', kind: 'process', title: 'Proponer solución' },
    { id: 'pl2-r', kind: 'result', title: 'Respuesta al cliente', format: 'mensaje' },
  ] },
];

export const LOBBY_PROJECTS: LobbyProject[] = [
  { id: 'p1', name: 'Lanzamiento Café Frío', emoji: '☕',
    description: 'Lanzar nuestra bebida de café frío en CDMX en 4 semanas.',
    planoId: 'pl1', areaIds: ['inv', 'mkt', 'ven'],
    agentIds: ['ramon', 'lupita', 'beto', 'monica', 'sofia'], xp: 120, lastActivity: 'hace 2 horas' },
  { id: 'p2', name: 'Atención a clientes', emoji: '🛟',
    description: 'Responder dudas y quejas en menos de 2 horas.',
    planoId: 'pl2', areaIds: ['ven'], agentIds: ['ramon', 'sofia'], xp: 30, lastActivity: 'ayer' },
];

const EMOJIS = ['☕', '🛟', '🚀', '🎨', '📈', '🧪', '🛒', '📣', '🍰', '🧭', '💡', '📦'];

const EMPTY_AVATAR: AvatarModel = { body: 'bean', eyes: 'big', hat: 'none', color: '#4D96FF' };

/* ───────────────────── Iconos mínimos ───────────────────── */

const I = {
  folder: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M3 6h6l2 2.5h10V19H3z" /></svg>,
  team: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="3.4" /><path d="M5 20a7 7 0 0 1 14 0" /></svg>,
  map: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M6 6h4v4H6zM14 14h4v4h-4zM10 8h4a2 2 0 0 1 2 2v4" /></svg>,
  spark: <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l1.7 4.9L18.6 9.6 13.7 11.3 12 16.2 10.3 11.3 5.4 9.6l4.9-1.7z" /></svg>,
  fwd: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>,
  check: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12.5l5.2 5L20 6.5" /></svg>,
  close: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>,
};

/* ───────────────────── Piezas ───────────────────── */

const pasosDe = (plano?: LobbyPlano) => (plano?.nodes ?? []).filter((n) => n.kind === 'process');
const resultadoDe = (plano?: LobbyPlano) => (plano?.nodes ?? []).find((n) => n.kind === 'result');

const EmptyShelf: React.FC<{ line: string; cta: string; onCta?: () => void }> = ({ line, cta, onCta }) => (
  <div className="lb-empty">
    <Avatar avatar={EMPTY_AVATAR} size={72} state="idle" />
    <p>{line}</p>
    <p className="lb-hand">Aquí no hay nadie todavía…</p>
    <button className="lb-btn primary sm" onClick={onCta}>{cta}</button>
  </div>
);

/* ───────────────────── Componente ───────────────────── */

export const Lobby: React.FC<LobbyProps> = ({
  userName = 'Christian',
  projects = LOBBY_PROJECTS,
  agents = LOBBY_AGENTS,
  areas = LOBBY_AREAS,
  planos = LOBBY_PLANOS,
  skills = LOBBY_SKILLS,
  emojis = EMOJIS,
  onOpenProject, onCreateProject, onCreateAgent, onEditAgent,
  onNewPlano, onUsePlano, onOpenCopilot,
}) => {
  /* ── estado de UI, nada más ── */
  const [areaFilter, setAreaFilter] = useState<string>('todas');
  const [openNew, setOpenNew] = useState(false);
  const [touched, setTouched] = useState(false);
  const [draft, setDraft] = useState<NewProjectPayload>({ name: '', emoji: emojis[0] ?? '🚀', description: '' });

  const planoById = useMemo(
    () => Object.fromEntries(planos.map((p) => [p.id, p])) as Record<string, LobbyPlano>, [planos]);
  const skillName = (id: string) => skills.find((s) => s.id === id)?.name ?? id;

  const haySinArea = agents.some((a) => !a.areaId);
  const agentesVisibles = agents.filter((a) =>
    areaFilter === 'todas' ? true : areaFilter === 'direccion' ? !a.areaId : a.areaId === areaFilter);

  const abrirModal = (planoId?: string) => {
    setDraft({ name: '', emoji: emojis[0] ?? '🚀', description: '', planoId });
    setTouched(false);
    setOpenNew(true);
  };

  const crear = () => {
    setTouched(true);
    if (!draft.name.trim()) return;
    onCreateProject?.({ ...draft, name: draft.name.trim(), description: draft.description.trim() });
    setOpenNew(false);
  };

  const usarPlano = (planoId: string) => {
    onUsePlano?.(planoId);
    abrirModal(planoId);
  };

  return (
    <div className="lb">
      {/* ── encabezado ── */}
      <header className="lb-head">
        <div>
          <h1 className="lb-title">Hola, {userName} 👋</h1>
          <p className="lb-sub">Tu oficina está lista. ¿Con qué le entramos hoy?</p>
        </div>
        <div className="lb-head-r">
          <button className="lb-btn" onClick={onOpenCopilot}>{I.spark} Pídeselo a la oficina</button>
          <button className="lb-btn primary" onClick={() => abrirModal()}>+ Nuevo proyecto</button>
        </div>
      </header>

      {/* ── estante 1: proyectos ── */}
      <section className="lb-shelf">
        <div className="lb-shelf-hd">
          <span className="lb-ico">{I.folder}</span>
          <h2>Mis proyectos</h2>
          <span className="lb-count">{projects.length} en marcha</span>
          <button className="lb-btn sm" onClick={() => abrirModal()}>+ Nuevo proyecto</button>
        </div>

        {projects.length === 0 ? (
          <EmptyShelf line="Aún no tienes proyectos. Crea el primero y tu equipo se pone a trabajar."
                      cta="+ Nuevo proyecto" onCta={() => abrirModal()} />
        ) : (
          <div className="lb-grid proj">
            {projects.map((p) => {
              const plano = p.planoId ? planoById[p.planoId] : undefined;
              return (
                <article className="lb-card lb-proj" key={p.id}>
                  <div className="lb-proj-top">
                    <span className="lb-emoji" aria-hidden>{p.emoji}</span>
                    <div style={{ minWidth: 0 }}>
                      <h3 className="lb-proj-name">{p.name}</h3>
                      <span className="lb-nv">Nivel {levelFor(p.xp)}</span>
                    </div>
                  </div>
                  <p className="lb-proj-desc">{p.description}</p>
                  <div className="lb-metrics">
                    <div className="lb-metric"><b>{p.agentIds.length}</b><span>agentes</span></div>
                    <div className="lb-metric"><b>{p.areaIds.length}</b><span>áreas</span></div>
                    <div className="lb-metric"><b>{pasosDe(plano).length}</b><span>pasos</span></div>
                  </div>
                  <div className="lb-proj-foot">
                    <span className="lb-when">Última actividad: {p.lastActivity ?? 'sin movimiento'}</span>
                    <button className="lb-btn primary sm" onClick={() => onOpenProject?.(p.id)}>
                      Abrir {I.fwd}
                    </button>
                  </div>
                </article>
              );
            })}
            <button className="lb-new" onClick={() => abrirModal()}>
              <span className="plus" aria-hidden>+</span>
              Nuevo proyecto
            </button>
          </div>
        )}
      </section>

      {/* ── estante 2: agentes ── */}
      <section className="lb-shelf">
        <div className="lb-shelf-hd">
          <span className="lb-ico">{I.team}</span>
          <h2>Biblioteca de agentes</h2>
          <span className="lb-count">{agents.length} contratados</span>
          <button className="lb-btn sm" onClick={onCreateAgent}>+ Crear agente</button>
        </div>

        {agents.length === 0 ? (
          <EmptyShelf line="Tu oficina está vacía. Contrata a tu primer agente y ponle un escritorio."
                      cta="+ Crear agente" onCta={onCreateAgent} />
        ) : (
          <>
            <div className="lb-chips" role="group" aria-label="Filtrar agentes por área">
              <button className="lb-chip" aria-pressed={areaFilter === 'todas'}
                      onClick={() => setAreaFilter('todas')}>Todas</button>
              {areas.map((a) => (
                <button key={a.id} className="lb-chip" aria-pressed={areaFilter === a.id}
                        onClick={() => setAreaFilter(a.id)}>
                  <span className="lb-dotc" style={{ background: a.color }} aria-hidden />
                  {a.emoji} {a.name}
                </button>
              ))}
              {haySinArea && (
                <button className="lb-chip" aria-pressed={areaFilter === 'direccion'}
                        onClick={() => setAreaFilter('direccion')}>👔 Dirección</button>
              )}
            </div>

            {agentesVisibles.length === 0 ? (
              <EmptyShelf line="Nadie trabaja en esta área todavía. ¿Contratamos a alguien?"
                          cta="+ Crear agente" onCta={onCreateAgent} />
            ) : (
              <div className="lb-grid agents">
                {agentesVisibles.map((a) => (
                  <button className="lb-agent" key={a.id} onClick={() => onEditAgent?.(a)}
                          aria-label={`Ver a ${a.name}, ${a.role}`}>
                    <Avatar avatar={a.avatar} size={84} state="idle" />
                    <h3 className="lb-agent-name">{a.name}</h3>
                    <p className="lb-agent-role">{a.role}</p>
                    <span className="lb-nv">Nivel {levelFor(a.xp)}</span>
                    <div className="lb-skills">
                      {a.skillIds.slice(0, 2).map((s) => (
                        <span className="lb-skill" key={s}>{skillName(s)}</span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* ── estante 3: planos ── */}
      <section className="lb-shelf">
        <div className="lb-shelf-hd">
          <span className="lb-ico amber">{I.map}</span>
          <h2>Espacios de trabajo (planos)</h2>
          <span className="lb-count">{planos.length} guardados</span>
          <button className="lb-btn sm" onClick={onNewPlano}>+ Nuevo plano</button>
        </div>

        {planos.length === 0 ? (
          <EmptyShelf line="Un plano es el mapa de cómo trabaja tu equipo. Dibuja el primero."
                      cta="+ Nuevo plano" onCta={onNewPlano} />
        ) : (
          <div className="lb-grid planos">
            {planos.map((pl) => {
              const pasos = pasosDe(pl);
              const fin = resultadoDe(pl);
              return (
                <article className="lb-card lb-plano" key={pl.id}>
                  <div className="lb-plano-hd">
                    <h3>{pl.name}</h3>
                    <span className="lb-pasos">{pasos.length} pasos</span>
                  </div>
                  <div className="lb-flow" aria-hidden>
                    {pasos.map((n, i) => (
                      <React.Fragment key={n.id}>
                        {i > 0 && <span className="lb-link" />}
                        <div className="lb-node">
                          <span className="lb-bullet">{i + 1}</span>
                          <span>{n.title}</span>
                        </div>
                      </React.Fragment>
                    ))}
                    {fin && (
                      <>
                        <span className="lb-link" />
                        <div className="lb-node">
                          <span className="lb-bullet fin">★</span>
                          <span>{fin.title}</span>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="lb-plano-foot">
                    <span className="lb-hint">
                      {fin ? `Termina en ${fin.format ?? 'un entregable'}` : 'Sin entregable final'}
                    </span>
                    <button className="lb-btn sm" onClick={() => usarPlano(pl.id)}>Usar en proyecto</button>
                  </div>
                </article>
              );
            })}
            <button className="lb-new" onClick={onNewPlano}>
              <span className="plus" aria-hidden>+</span>
              Nuevo plano
            </button>
          </div>
        )}
      </section>

      {/* ── modal: nuevo proyecto ── */}
      {openNew && (
        <div className="lb-back" role="dialog" aria-modal="true" aria-label="Nuevo proyecto"
             onClick={(e) => { if (e.target === e.currentTarget) setOpenNew(false); }}>
          <div className="lb-sheet">
            <div className="lb-sheet-hd">
              <span className="lb-ico">{I.folder}</span>
              <h2>Nuevo proyecto</h2>
              <button className="lb-x" onClick={() => setOpenNew(false)} aria-label="Cerrar">{I.close}</button>
            </div>

            <div className="lb-sheet-bd">
              <div className={`lb-f ${touched && !draft.name.trim() ? 'lb-err' : ''}`}>
                <label className="lb-lb" htmlFor="lb-name">Nombre <span className="req">*</span></label>
                <input id="lb-name" className="lb-in" value={draft.name} placeholder="Lanzamiento Café Frío"
                       onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
                {touched && !draft.name.trim() && <p className="lb-msg">Ponle un nombre al proyecto.</p>}
              </div>

              <div className="lb-f">
                <label className="lb-lb">Escoge un emoji</label>
                <div className="lb-strip" role="group" aria-label="Emoji del proyecto">
                  {emojis.map((em) => (
                    <button key={em} className="lb-em" aria-pressed={draft.emoji === em} aria-label={`Emoji ${em}`}
                            onClick={() => setDraft({ ...draft, emoji: em })}>{em}</button>
                  ))}
                </div>
              </div>

              <div className="lb-f">
                <label className="lb-lb" htmlFor="lb-desc">¿De qué se trata?</label>
                <textarea id="lb-desc" className="lb-ta" value={draft.description}
                          placeholder="Lanzar nuestra bebida de café frío en CDMX en 4 semanas."
                          onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </div>

              <div className="lb-f">
                <label className="lb-lb">¿Cómo va a trabajar el equipo?</label>
                <div className="lb-opts">
                  <button className="lb-opt" aria-pressed={!draft.planoId}
                          onClick={() => setDraft({ ...draft, planoId: undefined })}>
                    <span className="lb-mark">{I.check}</span>
                    <span><b>Empezar vacío</b><small>Tú acomodas las áreas y los pasos.</small></span>
                  </button>
                  {planos.map((pl) => (
                    <button key={pl.id} className="lb-opt" aria-pressed={draft.planoId === pl.id}
                            onClick={() => setDraft({ ...draft, planoId: pl.id })}>
                      <span className="lb-mark">{I.check}</span>
                      <span><b>{pl.name}</b><small>{pasosDe(pl).length} pasos listos para usar</small></span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="lb-sheet-ft">
              <button className="lb-btn ghost" onClick={() => setOpenNew(false)}>Cancelar</button>
              <button className="lb-btn primary" onClick={crear}>Crear proyecto</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Lobby;
