// MiniOficina — CONTRATO ÚNICO (§7 del SPEC). Sólo lo edita L3, avisando en el chat.
export type ID = string;

// ---------- Avatar (3 partes + color) ----------
export type EyesVariant = 'big' | 'happy' | 'focused' | 'star';
export type BodyVariant = 'round' | 'square' | 'bean' | 'tall';
export type HatVariant  = 'none' | 'cap' | 'crown' | 'antenna';
export interface Avatar { eyes: EyesVariant; body: BodyVariant; hat: HatVariant; color: string; }
export const AVATAR_COLORS = ['#FF6B6B','#FFD93D','#6BCB77','#4D96FF','#B892FF','#FF9F1C'];
