import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { Avatar, AVATAR_CSS, randomAvatar } from '../components/avatar/Avatar';
import { AvatarPicker } from '../components/avatar/AvatarPicker';
import { BODY_VARIANTS, EYES_VARIANTS, HAT_VARIANTS } from '../components/avatar/parts';
import { AVATAR_COLORS, type AvatarSpec } from '../types';
import './agent-dashboard.css';

export type { AvatarSpec } from '../types';

const avatarMemory = new Map<string, AvatarSpec>();
const avatarKey = (agentId: string) => `mini-oficina:avatar:v1:${encodeURIComponent(agentId)}`;

function validAvatar(value: unknown): value is AvatarSpec {
  if (!value || typeof value !== 'object') return false;
  const avatar = value as AvatarSpec;
  return BODY_VARIANTS.includes(avatar.body) && EYES_VARIANTS.includes(avatar.eyes)
    && HAT_VARIANTS.includes(avatar.hat) && /^#[\da-f]{6}$/i.test(avatar.color);
}

/** Existing agents get a stable appearance without inventing business data. */
export function getAgentAvatar(agentId: string): AvatarSpec {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(avatarKey(agentId)) ?? 'null');
    if (validAvatar(stored)) {
      avatarMemory.set(agentId, stored);
      return { ...stored };
    }
  } catch { /* Private storage or an older invalid entry must not break the office. */ }
  const cached = avatarMemory.get(agentId);
  if (cached) return { ...cached };
  let hash = 2166136261;
  for (const char of agentId) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return {
    body: BODY_VARIANTS[hash % BODY_VARIANTS.length]!,
    eyes: EYES_VARIANTS[Math.floor(hash / 4) % EYES_VARIANTS.length]!,
    hat: HAT_VARIANTS[Math.floor(hash / 16) % HAT_VARIANTS.length]!,
    color: AVATAR_COLORS[Math.floor(hash / 64) % AVATAR_COLORS.length]!,
  };
}

/** Called after creation returns its real ID; never included in API payloads. */
export function saveAgentAvatar(agentId: string, avatar: AvatarSpec): void {
  if (!agentId || !validAvatar(avatar)) return;
  avatarMemory.set(agentId, { ...avatar });
  try { localStorage.setItem(avatarKey(agentId), JSON.stringify(avatar)); }
  catch { /* Keep the chosen appearance in this session when storage is unavailable. */ }
}

export interface AgentAvatarOptions {
  agentId: string;
  name?: string;
  size?: number;
  active?: boolean;
}

function avatarView(options: AgentAvatarOptions) {
  return <Avatar avatar={getAgentAvatar(options.agentId)} size={options.size ?? 68}
    state={options.active ? 'working' : 'idle'} title={options.name ? `Avatar de ${options.name}` : 'Avatar del agente'} />;
}

export function mountAgentAvatar(host: HTMLElement, initial: AgentAvatarOptions) {
  const root = createRoot(host);
  let options = initial;
  root.render(avatarView(options));
  return {
    update(next: Partial<AgentAvatarOptions>) {
      options = { ...options, ...next };
      root.render(avatarView(options));
    },
    destroy() { root.unmount(); },
  };
}

/** Static DOM for chat surfaces that frequently replace their contents. */
export function createAgentAvatarElement(agentId: string, name?: string, size = 48): HTMLElement {
  if (!document.getElementById('mo-avatar-styles')) {
    const styles = document.createElement('style');
    styles.id = 'mo-avatar-styles';
    styles.textContent = AVATAR_CSS;
    document.head.append(styles);
  }
  const host = document.createElement('span');
  host.className = 'agent-avatar-inline';
  // React escapes every value; this markup contains only our own SVG component.
  host.innerHTML = renderToStaticMarkup(avatarView({ agentId, name, size }));
  return host;
}

export function mountAvatarPicker(host: HTMLElement, initial?: AvatarSpec) {
  const root = createRoot(host);
  let value = initial && validAvatar(initial) ? { ...initial } : randomAvatar();
  const render = () => root.render(<AvatarPicker value={value} previewSize={152} onChange={(next) => {
    value = { ...next };
    render();
  }} />);
  render();
  return {
    getValue: (): AvatarSpec => ({ ...value }),
    reset(next?: AvatarSpec) {
      value = next && validAvatar(next) ? { ...next } : randomAvatar();
      render();
    },
    destroy() { root.unmount(); },
  };
}

export interface DashboardAgent {
  id: string;
  profile: {
    name: string;
    position: string;
    skills: readonly string[];
    operationalRole?: string;
    thinkingRole?: string;
  };
}

export interface AgentDashboardSnapshot {
  agents: readonly DashboardAgent[];
  activeAgentIds: ReadonlySet<string>;
  connections: readonly { bossId: string; subordinateId: string }[];
  rootId: string | null;
  ready?: boolean;
  createPending?: boolean;
  selectedAgentId?: string | null;
}

export interface AgentDashboardActions {
  onOpenAgent: (agentId: string) => void;
  onCreateAgent: () => void;
}

const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');

function AgentDashboard({ snapshot, actions }: { snapshot: AgentDashboardSnapshot; actions: AgentDashboardActions }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'connected'>('all');
  const { agents, activeAgentIds, connections, rootId } = snapshot;
  const ready = snapshot.ready !== false;
  const ids = new Set(agents.map((agent) => agent.id));
  const realConnections = connections.filter((edge) => ids.has(edge.bossId) && ids.has(edge.subordinateId));
  const connected = new Set(realConnections.flatMap((edge) => [edge.bossId, edge.subordinateId]));
  if (rootId && ids.has(rootId)) connected.add(rootId);
  const activeCount = agents.filter((agent) => activeAgentIds.has(agent.id)).length;
  const root = agents.find((agent) => agent.id === rootId);
  const search = normalize(query.trim());
  const visibleAgents = agents.filter((agent) => {
    if (filter === 'active' && !activeAgentIds.has(agent.id)) return false;
    if (filter === 'connected' && !connected.has(agent.id)) return false;
    return normalize([agent.profile.name, agent.profile.position, ...agent.profile.skills].join(' ')).includes(search);
  }).sort((a, b) => Number(b.id === rootId) - Number(a.id === rootId) || a.profile.name.localeCompare(b.profile.name, 'es'));
  const createDisabled = Boolean(snapshot.createPending);

  return <section className="agent-dashboard" aria-label="Biblioteca de agentes">
    <header className="ad-heading">
      <div><p className="ad-eyebrow">TU EQUIPO, EN UN SOLO LUGAR</p><h1>Biblioteca de agentes</h1>
        <p className="ad-description">Conoce a tu equipo y abre una conversación para empezar.</p></div>
      <button className="ad-create" type="button" onClick={actions.onCreateAgent} disabled={createDisabled}>
        <span aria-hidden="true">＋</span> {createDisabled ? 'Creando agente…' : 'Crear agente'}
      </button>
    </header>

    <div className="ad-summary" aria-label="Resumen de la oficina">
      <div><span className="ad-stat-icon ad-blue" aria-hidden="true">♙</span><p><strong>{ready ? agents.length : '—'}</strong><span>Agentes en la oficina</span></p></div>
      <div><span className="ad-stat-icon ad-green" aria-hidden="true">✦</span><p><strong>{ready ? activeCount : '—'}</strong><span>Trabajando ahora</span></p></div>
      <div><span className="ad-stat-icon ad-amber" aria-hidden="true">↗</span><p><strong>{ready ? realConnections.length : '—'}</strong><span>Conexiones de equipo</span></p></div>
    </div>

    <div className="ad-toolbar">
      <div className="ad-filters" role="group" aria-label="Filtrar agentes">
        <button type="button" aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>Todos <span>{agents.length}</span></button>
        <button type="button" aria-pressed={filter === 'active'} onClick={() => setFilter('active')}>Trabajando <span>{activeCount}</span></button>
        <button type="button" aria-pressed={filter === 'connected'} onClick={() => setFilter('connected')}>En jerarquía <span>{connected.size}</span></button>
      </div>
      <label className="ad-search"><span aria-hidden="true">⌕</span><input type="search" aria-label="Buscar agentes por nombre, puesto o habilidad"
        placeholder="Buscar nombre, puesto o habilidad…" value={query} onChange={(event) => setQuery(event.currentTarget.value)} /></label>
    </div>

    {!ready ? <div className="ad-empty" role="status"><span className="ad-empty-icon" aria-hidden="true">◌</span>
      <h2>Conectando con tu oficina…</h2><p>El equipo aparecerá cuando termine la carga.</p></div>
    : agents.length === 0 ? <div className="ad-empty">
      <span className="ad-empty-icon" aria-hidden="true">＋</span><h2>Tu equipo empieza aquí</h2>
      <p>Crea tu primer agente, elige su avatar y dale una responsabilidad.</p>
      <button className="ad-create" type="button" disabled={createDisabled} onClick={actions.onCreateAgent}>Crear mi primer agente</button>
    </div>
    : visibleAgents.length === 0 ? <div className="ad-empty" role="status">
      <h2>No hay agentes con este filtro</h2><p>Prueba con otro nombre, puesto o habilidad.</p>
      <button className="ad-secondary" type="button" onClick={() => { setQuery(''); setFilter('all'); }}>Mostrar todo el equipo</button>
    </div>
    : <div className="ad-grid">
      {visibleAgents.map((agent) => {
        const active = activeAgentIds.has(agent.id);
        const isRoot = rootId === agent.id;
        const avatar = getAgentAvatar(agent.id);
        const bossId = realConnections.find((edge) => edge.subordinateId === agent.id)?.bossId;
        const boss = agents.find((item) => item.id === bossId);
        return <button key={agent.id} className={`ad-agent-card${isRoot ? ' ad-root-card' : ''}`}
          type="button" data-dashboard-agent-id={agent.id} aria-label={`Conversar con ${agent.profile.name}, ${agent.profile.position}`}
          aria-current={snapshot.selectedAgentId === agent.id ? 'true' : undefined} onClick={() => actions.onOpenAgent(agent.id)}>
          <div className="ad-card-top"><span className={`ad-presence${active ? ' is-active' : ''}`}><i aria-hidden="true" />{active ? 'Trabajando' : 'Disponible'}</span>
            {isRoot && <span className="ad-chief">Jefe inicial</span>}</div>
          <div className="ad-avatar-stage" style={{ backgroundColor: `${avatar.color}12` }}>
            <Avatar avatar={avatar} size={90} state={active ? 'working' : 'idle'} title={`Avatar de ${agent.profile.name}`} />
          </div>
          <h2>{agent.profile.name}</h2><p className="ad-agent-position">{agent.profile.position || 'Sin puesto definido'}</p>
          <div className="ad-skills">{agent.profile.skills.slice(0, 3).map((skill, index) => <span key={`${skill}:${index}`}>{skill}</span>)}
            {agent.profile.skills.length > 3 && <span title={agent.profile.skills.slice(3).join(', ')}>+{agent.profile.skills.length - 3}</span>}
            {agent.profile.skills.length === 0 && <span className="ad-no-skills">Sin habilidades registradas</span>}</div>
          <div className="ad-card-footer"><span>{isRoot ? 'Coordina la oficina' : boss ? `Reporta a ${boss.profile.name}` : 'Sin jefe asignado'}</span>
            <strong>Conversar <span aria-hidden="true">↗</span></strong></div>
        </button>;
      })}
      {filter === 'all' && !search && <button type="button" className="ad-new-card" disabled={createDisabled} onClick={actions.onCreateAgent}>
        <span aria-hidden="true">＋</span><strong>Un lugar para alguien más</strong><small>Crear agente</small></button>}
    </div>}
    {ready && agents.length > 0 && <p className="ad-team-note">{root ? `${root.profile.name} coordina la oficina.` : 'Elige al jefe inicial al conectar tu equipo en Oficina.'} Abre una tarjeta para conversar.</p>}
  </section>;
}

export function mountAgentDashboard(host: HTMLElement, actions: AgentDashboardActions) {
  const root = createRoot(host);
  const update = (snapshot: AgentDashboardSnapshot) => root.render(<AgentDashboard snapshot={snapshot} actions={actions} />);
  update({ agents: [], activeAgentIds: new Set(), connections: [], rootId: null, ready: false });
  return { update, destroy() { root.unmount(); } };
}
