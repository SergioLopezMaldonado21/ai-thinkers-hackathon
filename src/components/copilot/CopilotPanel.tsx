/**
 * MiniOficina · Panel generativo — §6.5 del SPEC
 * ------------------------------------------------------------------
 * "Clic izquierdo → crear/cambiar con IA". Panel lateral derecho (360px) que se
 * abre encima de cualquier pantalla, con velo suave detrás.
 *
 * MÓDULO DE UI, sin lógica de negocio: no llama al server, no toca el store, no
 * navega y NO genera las tarjetas de cambios. Todo entra por props y sale por
 * callbacks:
 *
 *   <CopilotPanel
 *     open={abierto}
 *     context="Agentes del proyecto Café Frío"
 *     thinking={estaPensando}
 *     changes={historialDeCambios}            // las arma quien llama, no el panel
 *     onSubmit={(texto) => pedirALaIA(texto)}
 *     onUndo={(id) => store.deshacer(id)}
 *     onViewInOffice={(id) => nav('/oficina')}
 *     onPickSuggestion={(texto) => setBorrador(texto)}
 *     onClose={() => setAbierto(false)}
 *   />
 *
 * Lo único que hace por su cuenta es estado de UI: el borrador del campo de
 * texto, el foco y el atajo ⌘K / Ctrl+K (que es teclado, no negocio).
 *
 * También exporta <CopilotFab /> — la pastilla ✨ de abajo a la derecha — para
 * montarla en el resto de las pantallas.
 */
import React, { useEffect, useRef, useState } from 'react';
import type { Avatar as AvatarModel } from '../../types';
import { Avatar } from '../avatar/Avatar';
import './copilot-panel.css';

/* ───────────────────────── Tipos del módulo ───────────────────────── */
/* local: no está en el contrato §7 — así describe el panel un cambio ya hecho. */

/** Cada línea del resumen de un cambio. */
export type ChangeKind = 'created' | 'updated' | 'removed';

export interface CopilotChangeLine {
  kind: ChangeKind;
  /** Tipo de elemento en lenguaje natural: "Área", "Agente", "Paso", "Plano"… */
  what: string;
  /** Nombre del elemento tocado: "Logística", "Lupita"… */
  name: string;
}

export interface CopilotChange {
  id: string;
  /** Resumen en una sola frase, en español claro. */
  summary: string;
  lines: CopilotChangeLine[];
  /** Momento en que pasó, ya formateado ("hace 2 minutos"). Opcional. */
  when?: string;
}

export interface CopilotPanelProps {
  /** Abre o cierra el panel. Por omisión abierto, para que se vea sin props. */
  open?: boolean;
  /** Dónde está parado el usuario: "Agentes del proyecto Café Frío". */
  context?: string;
  /** Los 3 chips de sugerencias rápidas. */
  suggestions?: string[];
  /** Mientras sea true se muestra "Pensando…". */
  thinking?: boolean;
  /** Historial de cambios. El panel NO lo genera. */
  changes?: CopilotChange[];
  /** Mascota que acompaña al panel. */
  helper?: AvatarModel;
  placeholder?: string;
  onSubmit?: (prompt: string) => void;
  onUndo?: (changeId: string) => void;
  onViewInOffice?: (changeId: string) => void;
  onPickSuggestion?: (text: string) => void;
  onClose?: () => void;
  /** Opcional: ⌘K con el panel cerrado avisa por aquí. */
  onRequestOpen?: () => void;
}

export interface CopilotFabProps {
  label?: string;
  onClick?: () => void;
}

/* ───────────────────────── Valores de ejemplo (seed §5) ───────────────────────── */

export const DEFAULT_SUGGESTIONS = [
  'Agrega un área de Logística con un agente que cotice envíos',
  'Ponle una habilidad de buscar en web a Lupita',
  'Crea un flujo para atender quejas',
];

const DEFAULT_CONTEXT = 'Agentes del proyecto Café Frío';

const DEFAULT_PLACEHOLDER =
  'Ejemplo: Agrega un área de Logística con un agente que cotice envíos a la Roma y la Condesa.';

/** Mascota de compañía: la de Lupita del seed §5. */
const DEFAULT_HELPER: AvatarModel = { body: 'bean', eyes: 'big', hat: 'none', color: '#4D96FF' };

/** Un cambio de ejemplo para que el panel nunca abra en blanco. */
export const DEFAULT_CHANGES: CopilotChange[] = [
  {
    id: 'c1',
    summary: 'Armé el área de Marketing con Mónica adentro y un paso para redactar la campaña.',
    when: 'hace un momento',
    lines: [
      { kind: 'created', what: 'Área', name: '🎨 Marketing' },
      { kind: 'created', what: 'Agente', name: 'Mónica · Redactora creativa' },
      { kind: 'created', what: 'Paso', name: 'Redactar campaña' },
      { kind: 'updated', what: 'Agente', name: 'Don Ramón · ahora supervisa Marketing' },
    ],
  },
];

/* ───────────────────────── Iconos mínimos ───────────────────────── */

const I = {
  spark: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.6l1.7 4.9 4.9 1.7-4.9 1.7L12 15.8l-1.7-4.9-4.9-1.7 4.9-1.7L12 2.6z" />
      <path d="M18.6 14.4l.9 2.5 2.5.9-2.5.9-.9 2.5-.9-2.5-2.5-.9 2.5-.9.9-2.5z" opacity=".65" />
    </svg>
  ),
  close: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  ),
  send: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12l16-8-6 8 6 8-16-8z" />
    </svg>
  ),
  office: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M4 20V7l7-3v16M11 20h9V11h-9" />
      <path d="M14.5 14.5h2M14.5 17.5h2M7 10v.1M7 13v.1M7 16v.1" strokeLinecap="round" />
    </svg>
  ),
  undo: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8h9a5 5 0 1 1 0 10H8" />
      <path d="M7.5 4.5L4 8l3.5 3.5" />
    </svg>
  ),
  pin: (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
      <path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  ),
};

/** Signo de cada tipo de línea del diff. */
const SIGN: Record<ChangeKind, string> = { created: '+', updated: '✎', removed: '−' };
const SIGN_LABEL: Record<ChangeKind, string> = { created: 'Creado', updated: 'Modificado', removed: 'Eliminado' };

/* ───────────────────────── Tarjeta de cambio ───────────────────────── */

const ChangeCard: React.FC<{
  change: CopilotChange;
  onUndo?: (id: string) => void;
  onViewInOffice?: (id: string) => void;
}> = ({ change, onUndo, onViewInOffice }) => (
  <article className="cp-change">
    <p className="cp-change-sum">{change.summary}</p>
    {change.when && <p className="cp-change-when">{change.when}</p>}
    <ul className="cp-diff">
      {change.lines.map((l, i) => (
        <li key={`${l.what}-${l.name}-${i}`} className={`cp-line ${l.kind}`}>
          <span className="cp-sign" aria-hidden="true">{SIGN[l.kind]}</span>
          <span className="cp-sr">{SIGN_LABEL[l.kind]}:</span>
          <span className="cp-what">{l.what}</span>
          <b className="cp-name">{l.name}</b>
        </li>
      ))}
    </ul>
    <div className="cp-change-foot">
      <button className="cp-btn" onClick={() => onViewInOffice?.(change.id)}>
        {I.office} Ver en la oficina
      </button>
      <button className="cp-btn ghost" onClick={() => onUndo?.(change.id)}>
        {I.undo} Deshacer
      </button>
    </div>
  </article>
);

/* ───────────────────────── Pastilla flotante ───────────────────────── */

export const CopilotFab: React.FC<CopilotFabProps> = ({ label = 'Pídeselo a la IA', onClick }) => (
  <button className="cp cp-fab" onClick={onClick} aria-label={label}>
    <span className="cp-fab-ico" aria-hidden="true">✨</span>
    <span className="cp-fab-tx">{label}</span>
    <kbd className="cp-fab-kbd">⌘K</kbd>
  </button>
);

/* ───────────────────────── Panel ───────────────────────── */

export const CopilotPanel: React.FC<CopilotPanelProps> = ({
  open = true,
  context = DEFAULT_CONTEXT,
  suggestions = DEFAULT_SUGGESTIONS,
  thinking = false,
  changes = DEFAULT_CHANGES,
  helper = DEFAULT_HELPER,
  placeholder = DEFAULT_PLACEHOLDER,
  onSubmit, onUndo, onViewInOffice, onPickSuggestion, onClose, onRequestOpen,
}) => {
  const [text, setText] = useState('');
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Atajo de teclado: ⌘K / Ctrl+K abre o cierra, Esc cierra. Es UI, no negocio.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (open) onClose?.(); else onRequestOpen?.();
        return;
      }
      if (e.key === 'Escape' && open) onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, onRequestOpen]);

  useEffect(() => { if (open) taRef.current?.focus(); }, [open]);

  if (!open) return null;

  const send = () => {
    const v = text.trim();
    if (!v) { taRef.current?.focus(); return; }
    onSubmit?.(v);
    setText('');
  };

  const pick = (s: string) => { setText(s); onPickSuggestion?.(s); taRef.current?.focus(); };

  return (
    <div className="cp cp-layer">
      <div className="cp-veil" onClick={onClose} aria-hidden="true" />

      <aside className="cp-panel" role="dialog" aria-modal="true" aria-label="Pídeselo a la IA">
        {/* ── encabezado ── */}
        <header className="cp-head">
          <div className="cp-head-l">
            <span className="cp-chip-ico">{I.spark}</span>
            <div>
              <h2 className="cp-title">Pídeselo a la IA</h2>
              <p className="cp-sub">¿Qué quieres cambiar?</p>
            </div>
          </div>
          <div className="cp-head-r">
            <kbd className="cp-kbd" title="Abre y cierra este panel">⌘K</kbd>
            <button className="cp-x" onClick={onClose} aria-label="Cerrar el panel">{I.close}</button>
          </div>
        </header>

        {/* ── dónde estás ── */}
        <div className="cp-ctx">
          <span className="cp-ctx-ico" aria-hidden="true">{I.pin}</span>
          Estás en: <b>{context}</b>
        </div>

        {/* ── qué le pides ── */}
        <div className="cp-ask">
          <label className="cp-lb" htmlFor="cp-ta">Dilo con tus palabras</label>
          <div className="cp-tawrap">
            <textarea
              id="cp-ta" ref={taRef} className="cp-ta" value={text} placeholder={placeholder}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
              }}
            />
          </div>
          <div className="cp-ask-foot">
            <span className="cp-hint">Enter para enviar · Shift + Enter para otro renglón</span>
            <button className="cp-btn primary" onClick={send} disabled={!text.trim()}>
              {I.send} Enviar
            </button>
          </div>

          <div className="cp-sug" aria-label="Sugerencias rápidas">
            {suggestions.map((s) => (
              <button key={s} className="cp-sug-chip" onClick={() => pick(s)}>{s}</button>
            ))}
          </div>
        </div>

        {/* ── cuerpo: pensando / historial / vacío ── */}
        <div className="cp-body">
          {thinking && (
            <div className="cp-think" aria-live="polite">
              <Avatar avatar={helper} size={48} state="working" />
              <div>
                <p className="cp-think-tx">
                  Pensando<span className="cp-dots" aria-hidden="true"><i /><i /><i /></span>
                </p>
                <p className="cp-think-sub">Ya casi: está acomodando a tu equipo.</p>
              </div>
            </div>
          )}

          {changes.length > 0 ? (
            <section className="cp-hist">
              <h3 className="cp-hist-tt">Lo que se cambió</h3>
              {changes.map((c) => (
                <ChangeCard key={c.id} change={c} onUndo={onUndo} onViewInOffice={onViewInOffice} />
              ))}
            </section>
          ) : (
            !thinking && (
              <div className="cp-empty">
                <Avatar avatar={helper} size={72} state="idle" />
                <p className="cp-empty-tx">
                  Aquí no hay nada todavía. Cuéntame qué quieres y lo acomodo en tu oficina.
                </p>
                <p className="cp-empty-hand">Sin apuros, se puede deshacer ♡</p>
              </div>
            )
          )}
        </div>
      </aside>
    </div>
  );
};

export default CopilotPanel;
