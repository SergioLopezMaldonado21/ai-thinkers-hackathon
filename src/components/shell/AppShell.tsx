/**
 * MiniOficina · Armazón de la app — barra lateral + cabecera del mockup.
 * Presentacional: la navegación y los datos entran por props.
 */
import React from 'react';
import './app-shell.css';

export interface NavItem { id: string; label: string; icon: React.ReactNode }

export interface AppShellProps {
  active?: string;
  items?: NavItem[];
  project?: { name: string; emoji?: string; subtitle?: string; live?: boolean };
  user?: { name: string; org?: string; avatar?: React.ReactNode };
  notifications?: number;
  onNavigate?: (id: string) => void;
  onRules?: () => void;
  onAsk?: () => void;
  children?: React.ReactNode;
}

const s = (d: string) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);

export const NAV: NavItem[] = [
  { id: 'inicio',       label: 'Inicio',      icon: s('M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z') },
  { id: 'proyectos',    label: 'Proyectos',   icon: s('M5 3h14v18H5zM9 7h6M9 11h6M9 15h4') },
  { id: 'agentes',      label: 'Agentes',     icon: s('M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0') },
  { id: 'workflows',    label: 'Workflows',   icon: s('M6 6h4v4H6zM14 14h4v4h-4zM10 8h4a2 2 0 0 1 2 2v4') },
  { id: 'espacios',     label: 'Espacios',    icon: s('M3 5h18v11H3zM8 20h8') },
  { id: 'tareas',       label: 'Tareas',      icon: s('M4 5h16v15H4zM8 10l2 2 4-4') },
  { id: 'analytics',    label: 'Analytics',   icon: s('M5 20V10M12 20V4M19 20v-7') },
];

export const AppShell: React.FC<AppShellProps> = ({
  active = 'agentes', items = NAV, project, user, notifications = 0,
  onNavigate, onRules, onAsk, children,
}) => {
  const now = new Date();
  return (
    <div className="sh">
      <aside className="sh-side">
        <div className="sh-logo"><span aria-hidden>🏢</span> MiniOficina</div>
        {items.map((it) => (
          <button key={it.id} className="sh-nav" aria-current={active === it.id ? 'page' : undefined}
                  onClick={() => onNavigate?.(it.id)}>
            {it.icon}{it.label}
          </button>
        ))}
        <p className="sh-note">Pequeños agentes,<br />grandes resultados. ♡</p>
        <button className="sh-bell">
          {s('M18 16V11a6 6 0 1 0-12 0v5l-2 3h16zM10 22h4')} Notificaciones
          {notifications > 0 && <span className="sh-count">{notifications}</span>}
        </button>
        <div className="sh-user">
          {user?.avatar}
          <div><b>{user?.name ?? 'Invitada'}</b><span>{user?.org ?? 'MiniOficina'}</span></div>
          <button className="sh-gear" aria-label="Ajustes">
            {s('M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7.5 19.4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 13.9H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 7.5l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1.3z')}
          </button>
        </div>
      </aside>

      <div>
        <header className="sh-top">
          <div className="sh-proj">
            <span className="sh-proj-ico" aria-hidden>{project?.emoji ?? '☕'}</span>
            <div>
              <b>{project?.name ?? 'Sin proyecto'} {s('M6 9l6 6 6-6')}</b>
              <small>{project?.subtitle ?? '—'}</small>
            </div>
          </div>
          {project?.live && <span className="sh-live"><i />Proyecto activo</span>}
          <div className="sh-clock">
            <span aria-hidden>☀️</span>
            <div>
              <b>{now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</b>
              <span>{now.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
            </div>
          </div>
          <button className="sh-btn" onClick={onRules}>{s('M5 3h14v18H5zM9 8h6M9 12h6M9 16h4')} Reglas de la Oficina</button>
          <button className="sh-btn dark" onClick={onAsk}>✨ Pídeselo a la IA</button>
          <button className="sh-btn icon" aria-label="Más">{s('M5 12h.01M12 12h.01M19 12h.01')}</button>
        </header>
        <main className="sh-main">{children}</main>
      </div>
    </div>
  );
};

export default AppShell;
