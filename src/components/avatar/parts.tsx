/**
 * MiniOficina · Avatares "Agent Spirits" — §10 del SPEC
 * ------------------------------------------------------------------
 * Look: espíritu suave tipo blob — cuerpo en tono muy claro, contorno del MISMO
 * matiz (no negro), ojos ovalados grandes con brillo, cachetes rosa, faldón
 * ondulado y bracitos. Todo se deriva de `avatar.color` con `palette()`.
 *
 * 4 cuerpos × 4 ojos × 4 gorros = 64 combos (contrato §7).
 * Extras opcionales (fuera del contrato, listos por si L3 amplía los tipos):
 *   EXTRA_EYES  → thinking · surprise · sleepy · glasses
 *   EXTRA_HATS  → sprout · headphones · bow · badge
 *   SPIRITS     → los 6 personajes del sheet (General, Creativo, Analista,
 *                 Organizador, Técnico, Supervisor)
 */
import type { ReactElement } from 'react';
import type { BodyVariant, EyesVariant, HatVariant } from '../../types';

/* ═══════════════ Paleta derivada del color del agente ═══════════════ */

export interface Palette {
  fill: string;        // cuerpo (muy claro)
  stroke: string;      // contorno, mismo matiz
  accent: string;      // gorro / accesorio
  accentDeep: string;  // contorno del accesorio
  ink: string;         // ojos
  cheek: string;       // cachetes
  dark: boolean;
}

function hexToHsl(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const r = parseInt(n.slice(0, 2), 16) / 255;
  const g = parseInt(n.slice(2, 4), 16) / 255;
  const b = parseInt(n.slice(4, 6), 16) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let hu = 0;
  if (d) {
    if (mx === r) hu = ((g - b) / d) % 6;
    else if (mx === g) hu = (b - r) / d + 2;
    else hu = (r - g) / d + 4;
  }
  hu = (hu * 60 + 360) % 360;
  const l = (mx + mn) / 2;
  const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  return [hu, s, l];
}

function hsl(h: number, s: number, l: number): string {
  s = Math.min(1, Math.max(0, s)); l = Math.min(1, Math.max(0, l));
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const t: [number, number, number] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] :
    h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return '#' + t.map((v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')).join('');
}

/** Un solo color de agente → toda la paleta del sprite. */
export function palette(color: string): Palette {
  const [h, s, l] = hexToHsl(color || '#FFD93D');
  if (l < 0.34) {                                   // variante oscura (Supervisor)
    return {
      fill: hsl(h, Math.min(s, 0.16), 0.30),
      stroke: hsl(h, Math.min(s, 0.22), 0.15),
      accent: hsl(h, Math.min(s, 0.14), 0.20),
      accentDeep: hsl(h, Math.min(s, 0.20), 0.11),
      ink: '#F6F1E7',
      cheek: hsl(350, 0.45, 0.62),
      dark: true,
    };
  }
  const sat = Math.min(0.9, Math.max(0.42, s * 0.8));
  return {
    fill: hsl(h, sat, 0.915),
    stroke: hsl(h, Math.min(0.85, sat * 1.05), 0.60),
    accent: hsl(h, Math.min(0.9, sat * 1.05), 0.66),
    accentDeep: hsl(h, Math.min(0.9, sat * 1.05), 0.48),
    ink: '#2E2A33',
    cheek: hsl(352, 0.72, 0.78),
    dark: false,
  };
}

/* ═══════════════ Geometría ═══════════════ */

export const SW = 7;        // grosor del trazo de unión → contorno visible ≈3.5

export interface BodyMetrics {
  eyeY: number; eyeDx: number; eyeR: number;
  cheekY: number; cheekDx: number;
  hatY: number; hatW: number;
  bubbleY: number;
}

interface Geo extends BodyMetrics {
  x0: number; x1: number; y0: number; yS: number; yBot: number;
  top: 'dome' | 'boxy'; ry: number; bumps: number;
}

const GEO: Record<BodyVariant, Geo> = {
  round:  { x0:20, x1:108, y0:24, yS:74, yBot:100, top:'dome', ry:44, bumps:3,
            eyeY:66, eyeDx:18, eyeR:14, cheekY:84, cheekDx:32, hatY:30, hatW:78, bubbleY:14 },
  square: { x0:24, x1:104, y0:28, yS:76, yBot:100, top:'boxy', ry:30, bumps:3,
            eyeY:68, eyeDx:18, eyeR:14, cheekY:86, cheekDx:30, hatY:34, hatW:72, bubbleY:18 },
  bean:   { x0:14, x1:114, y0:34, yS:78, yBot:100, top:'dome', ry:40, bumps:4,
            eyeY:70, eyeDx:20, eyeR:14, cheekY:88, cheekDx:36, hatY:40, hatW:84, bubbleY:24 },
  tall:   { x0:34, x1:94,  y0:18, yS:76, yBot:104, top:'dome', ry:30, bumps:3,
            eyeY:60, eyeDx:14, eyeR:12, cheekY:77, cheekDx:22, hatY:24, hatW:56, bubbleY:8 },
};

export const METRICS: Record<BodyVariant, BodyMetrics> = {
  round: GEO.round, square: GEO.square, bean: GEO.bean, tall: GEO.tall,
};

function domePath(g: Geo): string {
  const rx = (g.x1 - g.x0) / 2;
  if (g.top === 'boxy') {
    const r = 30;
    return `M ${g.x0} ${g.yS} L ${g.x0} ${g.y0 + r} Q ${g.x0} ${g.y0} ${g.x0 + r} ${g.y0}
            L ${g.x1 - r} ${g.y0} Q ${g.x1} ${g.y0} ${g.x1} ${g.y0 + r} L ${g.x1} ${g.yS} Z`;
  }
  return `M ${g.x0} ${g.yS} L ${g.x0} ${g.y0 + g.ry}
          A ${rx} ${g.ry} 0 0 1 ${g.x1} ${g.y0 + g.ry} L ${g.x1} ${g.yS} Z`;
}

/** Faldón ondulado (la firma del spirit). */
function skirtPath(g: Geo): string {
  const w = (g.x1 - g.x0) / g.bumps;
  let d = `M ${g.x0} ${g.yS - 6} L ${g.x0} ${g.yBot - 4}`;
  for (let i = 0; i < g.bumps; i++) {
    const a = g.x0 + i * w, b = a + w;
    d += ` C ${a + w * 0.3} ${g.yBot + 6} ${b - w * 0.3} ${g.yBot + 6} ${b} ${g.yBot - 4}`;
  }
  return d + ` L ${g.x1} ${g.yS - 6} Z`;
}

/** Dibuja un grupo de primitivas como una silueta unida: pasada de contorno + pasada de relleno. */
function Union({ shapes, fill, stroke, sw = SW }:
  { shapes: ReactElement; fill: string; stroke: string; sw?: number }) {
  return (
    <>
      <g fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round">{shapes}</g>
      <g fill={fill} stroke="none">{shapes}</g>
    </>
  );
}

/* ═══════════════ CUERPOS (4) ═══════════════ */

export const BODIES: Record<BodyVariant, (color: string, cheeks: boolean) => ReactElement> =
  (['round', 'square', 'bean', 'tall'] as BodyVariant[]).reduce((acc, key) => {
    acc[key] = (color: string, cheeks: boolean) => {
      const g = GEO[key], p = palette(color);
      const armY = g.yS + 2, armR = key === 'tall' ? 8 : 10;
      const shapes = (
        <>
          <circle key="al" cx={g.x0 + 3} cy={armY} r={armR} />
          <circle key="ar" cx={g.x1 - 3} cy={armY} r={armR} />
          <path key="d" d={domePath(g)} />
          <path key="s" d={skirtPath(g)} />
        </>
      );
      return (
        <g className="mo-body">
          <Union shapes={shapes} fill={p.fill} stroke={p.stroke} />
          {/* sombreado interior suave abajo */}
          <path d={skirtPath(g)} fill={p.stroke} opacity={p.dark ? 0.18 : 0.085} />
          {/* brillo */}
          <ellipse cx={g.x0 + (g.x1 - g.x0) * 0.3} cy={g.y0 + (g.yS - g.y0) * 0.42}
                   rx={(g.x1 - g.x0) * 0.13} ry={(g.yS - g.y0) * 0.2}
                   fill="#fff" opacity={p.dark ? 0.1 : 0.55} transform={`rotate(-18 ${g.x0 + (g.x1 - g.x0) * 0.3} ${g.y0 + (g.yS - g.y0) * 0.42})`} />
          {cheeks && (
            <g opacity={0.72}>
              <ellipse cx={64 - g.cheekDx} cy={g.cheekY} rx={8} ry={5} fill={p.cheek} />
              <ellipse cx={64 + g.cheekDx} cy={g.cheekY} rx={8} ry={5} fill={p.cheek} />
            </g>
          )}
        </g>
      );
    };
    return acc;
  }, {} as Record<BodyVariant, (color: string, cheeks: boolean) => ReactElement>);

/* ═══════════════ OJOS ═══════════════ */

/** Ojo base: óvalo grande + dos brillos (el rasgo que define al personaje). */
const Oval = ({ x, y, rx, ry, ink, flip = 1 }:
  { x: number; y: number; rx: number; ry: number; ink: string; flip?: number }) => (
  <g>
    <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={ink} />
    <circle cx={x - flip * rx * 0.3} cy={y - ry * 0.38} r={rx * 0.34} fill="#fff" />
    <circle cx={x + flip * rx * 0.32} cy={y + ry * 0.42} r={rx * 0.16} fill="#fff" opacity={0.85} />
  </g>
);

const EYE_SIG = (m: BodyMetrics, p: Palette) => (
  <g className="mo-eyes mo-eyes--blink" style={{ transformOrigin: `64px ${m.eyeY}px` }}>
    <Oval x={64 - m.eyeDx} y={m.eyeY} rx={m.eyeR * 0.82} ry={m.eyeR * 1.06} ink={p.ink} />
    <Oval x={64 + m.eyeDx} y={m.eyeY} rx={m.eyeR * 0.82} ry={m.eyeR * 1.06} ink={p.ink} />
  </g>
);

export const EYES: Record<EyesVariant, (m: BodyMetrics, p: Palette) => ReactElement> = {
  /** big — Normal: dos óvalos grandes con brillo */
  big: EYE_SIG,

  /** happy — Feliz: dos arcos ^ ^ */
  happy: (m, p) => (
    <g className="mo-eyes" fill="none" stroke={p.ink} strokeWidth={m.eyeR * 0.46} strokeLinecap="round">
      {[-1, 1].map((s) => (
        <path key={s} d={`M ${64 + s * m.eyeDx - m.eyeR * 0.8} ${m.eyeY + m.eyeR * 0.4}
          Q ${64 + s * m.eyeDx} ${m.eyeY - m.eyeR * 0.72} ${64 + s * m.eyeDx + m.eyeR * 0.8} ${m.eyeY + m.eyeR * 0.4}`} />
      ))}
    </g>
  ),

  /** focused — Trabajando: óvalos con ceja marcada */
  focused: (m, p) => (
    <g className="mo-eyes">
      {[-1, 1].map((s) => (
        <g key={s}>
          <ellipse cx={64 + s * m.eyeDx} cy={m.eyeY + 1.5} rx={m.eyeR * 0.74} ry={m.eyeR * 0.82} fill={p.ink} />
          <circle cx={64 + s * m.eyeDx - s * m.eyeR * 0.22} cy={m.eyeY - m.eyeR * 0.2} r={m.eyeR * 0.24} fill="#fff" />
          <path d={`M ${64 + s * m.eyeDx - s * m.eyeR * 1.05} ${m.eyeY - m.eyeR * 1.25}
                    L ${64 + s * m.eyeDx + s * m.eyeR * 0.85} ${m.eyeY - m.eyeR * 0.62}`}
                stroke={p.ink} strokeWidth={m.eyeR * 0.36} strokeLinecap="round" fill="none" />
        </g>
      ))}
    </g>
  ),

  /** star — dos destellos ✦ */
  star: (m, p) => (
    <g className="mo-eyes mo-eyes--blink" style={{ transformOrigin: `64px ${m.eyeY}px` }}>
      {[-1, 1].map((s) => {
        const R = m.eyeR * 1.05, k = R * 0.26, cx = 64 + s * m.eyeDx;
        return (
          <path key={s} fill={p.ink}
            d={`M ${cx} ${m.eyeY - R} C ${cx + k} ${m.eyeY - k} ${cx + k} ${m.eyeY - k} ${cx + R} ${m.eyeY}
                C ${cx + k} ${m.eyeY + k} ${cx + k} ${m.eyeY + k} ${cx} ${m.eyeY + R}
                C ${cx - k} ${m.eyeY + k} ${cx - k} ${m.eyeY + k} ${cx - R} ${m.eyeY}
                C ${cx - k} ${m.eyeY - k} ${cx - k} ${m.eyeY - k} ${cx} ${m.eyeY - R} Z`} />
        );
      })}
    </g>
  ),
};

/** Expresiones extra del sheet (no están en el contrato §7; úsalas si L3 amplía EyesVariant). */
export const EXTRA_EYES: Record<string, (m: BodyMetrics, p: Palette) => ReactElement> = {
  /** Pensando — mirada de lado */
  thinking: (m, p) => (
    <g className="mo-eyes">
      <Oval x={64 - m.eyeDx + 3} y={m.eyeY} rx={m.eyeR * 0.7} ry={m.eyeR * 0.92} ink={p.ink} flip={-1} />
      <Oval x={64 + m.eyeDx + 3} y={m.eyeY} rx={m.eyeR * 0.7} ry={m.eyeR * 0.92} ink={p.ink} flip={-1} />
    </g>
  ),
  /** Sorpresa — puntos chicos */
  surprise: (m, p) => (
    <g className="mo-eyes">
      {[-1, 1].map((s) => <circle key={s} cx={64 + s * m.eyeDx} cy={m.eyeY} r={m.eyeR * 0.42} fill={p.ink} />)}
    </g>
  ),
  /** Dormido — arcos cerrados + zzz */
  sleepy: (m, p) => (
    <g className="mo-eyes">
      <g fill="none" stroke={p.ink} strokeWidth={m.eyeR * 0.42} strokeLinecap="round">
        {[-1, 1].map((s) => (
          <path key={s} d={`M ${64 + s * m.eyeDx - m.eyeR * 0.75} ${m.eyeY - m.eyeR * 0.25}
            Q ${64 + s * m.eyeDx} ${m.eyeY + m.eyeR * 0.6} ${64 + s * m.eyeDx + m.eyeR * 0.75} ${m.eyeY - m.eyeR * 0.25}`} />
        ))}
      </g>
      <text x={64 + m.eyeDx + 26} y={m.eyeY - 26} fontSize="17" fontWeight="700"
            fill={p.ink} opacity={0.75} fontFamily="system-ui, sans-serif">z</text>
      <text x={64 + m.eyeDx + 37} y={m.eyeY - 40} fontSize="12" fontWeight="700"
            fill={p.ink} opacity={0.55} fontFamily="system-ui, sans-serif">z</text>
    </g>
  ),
  /** Analista — lentes redondos sobre los ojos */
  glasses: (m, p) => (
    <g className="mo-eyes">
      {EYE_SIG(m, p)}
      <g fill="none" stroke={p.accentDeep} strokeWidth={3.4} strokeLinecap="round">
        <circle cx={64 - m.eyeDx} cy={m.eyeY} r={m.eyeR * 1.32} />
        <circle cx={64 + m.eyeDx} cy={m.eyeY} r={m.eyeR * 1.32} />
        <path d={`M ${64 - m.eyeDx + m.eyeR * 1.32} ${m.eyeY} L ${64 + m.eyeDx - m.eyeR * 1.32} ${m.eyeY}`} />
      </g>
    </g>
  ),
};

/* ═══════════════ GORROS ═══════════════ */

const hatColors = (p: Palette) => ({ fill: p.accent, stroke: p.accentDeep });

export const HATS: Record<HatVariant, (m: BodyMetrics, p: Palette) => ReactElement | null> = {
  none: () => null,

  /** cap — el gorrito del sheet: copa redonda + ala + nudo arriba */
  cap: (m, p) => {
    const c = hatColors(p), w = m.hatW, y = m.hatY, rx = w / 2, ry = w * 0.38;
    const shapes = (
      <>
        <path key="crown" d={`M ${64 - rx} ${y} A ${rx} ${ry} 0 0 1 ${64 + rx} ${y} Z`} />
        <ellipse key="brim" cx={64} cy={y + 1} rx={rx * 1.06} ry={6.5} />
        <path key="visor" d={`M ${64 + rx * 0.2} ${y - 3} Q ${64 + rx * 1.5} ${y - 6} ${64 + rx * 1.62} ${y + 4}
                              Q ${64 + rx * 1.1} ${y + 10} ${64 + rx * 0.2} ${y + 6} Z`} />
        <ellipse key="k1" cx={64 - 6} cy={y - ry - 5} rx={5.5} ry={8} transform={`rotate(-24 ${64 - 6} ${y - ry - 5})`} />
        <ellipse key="k2" cx={64 + 6} cy={y - ry - 5} rx={5.5} ry={8} transform={`rotate(24 ${64 + 6} ${y - ry - 5})`} />
      </>
    );
    return <g className="mo-hat"><Union shapes={shapes} fill={c.fill} stroke={c.stroke} sw={6} /></g>;
  },

  /** crown — corona suave de 3 lóbulos */
  crown: (m, p) => {
    const c = hatColors(p), w = m.hatW * 0.62, y = m.hatY + 2, l = 64 - w / 2, r = 64 + w / 2;
    const shapes = (
      <>
        <path key="b" d={`M ${l} ${y + 4} L ${l} ${y - 6} L ${r} ${y - 6} L ${r} ${y + 4} Z`} />
        <circle key="c1" cx={l} cy={y - 12} r={7} />
        <circle key="c2" cx={64} cy={y - 18} r={8} />
        <circle key="c3" cx={r} cy={y - 12} r={7} />
      </>
    );
    return <g className="mo-hat"><Union shapes={shapes} fill={c.fill} stroke={c.stroke} sw={6} /></g>;
  },

  /** antenna — antena con bolita (parpadea en state="working") */
  antenna: (m, p) => {
    const c = hatColors(p), y = m.hatY + 6;
    return (
      <g className="mo-hat">
        <path d={`M 64 ${y + 4} C 64 ${y - 4} 67 ${y - 8} 67 ${y - 15}`} fill="none"
              stroke={c.stroke} strokeWidth={5} strokeLinecap="round" />
        <g className="bulb">
          <Union shapes={<circle cx={67} cy={y - 21} r={8} />} fill={c.fill} stroke={c.stroke} sw={6} />
        </g>
      </g>
    );
  },
};

/** Accesorios extra del sheet (fuera del contrato §7). */
export const EXTRA_HATS: Record<string, (m: BodyMetrics, p: Palette) => ReactElement> = {
  /** Organizador — brote de dos hojas */
  sprout: (m, p) => {
    const c = hatColors(p), y = m.hatY + 2;
    const shapes = (
      <>
        <path key="s" d={`M 64 ${y + 6} L 64 ${y - 12}`} />
        <ellipse key="l1" cx={54} cy={y - 14} rx={11} ry={7} transform={`rotate(-26 54 ${y - 14})`} />
        <ellipse key="l2" cx={75} cy={y - 18} rx={12} ry={7.5} transform={`rotate(18 75 ${y - 18})`} />
      </>
    );
    return <g className="mo-hat"><Union shapes={shapes} fill={c.fill} stroke={c.stroke} sw={6} /></g>;
  },
  /** Técnico — audífonos */
  headphones: (m, p) => {
    const c = hatColors(p), y = m.hatY + 10, rx = m.hatW * 0.56;
    return (
      <g className="mo-hat">
        <path d={`M ${64 - rx} ${y + 14} A ${rx} ${rx * 0.92} 0 0 1 ${64 + rx} ${y + 14}`}
              fill="none" stroke={c.stroke} strokeWidth={7} strokeLinecap="round" />
        <Union shapes={<>
          <rect key="e1" x={64 - rx - 8} y={y + 10} width={17} height={22} rx={8} />
          <rect key="e2" x={64 + rx - 9} y={y + 10} width={17} height={22} rx={8} />
        </>} fill={c.fill} stroke={c.stroke} sw={6} />
      </g>
    );
  },
  /** Creativo — moñito */
  bow: (m, p) => {
    const c = hatColors(p), y = m.hatY - 2;
    const shapes = (
      <>
        <ellipse key="b1" cx={64 - 9} cy={y} rx={8} ry={11} transform={`rotate(-28 ${64 - 9} ${y})`} />
        <ellipse key="b2" cx={64 + 9} cy={y} rx={8} ry={11} transform={`rotate(28 ${64 + 9} ${y})`} />
        <circle key="k" cx={64} cy={y + 5} r={5} />
      </>
    );
    return <g className="mo-hat"><Union shapes={shapes} fill={c.fill} stroke={c.stroke} sw={6} /></g>;
  },
  /** Supervisor — gorra con placa */
  badge: (m, p) => {
    const c = hatColors(p), w = m.hatW, y = m.hatY, rx = w / 2, ry = w * 0.34;
    return (
      <g className="mo-hat">
        <Union shapes={<>
          <path key="c" d={`M ${64 - rx} ${y} A ${rx} ${ry} 0 0 1 ${64 + rx} ${y} Z`} />
          <ellipse key="b" cx={64} cy={y + 1} rx={rx * 1.12} ry={6} />
        </>} fill={c.fill} stroke={c.stroke} sw={6} />
        <circle cx={64} cy={y - ry * 0.55} r={6} fill={p.dark ? '#F6F1E7' : '#fff'} opacity={0.92} />
        <circle cx={64} cy={y - ry * 0.55} r={2.4} fill={c.stroke} />
      </g>
    );
  },
};

/* ═══════════════ Catálogos ═══════════════ */

export const BODY_VARIANTS: BodyVariant[] = ['round', 'square', 'bean', 'tall'];
export const EYES_VARIANTS: EyesVariant[] = ['big', 'happy', 'focused', 'star'];
export const HAT_VARIANTS: HatVariant[] = ['none', 'cap', 'crown', 'antenna'];

export const LABELS = {
  body: { round: 'Redondo', square: 'Cuadrado', bean: 'Frijol', tall: 'Alto' },
  eyes: { big: 'Normal', happy: 'Feliz', focused: 'Trabajando', star: 'Destello' },
  hat: { none: 'Sin gorro', cap: 'Gorrito', crown: 'Corona', antenna: 'Antena' },
} as const;

export const EXTRA_LABELS = {
  eyes: { thinking: 'Pensando', surprise: 'Sorpresa', sleepy: 'Dormido', glasses: 'Lentes' },
  hat: { sprout: 'Brote', headphones: 'Audífonos', bow: 'Moño', badge: 'Gorra con placa' },
} as const;

/** Los 6 personajes del sheet. `hat` fuera del contrato va en EXTRA_HATS. */
export const SPIRITS = [
  { key: 'general',     name: 'General',     body: 'round',  eyes: 'big',     hat: 'cap',        color: '#FFD93D' },
  { key: 'creativo',    name: 'Creativo',    body: 'round',  eyes: 'happy',   hat: 'bow',        color: '#FF6B6B' },
  { key: 'analista',    name: 'Analista',    body: 'bean',   eyes: 'glasses', hat: 'antenna',    color: '#4D96FF' },
  { key: 'organizador', name: 'Organizador', body: 'square', eyes: 'big',     hat: 'sprout',     color: '#6BCB77' },
  { key: 'tecnico',     name: 'Técnico',     body: 'round',  eyes: 'big',     hat: 'headphones', color: '#B892FF' },
  { key: 'supervisor',  name: 'Supervisor',  body: 'round',  eyes: 'big',     hat: 'badge',      color: '#3A3D4D' },
] as const;
