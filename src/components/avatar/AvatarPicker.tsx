/**
 * MiniOficina · <AvatarPicker /> — columna izquierda del creador de agentes (§6.3)
 * 3 partes + color + botón 🎲. Preview 256 px arriba.
 */
import React from 'react';
import type { Avatar as AvatarModel, BodyVariant, EyesVariant, HatVariant } from '../../types';
import { AVATAR_COLORS } from '../../types';
import { Avatar, randomAvatar, type AvatarState } from './Avatar';
import {
  BODIES, EYES, HATS, METRICS, LABELS, palette,
  BODY_VARIANTS, EYES_VARIANTS, HAT_VARIANTS,
} from './parts';

interface Props {
  value: AvatarModel;
  onChange: (a: AvatarModel) => void;
  previewSize?: number;
  state?: AvatarState;
  level?: number;
}

/** Miniatura de una parte suelta (para las filas de opciones). */
const PartThumb: React.FC<{ kind: 'body' | 'eyes' | 'hat'; variant: string; color: string }> = ({
  kind, variant, color,
}) => {
  const m = METRICS.round;
  return (
    <svg width={40} height={40} viewBox="0 0 128 128" aria-hidden>
      {kind === 'body' && BODIES[variant as BodyVariant](color, false)}
      {kind === 'eyes' && (
        <>
          {BODIES.round(color, false)}
          {EYES[variant as EyesVariant](m, palette(color))}
        </>
      )}
      {kind === 'hat' && (
        <>
          {BODIES.round(color, false)}
          {HATS[variant as HatVariant](m, palette(color))}
        </>
      )}
    </svg>
  );
};

const Row: React.FC<{
  label: string;
  kind: 'body' | 'eyes' | 'hat';
  options: readonly string[];
  active: string;
  color: string;
  onPick: (v: string) => void;
}> = ({ label, kind, options, active, color, onPick }) => (
  <div className="mo-pick-row">
    <span className="mo-pick-label">{label}</span>
    <div className="mo-pick-opts">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          className={`mo-pick-opt${o === active ? ' is-active' : ''}`}
          onClick={() => onPick(o)}
          title={(LABELS[kind] as Record<string, string>)[o]}
          aria-pressed={o === active}
        >
          <PartThumb kind={kind} variant={o} color={color} />
        </button>
      ))}
    </div>
  </div>
);

export const AvatarPicker: React.FC<Props> = ({
  value, onChange, previewSize = 256, state = 'idle', level,
}) => {
  const set = (patch: Partial<AvatarModel>) => onChange({ ...value, ...patch });

  return (
    <div className="mo-picker">
      <style>{`
        .mo-picker{display:flex;flex-direction:column;align-items:center;gap:14px}
        .mo-pick-row{width:100%;display:flex;align-items:center;gap:10px}
        .mo-pick-label{width:64px;font-size:13px;font-weight:700;color:#2B2D42}
        .mo-pick-opts{display:flex;gap:8px;flex:1}
        .mo-pick-opt{width:46px;height:46px;border-radius:12px;border:2px solid #E4E6EF;
          background:#fff;display:grid;place-items:center;cursor:pointer;padding:0;transition:.14s}
        .mo-pick-opt:hover{transform:translateY(-2px);border-color:#C9CDDE}
        .mo-pick-opt.is-active{border-color:#2B2D42;background:#FFF8E1;box-shadow:0 2px 0 #2B2D42}
        .mo-pick-colors{display:flex;gap:8px}
        .mo-pick-color{width:30px;height:30px;border-radius:999px;border:2px solid #2B2D42;cursor:pointer}
        .mo-pick-color.is-active{outline:3px solid #2B2D42;outline-offset:2px}
        .mo-dice{margin-top:2px;border:2px solid #2B2D42;background:#FFD93D;border-radius:999px;
          padding:8px 18px;font-weight:800;cursor:pointer;box-shadow:0 2px 0 #2B2D42}
        .mo-dice:active{transform:translateY(2px);box-shadow:none}
      `}</style>

      <Avatar avatar={value} size={previewSize} state={state} level={level} />

      <Row label="Cuerpo" kind="body" options={BODY_VARIANTS} active={value.body} color={value.color} onPick={(v) => set({ body: v as BodyVariant })} />
      <Row label="Ojos"   kind="eyes" options={EYES_VARIANTS} active={value.eyes} color={value.color} onPick={(v) => set({ eyes: v as EyesVariant })} />
      <Row label="Gorro"  kind="hat"  options={HAT_VARIANTS}  active={value.hat}  color={value.color} onPick={(v) => set({ hat: v as HatVariant })} />

      <div className="mo-pick-row">
        <span className="mo-pick-label">Color</span>
        <div className="mo-pick-colors">
          {AVATAR_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              className={`mo-pick-color${c === value.color ? ' is-active' : ''}`}
              style={{ background: c }}
              onClick={() => set({ color: c })}
              aria-label={`Color ${c}`}
            />
          ))}
        </div>
      </div>

      <button type="button" className="mo-dice" onClick={() => onChange(randomAvatar())}>
        🎲 Aleatorio
      </button>
    </div>
  );
};

export default AvatarPicker;
