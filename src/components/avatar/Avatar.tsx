/**
 * MiniOficina · <Avatar /> — §10 del SPEC
 * ------------------------------------------------------------------
 * Compone cuerpo → ojos → gorro dentro de <svg viewBox="0 0 128 128">.
 *
 *   <Avatar avatar={agent.avatar} size={96} state="working" level={3} />
 *
 * Props:
 *   avatar  Avatar   { body, eyes, hat, color }   (contrato §7)
 *   size    48 | 96 | 256 (o cualquier número)
 *   state   'idle' | 'walking' | 'working' | 'done' | 'static' (sin animación)
 *   level   1..5 (opcional) → chevrons abajo; en size 48 sólo badge
 *   name    string (opcional) → etiqueta bajo el sprite
 */
import React, { useEffect } from 'react';
import type { Avatar as AvatarModel } from '../../types';
import { AVATAR_COLORS } from '../../types';
import {
  BODIES, EYES, HATS, METRICS, EXTRA_EYES, EXTRA_HATS, palette,
  BODY_VARIANTS, EYES_VARIANTS, HAT_VARIANTS,
} from './parts';

export type AvatarState = 'idle' | 'walking' | 'working' | 'done' | 'static';

export interface AvatarProps {
  avatar: AvatarModel;
  size?: number;                 // 48 | 96 | 256
  state?: AvatarState;
  level?: number;                // 1..5
  name?: string;
  cheeks?: boolean;              // cachetes rosa (default true)
  className?: string;
  onClick?: () => void;
  title?: string;
}

/* ───────────────────────── Estilos (se inyectan una sola vez) ───────────────────────── */

const STYLE_ID = 'mo-avatar-styles';
export const AVATAR_CSS = `
.mo-avatar{position:relative;display:inline-flex;flex-direction:column;align-items:center;
  line-height:1;user-select:none;-webkit-user-select:none}
.mo-avatar[data-clickable="true"]{cursor:pointer}
.mo-avatar svg{display:block;overflow:visible}

/* ── movimiento del sprite ── */
.mo-sprite{transform-box:view-box;transform-origin:64px 116px}
.mo-sprite--idle    {animation:mo-bob 1.2s ease-in-out infinite}
.mo-sprite--walking {animation:mo-walk .48s ease-in-out infinite}
.mo-sprite--working {animation:mo-work .42s ease-in-out infinite}
.mo-sprite--done    {animation:mo-pop .6s cubic-bezier(.2,1.6,.4,1) 1}
@keyframes mo-bob {0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
@keyframes mo-walk{0%,100%{transform:translateY(0) rotate(-2.5deg)}50%{transform:translateY(-4px) rotate(2.5deg)}}
@keyframes mo-work{0%,100%{transform:translateY(0) scaleY(1)}50%{transform:translateY(-2px) scaleY(1.03)}}
@keyframes mo-pop {0%{transform:scale(1)}35%{transform:scale(1.14)}100%{transform:scale(1)}}

/* ── parpadeo (sólo ojos big / star) ── */
.mo-eyes--blink{transform-box:view-box;animation:mo-blink 4.4s infinite}
@keyframes mo-blink{0%,95%,100%{transform:scaleY(1)}97.5%{transform:scaleY(.08)}}

/* ── antena que parpadea trabajando ── */
.mo-sprite--working .mo-antenna-bulb{animation:mo-bulb .7s ease-in-out infinite}
@keyframes mo-bulb{0%,100%{opacity:1}50%{opacity:.35}}

/* ── burbuja "…" ── */
.mo-bubble{position:absolute;left:50%;transform:translateX(-50%);
  background:#fff;border:2px solid rgba(46,42,51,.16);border-radius:999px;
  display:flex;align-items:center;gap:.22em;padding:.3em .5em;
  box-shadow:0 4px 10px rgba(46,42,51,.14);animation:mo-pop .3s ease-out}
.mo-bubble i{width:.34em;height:.34em;border-radius:50%;background:#2E2A33;display:block;
  animation:mo-dot 1.1s ease-in-out infinite}
.mo-bubble i:nth-child(2){animation-delay:.16s}
.mo-bubble i:nth-child(3){animation-delay:.32s}
@keyframes mo-dot{0%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-.14em)}}

/* ── destello al terminar ── */
.mo-spark{position:absolute;color:#FFD93D;-webkit-text-stroke:1px #E0A82E;pointer-events:none;animation:mo-spark .6s ease-out forwards}
@keyframes mo-spark{0%{transform:scale(.2) rotate(-30deg);opacity:0}
  40%{transform:scale(1.15) rotate(10deg);opacity:1}100%{transform:scale(1) rotate(0);opacity:0}}

/* ── sombra de contacto ── */
.mo-shadow{background:#2B2D42;opacity:.1;border-radius:50%;margin-top:-4%;filter:blur(.5px);
  animation:mo-shw 1.2s ease-in-out infinite}
@keyframes mo-shw{0%,100%{transform:scaleX(1);opacity:.1}50%{transform:scaleX(.9);opacity:.07}}

/* ── nivel ── */
.mo-level{display:flex;gap:.12em;margin-top:.22em;color:#2B2D42}
.mo-level span{opacity:.22;font-weight:800}
.mo-level span.on{opacity:1;color:#E9A62E}
.mo-badge{position:absolute;top:-2px;right:-2px;background:#FFD93D;color:#5B4412;
  border:2px solid #E9B93A;border-radius:999px;font-weight:800;
  min-width:1.55em;height:1.55em;display:flex;align-items:center;justify-content:center;
  padding:0 .22em;box-shadow:0 1px 0 rgba(43,45,66,.25)}

.mo-name{margin-top:.35em;font-weight:700;color:inherit;white-space:nowrap}

@media (prefers-reduced-motion: reduce){
  .mo-sprite,.mo-eyes--blink,.mo-bubble i,.mo-antenna-bulb,.mo-spark{animation:none!important}
}
`;

function useAvatarStyles() {
  useEffect(() => {
    if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
    const el = document.createElement('style');
    el.id = STYLE_ID;
    el.textContent = AVATAR_CSS;
    document.head.appendChild(el);
  }, []);
}

/* ───────────────────────── Componente ───────────────────────── */

export const Avatar: React.FC<AvatarProps> = ({
  avatar,
  size = 96,
  state = 'idle',
  level,
  name,
  cheeks = true,
  className = '',
  onClick,
  title,
}) => {
  useAvatarStyles();

  // tolerante a datos incompletos (el creador y la IA pueden mandar parciales)
  const body = BODIES[avatar?.body] ? avatar.body : 'round';
  const color = avatar?.color || AVATAR_COLORS[0];
  const p = palette(color);

  // el contrato §7 define 4 ojos y 4 gorros; si llega uno de los extras del sheet
  // (glasses, sprout, headphones, bow, badge…) también se dibuja.
  const eyesFn = (EYES as Record<string, typeof EYES.big>)[avatar?.eyes] ?? EXTRA_EYES[avatar?.eyes] ?? EYES.big;
  const hatFn  = (HATS as Record<string, typeof HATS.cap>)[avatar?.hat] ?? EXTRA_HATS[avatar?.hat] ?? HATS.none;

  const m = METRICS[body];
  const small = size < 72;                       // 48 px → sólo badge, sin nombre
  const px = (u: number) => (u / 128) * size;    // unidades del viewBox → px

  return (
    <div
      className={`mo-avatar ${className}`}
      style={{ width: size, fontSize: size * 0.13 }}
      data-clickable={onClick ? 'true' : undefined}
      onClick={onClick}
      role={onClick ? 'button' : 'img'}
      aria-label={title || name || `Avatar ${body}/${avatar?.eyes}/${avatar?.hat}`}
      title={title || name}
    >
      {state === 'working' && (
        <div className="mo-bubble" style={{ top: px(m.bubbleY) - size * 0.14 }} aria-hidden>
          <i /><i /><i />
        </div>
      )}

      {state === 'done' && (
        <div className="mo-spark" style={{ top: px(m.bubbleY), right: px(18), fontSize: size * 0.22 }} aria-hidden>
          ✦
        </div>
      )}

      {level !== undefined && small && (
        <div className="mo-badge" style={{ fontSize: size * 0.24 }} aria-hidden>
          {level}
        </div>
      )}

      <svg width={size} height={size} viewBox="0 0 128 128" aria-hidden focusable="false">
        <g
          className={`mo-sprite mo-sprite--${state}`}
          style={{ ['--eye-y' as string]: `${m.eyeY}px` }}
        >
          {/* orden obligatorio: cuerpo → ojos → gorro */}
          {BODIES[body](color, cheeks)}
          {eyesFn(m, p)}
          {hatFn(m, p)}
        </g>
      </svg>

      <div className="mo-shadow" style={{ width: size * 0.46, height: size * 0.075 }} aria-hidden />

      {level !== undefined && !small && (
        <div className="mo-level" style={{ fontSize: size * 0.17 }} aria-label={`Nivel ${level}`}>
          {[1, 2, 3, 4, 5].map((i) => (
            <span key={i} className={i <= level ? 'on' : ''}>‹</span>
          ))}
        </div>
      )}

      {name && !small && <div className="mo-name" style={{ fontSize: size * 0.14 }}>{name}</div>}
    </div>
  );
};

/* ───────────────────────── 🎲 Aleatorio ───────────────────────── */

const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

/** Usado por el botón 🎲 del creador y por `addAgent` generativo cuando no se especifica avatar. */
export function randomAvatar(partial?: Partial<AvatarModel>): AvatarModel {
  return {
    body: partial?.body ?? pick(BODY_VARIANTS),
    eyes: partial?.eyes ?? pick(EYES_VARIANTS),
    hat: partial?.hat ?? pick(HAT_VARIANTS),
    color: partial?.color ?? pick(AVATAR_COLORS),
  };
}

export default Avatar;
