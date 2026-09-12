/**
 * MiniOficina · Creador de agentes — §6.3 del SPEC
 * ------------------------------------------------------------------
 * MÓDULO DE UI, sin lógica de negocio: no lee ni escribe el store, no llama al
 * server, no navega. Todo entra por props y sale por callbacks:
 *
 *   <AgentBuilder
 *     value={agentEnEdicion}            // opcional → modo edición
 *     agents={state.agents}             // para "Reporta a"
 *     areas={areasDelProyecto}          // si viene de un proyecto → "Sentar en área"
 *     skills={state.skills}
 *     onSave={(draft) => store.addAgent(draft)}
 *     onCancel={() => nav(-1)}
 *     onTest={(draft) => probarAgente(draft)}   // P1
 *   />
 *
 * Lo único que hace por su cuenta es el estado del formulario y la validación
 * de §6.3 (nombre, puesto y "qué hace" obligatorios).
 */
import React, { useMemo, useRef, useState } from 'react';
import type { Avatar as AvatarModel, BodyVariant, EyesVariant, HatVariant } from '../../types';
import { AVATAR_COLORS } from '../../types';
import { Avatar, randomAvatar } from '../avatar/Avatar';
import {
  BODIES, EYES, HATS, EXTRA_EYES, EXTRA_HATS, METRICS, LABELS, EXTRA_LABELS, palette,
  BODY_VARIANTS, EYES_VARIANTS, HAT_VARIANTS,
} from '../avatar/parts';
import './agent-builder.css';

/* ───────────────────────── Tipos del módulo ───────────────────────── */

export interface AgentDraft {
  id?: string;
  name: string;
  role: string;
  avatar: AvatarModel;
  does: string;
  doesNot: string;
  delivers: string;          // se arma con los tokens de "¿Qué entrega?"
  skillIds: string[];
  supervisorId?: string;
  isSupervisor: boolean;
  areaId?: string;           // "Sentar en área"
}

export interface BuilderAgent { id: string; name: string; role: string; avatar: AvatarModel }
export interface BuilderArea  { id: string; name: string; emoji?: string; color?: string }
export interface BuilderSkill { id: string; name: string }

export interface AgentBuilderProps {
  value?: Partial<AgentDraft>;
  agents?: BuilderAgent[];
  areas?: BuilderArea[];
  skills?: BuilderSkill[];
  /** Sugerencias para "¿Qué entrega?" (§7: formatos en lenguaje natural). */
  deliverables?: string[];
  colors?: string[];
  /** Muestra las 8 piezas extra del sheet además de las 4+4 del contrato. */
  showExtras?: boolean;
  /** Nombre del proyecto de origen; si no viene, se oculta "Sentar en área". */
  projectName?: string;
  onSave?: (draft: AgentDraft) => void;
  onCancel?: () => void;
  onTest?: (draft: AgentDraft) => void;
  onOpenLibrary?: () => void;
  onBack?: () => void;
}

/** Paleta del mockup: el 6º tono es el oscuro del Supervisor. */
export const BUILDER_COLORS = ['#FFD93D', '#FF8FA8', '#4D96FF', '#6BCB77', '#B892FF', '#3A3D4D'];

const DEFAULT_SKILLS: BuilderSkill[] = [
  { id: 'resumir', name: 'Resumir información' }, { id: 'buscar', name: 'Buscar fuentes' },
  { id: 'analizar', name: 'Analizar datos' }, { id: 'redactar', name: 'Redactar informes' },
  { id: 'revisar', name: 'Revisar trabajo' }, { id: 'traducir', name: 'Traducir' },
];
const DEFAULT_DELIVERABLES = ['Reportes de investigación', 'Lista', 'Tabla', 'Documento', 'Mensaje', 'Resumen'];
const MAX_DOES = 500;

/* ───────────────────────── Iconos mínimos ───────────────────────── */

const I = {
  back: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>,
  fwd: <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>,
  play: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>,
  target: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3.2" /></svg>,
  bulb: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.3.3.5.7.5 1.1h6c0-.4.2-.8.5-1.1A6 6 0 0 0 12 3z" /></svg>,
  check: <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12.5l5.2 5L20 6.5" /></svg>,
  caret: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>,
  save: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M5 3h11l3 3v15H5z" /><path d="M8 3v6h8V3M8 21v-7h8v7" /></svg>,
  info: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 7.6v.1" strokeLinecap="round" /></svg>,
  lib: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"><path d="M5 4h9l5 5v11H5z" /><path d="M14 4v5h5" /></svg>,
};

/* ───────────────────────── Miniatura de una parte ───────────────────────── */

function PartThumb({ kind, variant, avatar }:
  { kind: 'body' | 'eyes' | 'hat'; variant: string; avatar: AvatarModel }) {
  const m = METRICS[avatar.body] ?? METRICS.round;
  const p = palette(avatar.color);
  const eyesFn = (EYES as Record<string, typeof EYES.big>)[variant] ?? EXTRA_EYES[variant];
  const hatFn = (HATS as Record<string, typeof HATS.cap>)[variant] ?? EXTRA_HATS[variant];
  return (
    <svg width={42} height={42} viewBox="0 0 128 128" aria-hidden="true">
      {kind === 'body' && BODIES[variant as BodyVariant](avatar.color, false)}
      {kind !== 'body' && BODIES[avatar.body](avatar.color, false)}
      {kind === 'eyes' && eyesFn?.(m, p)}
      {kind === 'hat' && hatFn?.(m, p)}
    </svg>
  );
}

/* ───────────────────────── Componente ───────────────────────── */

export const AgentBuilder: React.FC<AgentBuilderProps> = ({
  value, agents = [], areas = [], skills = DEFAULT_SKILLS,
  deliverables = DEFAULT_DELIVERABLES, colors = BUILDER_COLORS, showExtras = false,
  projectName, onSave, onCancel, onTest, onOpenLibrary, onBack,
}) => {
  const editing = Boolean(value?.id);

  const [avatar, setAvatar] = useState<AvatarModel>(
    value?.avatar ?? { body: 'round', eyes: 'big', hat: 'cap', color: colors[0] });
  const [name, setName] = useState(value?.name ?? '');
  const [role, setRole] = useState(value?.role ?? '');
  const [does, setDoes] = useState(value?.does ?? '');
  const [doesNot, setDoesNot] = useState(value?.doesNot ?? '');
  const [delivers, setDelivers] = useState<string[]>(
    value?.delivers ? value.delivers.split(',').map((s) => s.trim()).filter(Boolean) : []);
  const [skillIds, setSkillIds] = useState<string[]>(value?.skillIds ?? []);
  const [supervisorId, setSupervisorId] = useState<string | undefined>(value?.supervisorId);
  const [isSupervisor, setIsSupervisor] = useState(Boolean(value?.isSupervisor));
  const [areaId, setAreaId] = useState<string | undefined>(value?.areaId ?? areas[0]?.id);
  const [preview, setPreview] = useState<'idle' | 'walking' | 'working' | 'done'>('idle');
  const [touched, setTouched] = useState(false);
  const [openPick, setOpenPick] = useState(false);
  const [openSkills, setOpenSkills] = useState(false);
  const tokenRef = useRef<HTMLInputElement>(null);

  const bodyList = BODY_VARIANTS;
  const eyesList = showExtras ? [...EYES_VARIANTS, ...Object.keys(EXTRA_EYES)] : EYES_VARIANTS;
  const hatList = showExtras ? [...HAT_VARIANTS, ...Object.keys(EXTRA_HATS)] : HAT_VARIANTS;
  const labelOf = (kind: 'body' | 'eyes' | 'hat', v: string) =>
    (LABELS[kind] as Record<string, string>)[v] ??
    ((EXTRA_LABELS as Record<string, Record<string, string>>)[kind]?.[v]) ?? v;

  const errors = {
    name: touched && !name.trim() ? 'Ponle un nombre.' : '',
    role: touched && !role.trim() ? 'Dinos su puesto.' : '',
    does: touched && !does.trim() ? 'Describe qué hace, en una o dos frases.' : '',
  };
  const valid = Boolean(name.trim() && role.trim() && does.trim());

  const draft = (): AgentDraft => ({
    id: value?.id, name: name.trim(), role: role.trim(), avatar,
    does: does.trim(), doesNot: doesNot.trim(), delivers: delivers.join(', '),
    skillIds, supervisorId: isSupervisor ? undefined : supervisorId,
    isSupervisor, areaId: areas.length ? areaId : undefined,
  });

  const submit = () => { setTouched(true); if (valid) onSave?.(draft()); };

  const cycle = (dir: 1 | -1) => {
    const i = bodyList.indexOf(avatar.body);
    setAvatar({ ...avatar, body: bodyList[(i + dir + bodyList.length) % bodyList.length] });
  };

  const addToken = (t: string) => {
    const v = t.trim();
    if (v && !delivers.includes(v)) setDelivers([...delivers, v]);
  };

  const supervisor = useMemo(() => agents.find((a) => a.id === supervisorId), [agents, supervisorId]);
  const troupe = useMemo(() => colors.slice(0, 4).map((c, i) => ({
    body: BODY_VARIANTS[i % 4], eyes: 'big' as EyesVariant,
    hat: (['cap', 'antenna', 'crown', 'none'] as HatVariant[])[i % 4], color: c,
  })), [colors]);

  return (
    <div className="ab">
      {/* ── encabezado ── */}
      <header className="ab-head">
        <div className="ab-head-l">
          <button className="ab-back" onClick={onBack} aria-label="Volver">{I.back}</button>
          <div>
            <h1 className="ab-title">{editing ? 'Editar agente' : 'Creador de agentes'}</h1>
            <p className="ab-sub">
              {editing ? 'Ajusta su apariencia y su ficha.' : 'Diseña un nuevo agente de IA. Personaliza su apariencia y define su personalidad.'}
            </p>
          </div>
        </div>
        <div className="ab-head-r">
          <span className="ab-crumb">Agentes › <b>{editing ? name || 'Editar' : 'Nuevo'}</b></span>
          <button className="ab-btn" onClick={onOpenLibrary}>{I.lib} Ver biblioteca</button>
        </div>
      </header>

      <div className="ab-grid">
        {/* ── izquierda: apariencia ── */}
        <section className="ab-card">
          <div className="ab-card-bd">
            <div className="ab-preview">
              <p className="ab-hand">¡Hola!<br />Soy tu agente ♡</p>
              <button className="ab-nav l" onClick={() => cycle(-1)} aria-label="Cuerpo anterior">{I.back}</button>
              <button className="ab-nav r" onClick={() => cycle(1)} aria-label="Cuerpo siguiente">{I.fwd}</button>
              <Avatar avatar={avatar} size={206} state={preview} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <button className="ab-play"
                onClick={() => { setPreview('walking'); window.setTimeout(() => setPreview('idle'), 2400); }}>
                {I.play} Vista previa en movimiento
              </button>
            </div>

            {([['Ojos', 'eyes', eyesList], ['Cuerpo', 'body', bodyList], ['Gorro', 'hat', hatList]] as const)
              .map(([label, kind, list]) => (
                <div className="ab-part" key={kind}>
                  <div className="ab-part-lb">{label} ({list.length})</div>
                  <div className="ab-opts">
                    {list.map((v) => (
                      <button key={v} className="ab-opt" title={labelOf(kind, v)}
                        aria-pressed={avatar[kind] === v}
                        onClick={() => setAvatar({ ...avatar, [kind]: v } as AvatarModel)}>
                        <PartThumb kind={kind} variant={v} avatar={avatar} />
                      </button>
                    ))}
                  </div>
                </div>
              ))}

            <div className="ab-part">
              <div className="ab-part-lb">Color ({colors.length})</div>
              <div className="ab-opts c6">
                {colors.map((c) => (
                  <button key={c} className="ab-opt ab-sw" style={{ background: c }}
                    aria-pressed={avatar.color === c} aria-label={`Color ${c}`}
                    onClick={() => setAvatar({ ...avatar, color: c })} />
                ))}
              </div>
            </div>

            <button className="ab-dice" onClick={() => setAvatar(randomAvatar({ color: avatar.color }))}>
              🎲 Aleatorio
            </button>
          </div>
        </section>

        {/* ── centro: ficha ── */}
        <section className="ab-card">
          <div className="ab-card-hd">
            <span className="ab-chip-ico">{I.target}</span>
            <h2>Información del agente</h2>
          </div>
          <div className="ab-card-bd">
            <div className="ab-row">
              <div className={errors.name ? 'ab-err' : ''}>
                <label className="ab-lb" htmlFor="ab-name">Nombre <span className="req">*</span></label>
                <input id="ab-name" className="ab-in" value={name} placeholder="Lupita"
                       onChange={(e) => setName(e.target.value)} />
                {errors.name && <p className="ab-msg">{errors.name}</p>}
              </div>
              <div className={errors.role ? 'ab-err' : ''}>
                <label className="ab-lb" htmlFor="ab-role">Puesto <span className="req">*</span></label>
                <input id="ab-role" className="ab-in" value={role} placeholder="Investigadora"
                       onChange={(e) => setRole(e.target.value)} />
                {errors.role && <p className="ab-msg">{errors.role}</p>}
              </div>
            </div>

            <div className={`ab-f ${errors.does ? 'ab-err' : ''}`}>
              <label className="ab-lb" htmlFor="ab-does">¿Qué hace? <span className="req">*</span></label>
              <div className="ab-tawrap">
                <textarea id="ab-does" className="ab-ta" value={does} maxLength={MAX_DOES}
                  placeholder="Investiga información, analiza fuentes, resume hallazgos y encuentra oportunidades de mercado."
                  onChange={(e) => setDoes(e.target.value)} />
                <span className="ab-count">{does.length}/{MAX_DOES}</span>
              </div>
              {errors.does && <p className="ab-msg">{errors.does}</p>}
            </div>

            <div className="ab-f">
              <label className="ab-lb" htmlFor="ab-not">¿Qué NO hace?</label>
              <input id="ab-not" className="ab-in" value={doesNot}
                placeholder="No toma decisiones finales de negocio, no ejecuta campañas, no programa código."
                onChange={(e) => setDoesNot(e.target.value)} />
            </div>

            <div className="ab-f">
              <label className="ab-lb" htmlFor="ab-del">¿Qué entrega?</label>
              <div className="ab-tokens" onClick={() => tokenRef.current?.focus()}>
                {delivers.map((t) => (
                  <span className="ab-token" key={t}>{t}
                    <button onClick={() => setDelivers(delivers.filter((x) => x !== t))}
                            aria-label={`Quitar ${t}`}>×</button>
                  </span>
                ))}
                <input id="ab-del" ref={tokenRef} className="ab-token-in" placeholder="Selecciona o escribe…"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault(); addToken(e.currentTarget.value); e.currentTarget.value = '';
                    }
                  }} />
              </div>
              <div className="ab-sug">
                {deliverables.filter((d) => !delivers.includes(d)).map((d) => (
                  <button key={d} onClick={() => addToken(d)}>+ {d}</button>
                ))}
              </div>
            </div>

            <div className="ab-f">
              <label className="ab-lb">Habilidades</label>
              <div className="ab-tokens">
                {skillIds.map((id) => {
                  const sk = skills.find((s) => s.id === id);
                  return (
                    <span className="ab-token" key={id}>{sk?.name ?? id}
                      <button onClick={() => setSkillIds(skillIds.filter((x) => x !== id))}
                              aria-label={`Quitar ${sk?.name ?? id}`}>×</button>
                    </span>
                  );
                })}
                <button className="ab-add" onClick={() => setOpenSkills(!openSkills)}
                        aria-expanded={openSkills}>+ Agregar habilidad</button>
              </div>
              {openSkills && (
                <div className="ab-sug">
                  {skills.filter((s) => !skillIds.includes(s.id)).map((s) => (
                    <button key={s.id} onClick={() => { setSkillIds([...skillIds, s.id]); setOpenSkills(false); }}>
                      + {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="ab-row ab-f">
              <div>
                <label className="ab-lb">Reporta a</label>
                <div className="ab-pickwrap">
                  <button className="ab-pick" onClick={() => setOpenPick(!openPick)}
                          aria-haspopup="listbox" aria-expanded={openPick} disabled={isSupervisor}>
                    {supervisor
                      ? <><Avatar avatar={supervisor.avatar} size={26} state="static" /> {supervisor.name}</>
                      : <span style={{ color: 'var(--ab-ink-3)' }}>Nadie por ahora</span>}
                    <span className="car">{I.caret}</span>
                  </button>
                  {openPick && !isSupervisor && (
                    <div className="ab-menu" role="listbox">
                      <button onClick={() => { setSupervisorId(undefined); setOpenPick(false); }}>
                        <span style={{ color: 'var(--ab-ink-3)' }}>Nadie por ahora</span>
                      </button>
                      {agents.map((a) => (
                        <button key={a.id} role="option" aria-selected={a.id === supervisorId}
                                onClick={() => { setSupervisorId(a.id); setOpenPick(false); }}>
                          <Avatar avatar={a.avatar} size={26} state="static" />
                          <span>{a.name} <span className="rl">· {a.role}</span></span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 12 }}>
                <label className="ab-check">
                  <input type="checkbox" checked={isSupervisor}
                         onChange={(e) => setIsSupervisor(e.target.checked)} />
                  <span className="ab-box">{I.check}</span>
                  Es supervisor
                </label>
              </div>
            </div>

            {areas.length > 0 && (
              <div className="ab-f">
                <label className="ab-lb" htmlFor="ab-area">
                  Sentar en área <span className="ab-opt-tag">(opcional)</span>{' '}
                  <span style={{ color: 'var(--ab-ink-3)', verticalAlign: 'middle' }}>{I.info}</span>
                </label>
                <p className="ab-help">
                  {projectName
                    ? `Al guardar, se sienta en su mesa dentro del plano de ${projectName}.`
                    : 'Al guardar, se sienta en su mesa dentro del plano del proyecto.'}
                </p>
                <select id="ab-area" className="ab-sel" value={areaId ?? ''}
                        onChange={(e) => setAreaId(e.target.value || undefined)}>
                  <option value="">Sin área por ahora</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>{a.emoji ? `${a.emoji} ` : ''}{a.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="ab-foot">
              <button className="ab-btn" onClick={() => onTest?.(draft())}>{I.play} Probar agente (P1)</button>
              <button className="ab-btn ghost" onClick={onCancel}>Cancelar</button>
              <button className="ab-btn primary" onClick={submit} disabled={touched && !valid}>
                {I.save} {editing ? 'Guardar cambios' : 'Guardar agente'}
              </button>
            </div>
          </div>
        </section>

        {/* ── derecha: consejos ── */}
        <aside className="ab-aside">
          <div className="ab-card">
            <div className="ab-card-hd">
              <span className="ab-chip-ico" style={{ background: '#FFF6DD', color: '#C98A12' }}>{I.bulb}</span>
              <h2>Consejos</h2>
            </div>
            <div className="ab-card-bd" style={{ paddingTop: 12 }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--ab-ink-2)' }}>
                Sé específico en lo que hace tu agente. Entre más claro, mejores resultados.
              </p>
              <div className="ab-rule" />
              <strong style={{ fontSize: 13 }}>Un buen agente tiene:</strong>
              <ul className="ab-tips">
                {['Un rol claro', 'Entregables definidos', 'Límites (qué NO hace)', 'Habilidades específicas'].map((t) => (
                  <li key={t}><span className="ab-tick">{I.check}</span>{t}</li>
                ))}
              </ul>
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div className="ab-troupe">
              {troupe.map((a, i) => (
                <div key={i} style={{ marginLeft: i ? -10 : 0 }}>
                  <Avatar avatar={a as AvatarModel} size={54} state="idle" />
                </div>
              ))}
            </div>
            <p style={{ fontFamily: '"Caveat","Segoe Script",cursive', fontSize: 17, color: 'var(--ab-ink-3)', margin: 0 }}>
              Equipos de agentes,<br />ideas más grandes. ♡
            </p>
          </div>

          <blockquote className="ab-quote">
            “La inteligencia artificial trabaja mejor cuando tiene un buen equipo.”
            <cite>— MiniOficina</cite>
          </blockquote>
        </aside>
      </div>
    </div>
  );
};

export default AgentBuilder;
