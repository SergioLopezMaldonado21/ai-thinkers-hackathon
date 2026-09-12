// Visual metadata only. AgentProfile and the backend contract remain unchanged.

// ---------- Avatar (3 partes + color) ----------
export type EyesVariant = 'big' | 'happy' | 'focused' | 'star';
export type BodyVariant = 'round' | 'square' | 'bean' | 'tall';
export type HatVariant  = 'none' | 'cap' | 'crown' | 'antenna';
export interface Avatar { eyes: EyesVariant; body: BodyVariant; hat: HatVariant; color: string; }
export type AvatarSpec = Avatar;
export const AVATAR_COLORS = ['#FF6B6B','#FFD93D','#6BCB77','#4D96FF','#B892FF','#FF9F1C'];
