/**
 * MiniOficina — armado de las pantallas (§6 del SPEC).
 * ------------------------------------------------------------------
 * Este archivo es el ÚNICO lugar con "pegamento": decide qué pantalla se ve y
 * qué hace cada callback. Los módulos de `pages/` y `components/` siguen siendo
 * de UI pura (sin store, sin fetch, sin router propio).
 *
 * Ruteo: hash sin dependencias, para que `npm run dev` funcione sin instalar
 * react-router. Cuando el equipo meta react-router, se sustituye `useRoute()`
 * por sus hooks y NADA de los módulos cambia.
 *
 *   #/                     Lobby              §6.1
 *   #/p/:id                Oficina en vivo    §6.2
 *   #/p/:id/plano          Plano              §6.4
 *   #/agentes/nuevo        Creador de agentes §6.3
 *   #/agentes/:id          Creador (edición)  §6.3
 *   ⌘K / botón ✨          Panel generativo   §6.5
 *
 * Los módulos traen datos de ejemplo del seed (§16) adentro, así que la app
 * levanta poblada. Para conectarlos al store real, pasa las props de datos:
 * mira `src/pages/README.md`.
 */
import React, { useCallback, useEffect, useState } from 'react';
import AppShell from './components/shell/AppShell';
import Lobby from './pages/Lobby';
import Office from './pages/Office';
import Plano from './pages/Plano';
import AgentBuilder from './components/agents/AgentBuilder';
import { CopilotPanel, CopilotFab } from './components/copilot/CopilotPanel';
import { Avatar } from './components/avatar/Avatar';
import { useMiniOficina } from './lib/useMiniOficina';

/* ───────────────────────── ruteo por hash ───────────────────────── */

type Route =
  | { name: 'lobby' }
  | { name: 'office'; projectId: string }
  | { name: 'plano'; projectId: string }
  | { name: 'agente'; agentId?: string };

function parse(hash: string): Route {
  const p = hash.replace(/^#\/?/, '').split('?')[0].split('/').filter(Boolean);
  if (p[0] === 'p' && p[1]) return p[2] === 'plano' ? { name: 'plano', projectId: p[1] } : { name: 'office', projectId: p[1] };
  if (p[0] === 'agentes') return { name: 'agente', agentId: p[1] && p[1] !== 'nuevo' ? p[1] : undefined };
  return { name: 'lobby' };
}

function useRoute(): [Route, (to: string) => void] {
  const [route, setRoute] = useState<Route>(() => parse(window.location.hash));
  useEffect(() => {
    const on = () => setRoute(parse(window.location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const go = useCallback((to: string) => { window.location.hash = to; }, []);
  return [route, go];
}

/* ───────────────────────── app ───────────────────────── */

const PROYECTO = { id: 'p1', nombre: 'Lanzamiento Café Frío', emoji: '☕' };

export default function App() {
  const [route, go] = useRoute();
  const app = useMiniOficina();
  const [copilot, setCopilot] = useState(false);

  // ⌘K abre el panel desde cualquier pantalla (§6.5)
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setCopilot(true); }
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, []);

  const proyectoId = app.project?.id || 'p1';
  const nav = route.name === 'lobby' ? 'inicio'
    : route.name === 'agente' ? 'agentes'
    : route.name === 'plano' ? 'workflows' : 'proyectos';

  const contexto =
    route.name === 'office' ? `Oficina del proyecto ${PROYECTO.nombre}` :
    route.name === 'plano' ? `Plano del proyecto ${PROYECTO.nombre}` :
    route.name === 'agente' ? 'Creador de agentes' : 'Todos tus proyectos';

  return (
    <>
      <AppShell
        active={nav}
        project={{
          name: app.project?.name || 'MiniOficina',
          emoji: app.project?.emoji || '🏢',
          subtitle: app.conexion === 'ok'
            ? `${app.agents?.length ?? 0} agentes · plano de ${app.steps?.length ?? 0} pasos${app.motor?.simMode ? ' · modo simulación' : ''}`
            : 'sin conexión con el motor',
          live: app.conexion === 'ok',
        }}
        user={{ name: 'Christian', org: 'Orrala Systems', avatar: <Avatar avatar={{ body: 'bean', eyes: 'big', hat: 'antenna', color: '#4D96FF' }} size={32} state="static" /> }}
        notifications={3}
        onNavigate={(id) => {
          const p = app.project?.id || 'p1';
          if (id === 'inicio' || id === 'proyectos') go('/');
          else if (id === 'agentes') go('/agentes/nuevo');
          else if (id === 'workflows') go(`/p/${p}/plano`);
          else if (id === 'espacios') go(`/p/${p}`);
          else if (id === 'tareas') go(`/p/${p}`);
          else if (id === 'analytics') go(`/p/${p}`);
        }}
        onAsk={() => setCopilot(true)}
        onRules={() => window.alert(REGLAS)}
      >
        {app.conexion === 'caido' && (
          <div style={BANNER}>
            ⚠️ <b>El motor no responde.</b> Abre otra terminal y corre{' '}
            <code style={CODE}>cd server &amp;&amp; npm install &amp;&amp; npm start</code>. Mientras tanto las pantallas
            funcionan con datos de ejemplo, pero nada se guarda.
          </div>
        )}
        {app.conexion === 'ok' && app.motor?.simMode && (
          <div style={{ ...BANNER, background: '#FFF6DD', borderColor: '#F0D79B', color: '#7A5A12' }}>
            🧪 <b>Modo simulación.</b> El motor corre con salidas de ejemplo. Para usar el modelo real,
            pon tu <code style={CODE}>OPENROUTER_API_KEY</code> en <code style={CODE}>server/.env</code> y reinicia el server.
          </div>
        )}
        {app.aviso && <div style={{ ...BANNER, background: '#EEF3FF', borderColor: '#D9E2FB', color: '#2C4BA8' }}>{app.aviso}</div>}
        {route.name === 'lobby' && (
          <Lobby
            userName="Christian"
            projects={app.projects}
            agents={app.agents}
            areas={app.areas}
            planos={app.planos}
            skills={app.skills}
            onOpenProject={(id) => go(`/p/${id}`)}
            onCreateProject={(p) => void app.crearProyecto(p)}
            onCreateAgent={() => go('/agentes/nuevo')}
            onEditAgent={(a) => go(`/agentes/${a.id}`)}
            onNewPlano={() => go(`/p/${PROYECTO.id}/plano`)}
            onUsePlano={(id) => console.log('onUsePlano', id)}
            onOpenCopilot={() => setCopilot(true)}
          />
        )}

        {route.name === 'office' && (
          <Office
            project={app.project}
            areas={app.areas}
            agents={app.officeAgents}
            activity={app.activity}
            results={app.results}
            steps={app.steps}
            onRun={(payload) => void app.run(payload)}
            onSelectAgent={(a) => console.log('onSelectAgent', a.id)}
            onOpenResult={() => window.alert(
              (window as unknown as { __entregable?: string }).__entregable
              || 'Todavía no hay entregable.')}
            onAddAgent={() => go('/agentes/nuevo')}
            onTabChange={(t) => { if (t === 'plano') go(`/p/${route.projectId}/plano`); }}
            onOpenPlano={() => go(`/p/${route.projectId}/plano`)}
            onOpenCopilot={() => setCopilot(true)}
          />
        )}

        {route.name === 'plano' && (
          <Plano
            key={app.plano?.id}
            projectName={app.project?.name}
            plano={app.plano}
            agents={app.agents}
            areas={app.areas}
            templates={app.planos}
            onSave={(pl) => void app.guardarPlano(pl)}
            onOpenOffice={() => go(`/p/${route.projectId}`)}
            onLoadTemplate={(id) => { const t = app.planos?.find((x) => x.id === id); if (t) void app.guardarPlano({ ...t, id: app.plano?.id || t.id }); }}
            onBack={() => go(`/p/${route.projectId}`)}
          />
        )}

        {route.name === 'agente' && (
          <AgentBuilder
            key={route.agentId ?? 'nuevo'}
            projectName={app.project?.name}
            value={route.agentId ? app.agents?.find((a) => a.id === route.agentId) : undefined}
            agents={app.agents}
            areas={app.areas}
            skills={app.skills}
            onSave={(d) => { void app.guardarAgente({ ...d, id: route.agentId }).then(() => go('/')); }}
            onTest={(d) => window.alert(
              `Probar agente (P1)\n\n${d.name} · ${d.role}\n\nHace: ${d.does}\nEntrega: ${d.delivers || '—'}`)}
            onCancel={() => go('/')}
            onBack={() => go('/')}
            onOpenLibrary={() => go('/')}
          />
        )}
      </AppShell>

      <CopilotPanel
        open={copilot}
        context={contexto}
        onSubmit={(texto) => console.log('onSubmit copiloto', texto)}
        onUndo={(id) => console.log('onUndo', id)}
        onViewInOffice={() => { setCopilot(false); go(`/p/${PROYECTO.id}`); }}
        onClose={() => setCopilot(false)}
      />
      {!copilot && <CopilotFab onClick={() => setCopilot(true)} />}
    </>
  );
}

const BANNER: React.CSSProperties = {
  display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap',
  background: '#FDECEC', border: '1px solid #F5C9C9', color: '#8E2C2C',
  borderRadius: 14, padding: '11px 14px', fontSize: 12.5, marginBottom: 16,
};
const CODE: React.CSSProperties = { background: 'rgba(255,255,255,.65)', borderRadius: 5, padding: '1px 5px' };

const REGLAS = `Reglas de la Oficina

1) Cada agente hace solo lo que dice su ficha.
2) Todo trabajo sale de una mesa.
3) Toda tarea termina en un Resultado con el formato prometido.
4) Si falta información, una suposición razonable y anotada.
5) El supervisor reparte, revisa y entrega.
6) Nada inventado como hecho.
7) Respuestas cortas, claras y en el idioma del usuario.`;
