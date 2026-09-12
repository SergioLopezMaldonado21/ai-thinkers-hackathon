import './style.css';
import { ConversationStore, type Conversation } from './conversation-store';
import { createCommunicationAudit } from './communication-audit';
import { mountAgentAvatar, mountAvatarPicker, mountAgentDashboard, saveAgentAvatar, createAgentAvatarElement } from './visuals/agent-dashboard';
import { createChatExperience } from './visuals/chat-experience';

type OperationalRole =
  | 'lead_manager' | 'researcher_intel' | 'secretary_executive_assistant' | 'scribe_recorder'
  | 'coordinator' | 'communicator_correspondent' | 'liaison' | 'office_manager'
  | 'bookkeeper' | 'clerk' | 'archivist' | 'reviewer_quality_control' | 'receptionist'
  | 'troubleshooter' | 'people_manager_hr' | 'messenger' | 'gatekeeper' | 'chief_of_staff';
type ThinkingRole = 'analyst' | 'skeptic' | 'visionary' | 'pragmatist' | 'empath_user_advocate' | 'synthesizer';
type AgentProfile = {
  name: string;
  position: string;
  responsibilities: string;
  limitations: string;
  deliverables: string;
  skills: string[];
  operationalRole: OperationalRole;
  thinkingRole: ThinkingRole;
};
type CreatedAgent = { id: string; profile: AgentProfile };
type MessageResponse = { threadId: string; reply: string };
type AgentConnection = { id: string; bossId: string; subordinateId: string };
type OfficeSnapshot = {
  agents: CreatedAgent[];
  rootId: string | null;
  connections: AgentConnection[];
  communications: Array<{
    id: string; runId: string; edgeId: string; bossId: string; subordinateId: string;
    round: number; request: string; response: string | null;
    status: 'pending' | 'completed' | 'error'; startedAt: string; completedAt: string | null;
  }>;
  activeAgentIds: string[];
};

const canvas = document.querySelector<HTMLElement>('#canvas')!;
const connectionLayer = document.querySelector<SVGSVGElement>('#connection-layer')!;
const createButton = document.querySelector<HTMLButtonElement>('#create-agent')!;
const connectButton = document.querySelector<HTMLButtonElement>('#toggle-connect')!;
const connectionsVisibilityButton = document.querySelector<HTMLButtonElement>('#toggle-connections')!;
const agentDialog = document.querySelector<HTMLDialogElement>('#agent-dialog')!;
const agentForm = document.querySelector<HTMLFormElement>('#agent-form')!;
const agentFormError = document.querySelector<HTMLElement>('#agent-form-error')!;
const cancelAgentButtons = document.querySelectorAll<HTMLButtonElement>('#cancel-agent, #cancel-agent-footer');
const fillRandomAgentButton = document.querySelector<HTMLButtonElement>('#fill-random-agent')!;
const submitAgentButton = document.querySelector<HTMLButtonElement>('#submit-agent')!;
const operationalRoleSelect = document.querySelector<HTMLSelectElement>('#agent-operational-role')!;
const thinkingRoleSelect = document.querySelector<HTMLSelectElement>('#agent-thinking-role')!;
const agentCount = document.querySelector<HTMLElement>('#agent-count')!;
const feedback = document.querySelector<HTMLElement>('#feedback')!;
const chatPanel = document.querySelector<HTMLElement>('#chat-panel')!;
const chatTitle = document.querySelector<HTMLElement>('#chat-title')!;
const messagesElement = document.querySelector<HTMLElement>('#messages')!;
const messageForm = document.querySelector<HTMLFormElement>('#message-form')!;
const messageInput = document.querySelector<HTMLInputElement>('#message-input')!;
const sendButton = document.querySelector<HTMLButtonElement>('#send-message')!;
const closeChat = document.querySelector<HTMLButtonElement>('#close-chat')!;
const auditPairSelect = document.querySelector<HTMLSelectElement>('#audit-pair')!;
const auditPairButton = document.querySelector<HTMLButtonElement>('#audit-pair-open')!;
const officeStatus = document.querySelector<HTMLElement>('#office-status')!;

const conversations = new ConversationStore();
const agentNodes = new Map<string, HTMLButtonElement>();
const agentCatalog = new Map<string, CreatedAgent>();
const nodeAvatars = new Map<string, ReturnType<typeof mountAgentAvatar>>();
const drafts = new Map<string, string>();
const historyErrors = new Map<string, string>();
const agentConnections: AgentConnection[] = [];
let selectedAgentId: string | null = null;
let totalAgents = 0;
let spawnIndex = 0;
let rootAgentId: string | null = null;
let connectionDraftBossId: string | null = null;
let connectionMode = false;
let connectionsVisible = true;
let connectionRenderPending = false;
let treeSaving = false;
let treeRevision = 0;
let agentCatalogRevision = 0;
let agentCreationPending = false;
let officeReady = false;
let activeAgentIds = new Set<string>();
let activePairs = new Set<string>();
let pairOptionsSignature = '';
let pollTimer: ReturnType<typeof setTimeout> | undefined;
let pollInFlight = false;
let pageStopped = false;
const communicationAudit = createCommunicationAudit();
const historiesLoading = new Set<string>();
const personalHistoryPending = new Set<string>();
const avatarPicker = mountAvatarPicker(document.querySelector<HTMLElement>('#agent-avatar-picker')!);
const dashboard = mountAgentDashboard(document.querySelector<HTMLElement>('#agent-dashboard')!, {
  onOpenAgent: openConversation, onCreateAgent: openCreateAgentDialog,
});
const chatExperience = createChatExperience({
  panel: chatPanel, messages: messagesElement, input: messageInput, getConversation,
  onSelectAgent: openConversation, onCreateAgent: openCreateAgentDialog, onClose: closeConversation,
  createAvatar: (id, name) => createAgentAvatarElement(id, name, 40),
});

function updateChatExperience() {
  chatExperience.update({
    agents: [...agentCatalog.values()], selectedAgentId, activeAgentIds,
    loading: selectedAgentId ? historiesLoading.has(selectedAgentId) : false,
    historyError: selectedAgentId ? historyErrors.get(selectedAgentId) : undefined,
  });
}

function updateVisuals() {
  dashboard.update({
    agents: [...agentCatalog.values()], activeAgentIds, connections: agentConnections,
    rootId: rootAgentId, ready: officeReady, createPending: agentCreationPending,
  });
  updateChatExperience();
  document.querySelector<HTMLElement>('#workspace-status')!.textContent = officeStatus.textContent;
  document.querySelector<HTMLElement>('.canvas-copy')!.hidden = agentNodes.size > 0;
}

function selectView(view: string) {
  const isDashboard = view === 'dashboard';
  document.querySelector<HTMLElement>('#office-view')!.hidden = isDashboard;
  document.querySelector<HTMLElement>('#dashboard-view')!.hidden = !isDashboard;
  document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((button) => {
    if (button.dataset.view === (isDashboard ? 'dashboard' : 'office')) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  if (!isDashboard) requestConnectionRender();
}

function pairKey(bossId: string, subordinateId: string) {
  return JSON.stringify([bossId, subordinateId]);
}

function updateAuditChoices() {
  const signature = JSON.stringify(agentConnections.map((connection) => [
    connection.id, agentNodes.get(connection.bossId)?.dataset.agentName,
    agentNodes.get(connection.subordinateId)?.dataset.agentName,
  ]));
  if (signature !== pairOptionsSignature) {
    pairOptionsSignature = signature;
    const previous = auditPairSelect.value;
    auditPairSelect.replaceChildren();
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = agentConnections.length ? 'Selecciona jefe → subordinado' : 'Todavía no hay conexiones';
    auditPairSelect.append(placeholder);
    for (const connection of agentConnections) {
      const option = document.createElement('option');
      option.value = connection.id;
      option.textContent = `${agentNodes.get(connection.bossId)?.dataset.agentName ?? connection.bossId} → ${agentNodes.get(connection.subordinateId)?.dataset.agentName ?? connection.subordinateId}`;
      auditPairSelect.append(option);
    }
    if (agentConnections.some((connection) => connection.id === previous)) auditPairSelect.value = previous;
  }
  auditPairSelect.disabled = !agentConnections.length;
  auditPairButton.disabled = !auditPairSelect.value;
}

function openAudit(bossId: string, subordinateId: string) {
  communicationAudit.open(bossId, subordinateId);
}

function applyOfficeSnapshot(snapshot: OfficeSnapshot, revision: number, catalogRevision: number) {
  for (const agent of snapshot.agents) {
    if (!agentNodes.has(agent.id)) createAgentNode(agent);
  }
  // Ignore removals from a GET started before/during local creation.
  if (!agentCreationPending && catalogRevision === agentCatalogRevision) {
    const knownIds = new Set(snapshot.agents.map((agent) => agent.id));
    let removed = false;
    for (const [id, node] of agentNodes) {
      if (knownIds.has(id)) continue;
      node.remove();
      agentNodes.delete(id);
      agentCatalog.delete(id);
      nodeAvatars.get(id)?.destroy();
      nodeAvatars.delete(id);
      drafts.delete(id);
      historyErrors.delete(id);
      personalHistoryPending.delete(id);
      if (connectionDraftBossId === id) clearConnectionDraft();
      if (selectedAgentId === id) {
        closeConversation();
        feedback.textContent = 'Este agente ya no está disponible en la oficina.';
      }
      removed = true;
    }
    if (removed) requestConnectionRender();
  }
  totalAgents = agentNodes.size;
  updateCount();
  if (!treeSaving && revision === treeRevision) {
    rootAgentId = snapshot.rootId;
    if (JSON.stringify(agentConnections) !== JSON.stringify(snapshot.connections)) {
      agentConnections.splice(0, agentConnections.length, ...snapshot.connections);
      requestConnectionRender();
    }
  }
  activeAgentIds = new Set(snapshot.activeAgentIds);
  if (selectedAgentId && personalHistoryPending.has(selectedAgentId) && !activeAgentIds.has(selectedAgentId)) {
    void loadPersonalHistory(selectedAgentId);
  }
  const nextPairs = new Set(snapshot.communications.filter((record) => record.status === 'pending')
    .map((record) => pairKey(record.bossId, record.subordinateId)));
  const activityChanged = nextPairs.size !== activePairs.size || [...nextPairs].some((pair) => !activePairs.has(pair));
  activePairs = nextPairs;
  if (activityChanged) requestConnectionRender();
  for (const id of agentNodes.keys()) updateAgentActivity(id);
  updateComposer();
  updateAuditChoices();
  communicationAudit.update(snapshot);
  officeReady = true;
  updateConnectionControls();
  officeStatus.textContent = activePairs.size
    ? `${activePairs.size} ${activePairs.size === 1 ? 'consulta interna activa' : 'consultas internas activas'} · flechas iluminadas`
    : activeAgentIds.size ? 'Agentes trabajando · sin consultas internas activas' : 'Oficina conectada · sin consultas internas activas';
  updateVisuals();
}

async function pollOffice() {
  if (pollInFlight || pageStopped) return;
  pollInFlight = true;
  const revision = treeRevision;
  const catalogRevision = agentCatalogRevision;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch('/api/office', { signal: controller.signal, cache: 'no-store' });
    if (!response.ok) throw new Error(await parseErrorResponse(response));
    const snapshot = await response.json() as OfficeSnapshot;
    if (!pageStopped) applyOfficeSnapshot(snapshot, revision, catalogRevision);
  } catch {
    // An unavailable snapshot must not leave arrows pretending there is live activity.
    activePairs.clear();
    activeAgentIds.clear();
    requestConnectionRender();
    for (const id of agentNodes.keys()) updateAgentActivity(id);
    officeStatus.textContent = 'Sin conexión con la oficina · reintentando…';
    updateVisuals();
  } finally {
    clearTimeout(timeout);
    pollInFlight = false;
    if (!pageStopped) pollTimer = setTimeout(() => void pollOffice(), 850);
  }
}

const operationalRoles: ReadonlyArray<readonly [OperationalRole, string]> = [
  ['lead_manager', 'The Lead / Manager'], ['researcher_intel', 'The Researcher / Intel'],
  ['secretary_executive_assistant', 'The Secretary / Executive Assistant'], ['scribe_recorder', 'The Scribe / Recorder'],
  ['coordinator', 'The Coordinator'], ['communicator_correspondent', 'The Communicator / Correspondent'],
  ['liaison', 'The Liaison'], ['office_manager', 'The Office Manager'], ['bookkeeper', 'The Bookkeeper'],
  ['clerk', 'The Clerk'], ['archivist', 'The Archivist'], ['reviewer_quality_control', 'The Reviewer / Quality Control'],
  ['receptionist', 'The Receptionist'], ['troubleshooter', 'The Troubleshooter'],
  ['people_manager_hr', 'The People Manager / HR'], ['messenger', 'The Messenger'],
  ['gatekeeper', 'The Gatekeeper'], ['chief_of_staff', 'The Chief of Staff'],
];
const thinkingRoles: ReadonlyArray<readonly [ThinkingRole, string]> = [
  ['analyst', 'The Analyst'], ['skeptic', 'The Skeptic'], ['visionary', 'The Visionary'],
  ['pragmatist', 'The Pragmatist'], ['empath_user_advocate', 'The Empath / User Advocate'],
  ['synthesizer', 'The Synthesizer'],
];

type RandomAgentTemplate = Omit<AgentProfile, 'name'>;
const randomAgentTemplates: readonly RandomAgentTemplate[] = [
  {
    position: 'Analista de tendencias',
    responsibilities: 'Investiga señales, sintetiza hallazgos y propone hipótesis verificables.',
    limitations: 'No toma decisiones finales ni inventa fuentes.',
    deliverables: 'Resumen ejecutivo con evidencias, riesgos y próximos pasos.',
    skills: ['investigación', 'análisis crítico', 'síntesis'],
    operationalRole: 'researcher_intel',
    thinkingRole: 'analyst',
  },
  {
    position: 'Revisora de calidad',
    responsibilities: 'Contrasta entregables con requisitos y detecta inconsistencias.',
    limitations: 'No reescribe el trabajo completo sin pedir contexto adicional.',
    deliverables: 'Lista priorizada de observaciones y criterios de aceptación.',
    skills: ['revisión', 'control de calidad', 'comunicación clara'],
    operationalRole: 'reviewer_quality_control',
    thinkingRole: 'skeptic',
  },
  {
    position: 'Diseñador de estrategia',
    responsibilities: 'Explora alternativas y convierte objetivos ambiguos en una estrategia accionable.',
    limitations: 'No asume presupuesto, fechas o datos que no se hayan confirmado.',
    deliverables: 'Opciones estratégicas con ventajas, riesgos y recomendación.',
    skills: ['estrategia', 'ideación', 'priorización'],
    operationalRole: 'coordinator',
    thinkingRole: 'visionary',
  },
  {
    position: 'Coordinador de ejecución',
    responsibilities: 'Descompone objetivos en tareas, dependencias y responsables.',
    limitations: 'No modifica prioridades sin validación del jefe.',
    deliverables: 'Plan de ejecución con responsables, secuencia y bloqueos.',
    skills: ['planificación', 'coordinación', 'seguimiento'],
    operationalRole: 'office_manager',
    thinkingRole: 'pragmatist',
  },
  {
    position: 'Representante del usuario',
    responsibilities: 'Evalúa propuestas desde necesidades, fricciones y resultados del usuario.',
    limitations: 'No representa a usuarios reales sin investigación proporcionada.',
    deliverables: 'Mapa de necesidades, dudas y recomendaciones centradas en usuario.',
    skills: ['empatía', 'UX', 'entrevista'],
    operationalRole: 'liaison',
    thinkingRole: 'empath_user_advocate',
  },
];

function populateRoleOptions<T extends string>(select: HTMLSelectElement, roles: ReadonlyArray<readonly [T, string]>) {
  for (const [value, label] of roles) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    select.append(option);
  }
}

populateRoleOptions(operationalRoleSelect, operationalRoles);
populateRoleOptions(thinkingRoleSelect, thinkingRoles);

function getConversation(threadId: string): Conversation {
  return conversations.get(threadId);
}

function updateCount() {
  agentCount.textContent = `${totalAgents} ${totalAgents === 1 ? 'agente' : 'agentes'}`;
}

function isInHierarchy(agentId: string) {
  return rootAgentId === agentId || agentConnections.some(
    (connection) => connection.bossId === agentId || connection.subordinateId === agentId,
  );
}

function updateConnectionControls() {
  connectButton.disabled = !officeReady || treeSaving || activeAgentIds.size > 0;
  connectButton.classList.toggle('is-active', connectionMode);
  connectButton.setAttribute('aria-pressed', String(connectionMode));
  connectButton.lastElementChild!.textContent = connectionMode ? 'Cancelar conexión' : 'Conectar';
  connectionsVisibilityButton.setAttribute('aria-pressed', String(connectionsVisible));
  connectionsVisibilityButton.setAttribute(
    'aria-label',
    connectionsVisible ? 'Ocultar flechas de conexión' : 'Mostrar flechas de conexión',
  );
  connectionsVisibilityButton.title = connectionsVisible ? 'Ocultar flechas de conexión' : 'Mostrar flechas de conexión';
  connectionLayer.classList.toggle('is-hidden', !connectionsVisible);
}

function clearConnectionDraft() {
  if (connectionDraftBossId) agentNodes.get(connectionDraftBossId)?.classList.remove('is-connection-source');
  connectionDraftBossId = null;
}

function setConnectionMode(enabled: boolean) {
  connectionMode = enabled;
  if (!enabled) clearConnectionDraft();
  updateConnectionControls();
  if (enabled) feedback.textContent = 'Conexión: selecciona primero al jefe y después a su subordinado.';
}

function createSvgElement<Tag extends keyof SVGElementTagNameMap>(tag: Tag) {
  return document.createElementNS('http://www.w3.org/2000/svg', tag) as SVGElementTagNameMap[Tag];
}

function renderConnections() {
  connectionRenderPending = false;
  const definitions = createSvgElement('defs');
  const marker = createSvgElement('marker');
  marker.setAttribute('id', 'agent-connection-arrow');
  marker.setAttribute('viewBox', '0 0 10 10');
  marker.setAttribute('refX', '8');
  marker.setAttribute('refY', '5');
  marker.setAttribute('markerWidth', '7');
  marker.setAttribute('markerHeight', '7');
  marker.setAttribute('orient', 'auto-start-reverse');
  const arrow = createSvgElement('path');
  arrow.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
  arrow.setAttribute('class', 'connection-arrowhead');
  marker.append(arrow);
  definitions.append(marker);
  const activeMarker = marker.cloneNode(true) as SVGMarkerElement;
  activeMarker.id = 'agent-connection-arrow-active';
  activeMarker.firstElementChild!.setAttribute('class', 'connection-arrowhead is-active');
  definitions.append(activeMarker);

  const canvasRect = canvas.getBoundingClientRect();
  const lines = agentConnections.flatMap((connection) => {
    const boss = agentNodes.get(connection.bossId);
    const subordinate = agentNodes.get(connection.subordinateId);
    if (!boss || !subordinate) return [];
    const bossRect = boss.getBoundingClientRect();
    const subordinateRect = subordinate.getBoundingClientRect();
    const startX = bossRect.left - canvasRect.left + bossRect.width / 2;
    const startY = bossRect.top - canvasRect.top + bossRect.height / 2;
    const endX = subordinateRect.left - canvasRect.left + subordinateRect.width / 2;
    const endY = subordinateRect.top - canvasRect.top + subordinateRect.height / 2;
    const distance = Math.hypot(endX - startX, endY - startY);
    if (distance === 0) return [];
    const unitX = (endX - startX) / distance;
    const unitY = (endY - startY) / distance;
    // Preserve direction even when a user drags two agents very close together.
    const trimScale = Math.min(1, distance * 0.75 / 59);
    const line = createSvgElement('line');
    line.classList.add('connection-line');
    const active = activePairs.has(pairKey(connection.bossId, connection.subordinateId));
    line.classList.toggle('is-active', active);
    line.dataset.connectionId = connection.id;
    line.setAttribute('x1', String(startX + unitX * 27 * trimScale));
    line.setAttribute('y1', String(startY + unitY * 27 * trimScale));
    line.setAttribute('x2', String(endX - unitX * 32 * trimScale));
    line.setAttribute('y2', String(endY - unitY * 32 * trimScale));
    line.setAttribute('marker-end', active ? 'url(#agent-connection-arrow-active)' : 'url(#agent-connection-arrow)');
    const hitArea = line.cloneNode() as SVGLineElement;
    hitArea.setAttribute('class', 'connection-hit-area');
    hitArea.removeAttribute('marker-end');
    const title = createSvgElement('title');
    title.textContent = 'Ver comunicación interna entre estos agentes';
    hitArea.append(title);
    hitArea.addEventListener('click', () => openAudit(connection.bossId, connection.subordinateId));
    return [line, hitArea];
  });
  connectionLayer.replaceChildren(definitions, ...lines);
}

function requestConnectionRender() {
  if (connectionRenderPending) return;
  connectionRenderPending = true;
  requestAnimationFrame(renderConnections);
}

function resizeOffice() {
  if (!canvas.clientWidth || !canvas.clientHeight) return;
  for (const node of agentNodes.values()) {
    node.style.left = `${Math.max(0, Math.min(canvas.clientWidth - node.offsetWidth, parseFloat(node.style.left)))}px`;
    node.style.top = `${Math.max(0, Math.min(canvas.clientHeight - node.offsetHeight - 24, parseFloat(node.style.top)))}px`;
  }
  requestConnectionRender();
}

async function connectAgents(bossId: string, subordinateId: string) {
  if (!officeReady || treeSaving || activeAgentIds.size) {
    feedback.textContent = 'Espera a que la oficina termine de trabajar antes de conectar agentes.';
    return;
  }
  if (bossId === subordinateId) {
    feedback.textContent = 'Un agente no puede ser su propio subordinado.';
    return;
  }
  if (rootAgentId && !isInHierarchy(bossId)) {
    feedback.textContent = 'Solo el jefe inicial o un agente ya conectado puede tener subordinados.';
    return;
  }
  if (isInHierarchy(subordinateId)) {
    feedback.textContent = 'Ese agente ya pertenece a la jerarquía y no puede recibir otro jefe.';
    return;
  }

  const nextRootId = rootAgentId ?? bossId;
  const nextConnections = [...agentConnections, {
    id: `${bossId}:${subordinateId}`,
    bossId,
    subordinateId,
  }];
  treeSaving = true;
  treeRevision += 1;
  updateConnectionControls();
  feedback.textContent = 'Guardando conexión en la oficina…';
  try {
    const response = await fetch('/api/office/tree', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rootId: nextRootId, connections: nextConnections }),
    });
    if (!response.ok) throw new Error(await parseErrorResponse(response));
    rootAgentId = nextRootId;
    agentConnections.splice(0, agentConnections.length, ...nextConnections);
    feedback.textContent = `Conexión guardada: ${agentNodes.get(bossId)?.dataset.agentName ?? 'Jefe'} → ${agentNodes.get(subordinateId)?.dataset.agentName ?? 'subordinado'}.`;
    requestConnectionRender();
    updateAuditChoices();
  } catch (error) {
    feedback.textContent = error instanceof Error ? `No se guardó la conexión: ${error.message}` : 'No se pudo guardar la conexión.';
  } finally {
    treeSaving = false;
    treeRevision += 1;
    updateConnectionControls();
  }
}

function handleConnectionSelection(agentId: string) {
  if (treeSaving || !officeReady || activeAgentIds.size) return;
  if (!connectionDraftBossId) {
    if (rootAgentId && !isInHierarchy(agentId)) {
      feedback.textContent = 'Selecciona como jefe al jefe inicial o a un agente conectado.';
      return;
    }
    connectionDraftBossId = agentId;
    agentNodes.get(agentId)?.classList.add('is-connection-source');
    feedback.textContent = `Jefe: ${agentNodes.get(agentId)?.dataset.agentName ?? agentId}. Ahora selecciona un subordinado sin jefe.`;
    return;
  }

  const bossId = connectionDraftBossId;
  clearConnectionDraft();
  void connectAgents(bossId, agentId);
}

function updateComposer() {
  const pending = selectedAgentId ? getConversation(selectedAgentId).pending || activeAgentIds.has(selectedAgentId) : false;
  messageInput.disabled = pending;
  sendButton.disabled = pending;
  messageInput.placeholder = pending ? 'El agente está trabajando…' : 'Tu mensaje personal al agente…';
  messageForm.setAttribute('aria-busy', String(pending));
}

function renderConversation() {
  updateChatExperience();
  updateComposer();
}

function updateAgentActivity(threadId: string) {
  const pending = getConversation(threadId).pending || activeAgentIds.has(threadId);
  const node = agentNodes.get(threadId);
  node?.classList.toggle('is-responding', pending);
  node?.setAttribute('aria-busy', String(pending));
  nodeAvatars.get(threadId)?.update({ agentId: threadId, active: pending, size: 62, name: node?.dataset.agentName });
}

function refreshThread(threadId: string) {
  updateAgentActivity(threadId);
  if (selectedAgentId === threadId) renderConversation();
  updateVisuals();
}

function openConversation(agentId: string) {
  if (!agentCatalog.has(agentId)) return;
  communicationAudit.close();
  if (selectedAgentId) drafts.set(selectedAgentId, messageInput.value);
  selectedAgentId = agentId;
  messageInput.value = drafts.get(agentId) ?? '';
  getConversation(agentId);
  chatTitle.textContent = agentNodes.get(agentId)?.dataset.agentName ?? agentId;
  chatPanel.classList.add('is-open');
  chatPanel.setAttribute('aria-hidden', 'false');
  chatPanel.inert = false;
  renderConversation();
  if (!messageInput.disabled) messageInput.focus();
  void loadPersonalHistory(agentId);
}

async function loadPersonalHistory(agentId: string) {
  const conversation = getConversation(agentId);
  if (conversation.pending || historiesLoading.has(agentId)) return;
  historiesLoading.add(agentId);
  historyErrors.delete(agentId);
  updateChatExperience();
  const initialMessageCount = conversation.messages.length;
  try {
    const response = await fetch(`/api/chats/${encodeURIComponent(agentId)}/messages`, { cache: 'no-store' });
    if (!response.ok) throw new Error(await parseErrorResponse(response));
    const history = await response.json() as { messages: Conversation['messages']; pending: boolean };
    if (history.pending) personalHistoryPending.add(agentId);
    else personalHistoryPending.delete(agentId);
    // Never overwrite a locally started turn with an older history response.
    if (conversation.pending || conversation.messages.length !== initialMessageCount) return;
    conversation.messages.splice(0, conversation.messages.length, ...history.messages);
    if (selectedAgentId === agentId) renderConversation();
  } catch (error) {
    const message = `No se pudo cargar el historial personal: ${error instanceof Error ? error.message : 'error de conexión'}`;
    historyErrors.set(agentId, message);
    if (selectedAgentId === agentId) feedback.textContent = message;
  } finally {
    historiesLoading.delete(agentId);
    updateChatExperience();
  }
}

function closeConversation() {
  const previous = selectedAgentId;
  if (previous) drafts.set(previous, messageInput.value);
  selectedAgentId = null;
  chatPanel.classList.remove('is-open');
  chatPanel.setAttribute('aria-hidden', 'true');
  chatPanel.inert = true;
  updateChatExperience();
  if (previous && !document.querySelector<HTMLElement>('#office-view')!.hidden) agentNodes.get(previous)?.focus();
  else document.querySelector<HTMLButtonElement>('#new-chat')!.focus();
}

function createAgentNode(agent: CreatedAgent) {
  if (agentNodes.has(agent.id)) return;
  agentCatalog.set(agent.id, agent);
  const node = document.createElement('button');
  node.className = 'agent-node';
  node.type = 'button';
  node.dataset.agentId = agent.id;
  node.dataset.agentName = agent.profile.name;
  node.setAttribute('aria-label', `Agente ${agent.profile.name}. Haz clic para conversar o arrástralo para moverlo.`);
  node.innerHTML = '<span class="agent-core"></span><span class="agent-tooltip"></span>';
  node.querySelector<HTMLElement>('.agent-tooltip')!.textContent = agent.profile.name;
  nodeAvatars.set(agent.id, mountAgentAvatar(node.querySelector<HTMLElement>('.agent-core')!, {
    agentId: agent.id, size: 62, name: agent.profile.name,
  }));
  const rect = canvas.getBoundingClientRect();
  const canvasWidth = rect.width || document.querySelector<HTMLElement>('.workspace-content')!.clientWidth || 720;
  const canvasHeight = rect.height || 540;
  const spacing = 112;
  const columns = Math.max(1, Math.floor((canvasWidth - 110) / spacing) + 1);
  const rows = Math.max(1, Math.floor((canvasHeight - 150) / spacing) + 1);
  const slot = spawnIndex++ % (columns * rows);
  const column = slot % columns;
  const row = Math.floor(slot / columns);
  node.style.left = `${Math.max(0, Math.min(canvasWidth - 62, 24 + column * spacing))}px`;
  node.style.top = `${Math.max(0, Math.min(canvasHeight - 62, 48 + row * spacing))}px`;

  let pointerOffsetX = 0;
  let pointerOffsetY = 0;
  let moved = false;
  node.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    moved = false;
    const nodeRect = node.getBoundingClientRect();
    pointerOffsetX = event.clientX - nodeRect.left;
    pointerOffsetY = event.clientY - nodeRect.top;
    node.classList.add('is-dragging');
    node.setPointerCapture(event.pointerId);
  });
  node.addEventListener('pointermove', (event) => {
    if (!node.hasPointerCapture(event.pointerId)) return;
    const canvasRect = canvas.getBoundingClientRect();
    const left = Math.max(0, Math.min(canvasRect.width - node.offsetWidth, event.clientX - canvasRect.left - pointerOffsetX));
    const top = Math.max(0, Math.min(canvasRect.height - node.offsetHeight, event.clientY - canvasRect.top - pointerOffsetY));
    if (Math.abs(parseFloat(node.style.left) - left) > 2 || Math.abs(parseFloat(node.style.top) - top) > 2) moved = true;
    node.style.left = `${left}px`;
    node.style.top = `${top}px`;
    requestConnectionRender();
  });
  const endDrag = (event: PointerEvent) => {
    if (node.hasPointerCapture(event.pointerId)) node.releasePointerCapture(event.pointerId);
    node.classList.remove('is-dragging');
    if (!moved) {
      if (connectionMode) handleConnectionSelection(agent.id);
      else openConversation(agent.id);
    }
  };
  node.addEventListener('pointerup', endDrag);
  node.addEventListener('pointercancel', (event) => {
    if (node.hasPointerCapture(event.pointerId)) node.releasePointerCapture(event.pointerId);
    node.classList.remove('is-dragging');
  });
  node.addEventListener('click', (event) => {
    if (event.detail !== 0) return;
    if (connectionMode) handleConnectionSelection(agent.id);
    else openConversation(agent.id);
  });
  canvas.append(node);
  agentNodes.set(agent.id, node);
  getConversation(agent.id);
  requestConnectionRender();
}

async function parseErrorResponse(response: Response): Promise<string> {
  let detail = '';
  try {
    const payload = await response.json() as { error?: string; message?: string };
    detail = payload.error ?? payload.message ?? '';
  } catch { /* Use a status-specific fallback for non-JSON responses. */ }
  if (response.status === 401 || response.status === 403) return detail || 'La API key de OpenRouter no está configurada o no es válida.';
  if (response.status === 408 || response.status === 504) return detail || 'La respuesta del agente agotó el tiempo de espera.';
  if (response.status === 409) return detail || 'Este agente ya tiene un turno activo.';
  return detail || `No se recibió respuesta del agente (HTTP ${response.status}).`;
}

function readAgentProfile(): AgentProfile {
  const formData = new FormData(agentForm);
  const skills = String(formData.get('skills') ?? '')
    .split(/[\n,]/)
    .map((skill) => skill.trim())
    .filter(Boolean);
  return {
    name: String(formData.get('name') ?? '').trim(),
    position: String(formData.get('position') ?? '').trim(),
    responsibilities: String(formData.get('responsibilities') ?? '').trim(),
    limitations: String(formData.get('limitations') ?? '').trim(),
    deliverables: String(formData.get('deliverables') ?? '').trim(),
    skills,
    operationalRole: String(formData.get('operationalRole') ?? '') as OperationalRole,
    thinkingRole: String(formData.get('thinkingRole') ?? '') as ThinkingRole,
  };
}

function fillRandomAgentProfile() {
  const template = randomAgentTemplates[Math.floor(Math.random() * randomAgentTemplates.length)]!;
  const suffix = Math.floor(100 + Math.random() * 900);
  const setValue = (selector: string, value: string) => {
    document.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(selector)!.value = value;
  };
  setValue('#agent-name', `Agente de prueba ${suffix}`);
  setValue('#agent-position', template.position);
  setValue('#agent-responsibilities', template.responsibilities);
  setValue('#agent-limitations', template.limitations);
  setValue('#agent-deliverables', template.deliverables);
  setValue('#agent-skills', template.skills.join('\n'));
  operationalRoleSelect.value = template.operationalRole;
  thinkingRoleSelect.value = template.thinkingRole;
  agentFormError.textContent = '';
  feedback.textContent = 'Perfil de prueba autollenado. Revísalo o crea el agente.';
  document.querySelector<HTMLInputElement>('#agent-name')!.focus();
}

function openCreateAgentDialog() {
  if (agentCreationPending || agentDialog.open) return;
  agentFormError.textContent = '';
  agentDialog.showModal();
  document.querySelector<HTMLInputElement>('#agent-name')!.focus();
}

async function requestAgent(profile: AgentProfile) {
  agentCreationPending = true;
  agentCatalogRevision += 1;
  createButton.disabled = true;
  submitAgentButton.disabled = true;
  agentFormError.textContent = '';
  feedback.textContent = 'Creando agente…';
  updateVisuals();
  try {
    const response = await fetch('/api/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    if (!response.ok) throw new Error(await parseErrorResponse(response));
    const result = await response.json() as { allowed: boolean; agent?: CreatedAgent };
    if (!result.allowed || typeof result.agent?.id !== 'string' || !result.agent.id) throw new Error('El backend no devolvió un agente válido.');
    saveAgentAvatar(result.agent.id, avatarPicker.getValue());
    createAgentNode(result.agent);
    totalAgents = agentNodes.size;
    updateCount();
    feedback.textContent = `Agente ${result.agent.profile.name} creado.`;
    agentDialog.close();
    agentForm.reset();
    avatarPicker.reset();
  } catch (error) {
    const message = error instanceof TypeError ? 'No fue posible conectar con el backend.' : error instanceof Error ? error.message : 'No se pudo crear el agente.';
    feedback.textContent = message;
    agentFormError.textContent = message;
  } finally {
    agentCreationPending = false;
    agentCatalogRevision += 1;
    createButton.disabled = false;
    submitAgentButton.disabled = false;
    updateVisuals();
  }
}

async function sendMessage(event: SubmitEvent) {
  event.preventDefault();
  const threadId = selectedAgentId;
  const text = messageInput.value.trim();
  if (!threadId || !text) return;
  const conversation = getConversation(threadId);
  if (conversation.pending || activeAgentIds.has(threadId)) return;

  if (!conversations.startTurn(threadId, text)) return;
  messageInput.value = '';
  drafts.delete(threadId);
  refreshThread(threadId);
  try {
    const response = await fetch(`/api/message/${encodeURIComponent(threadId)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text }),
    });
    if (!response.ok) throw new Error(await parseErrorResponse(response));
    const result = await response.json() as MessageResponse;
    if (result.threadId !== threadId) throw new Error('El backend respondió para un thread distinto.');
    if (typeof result.reply !== 'string' || !result.reply.trim()) throw new Error('El agente devolvió una respuesta vacía.');
    conversations.finishTurn(threadId, result.reply);
  } catch (error) {
    const errorText = error instanceof TypeError ? 'No fue posible conectar con el backend.' : error instanceof Error ? error.message : 'Ocurrió un error al contactar al agente.';
    conversations.failTurn(threadId, errorText);
  } finally {
    refreshThread(threadId);
  }
}

createButton.addEventListener('click', openCreateAgentDialog);
fillRandomAgentButton.addEventListener('click', fillRandomAgentProfile);
connectButton.addEventListener('click', () => {
  location.hash = 'office';
  setConnectionMode(!connectionMode);
});
connectionsVisibilityButton.addEventListener('click', () => {
  connectionsVisible = !connectionsVisible;
  updateConnectionControls();
});
agentForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!agentForm.reportValidity()) return;
  void requestAgent(readAgentProfile());
});
cancelAgentButtons.forEach((button) => button.addEventListener('click', () => agentDialog.close()));
messageForm.addEventListener('submit', sendMessage);
closeChat.addEventListener('click', closeConversation);
messageInput.addEventListener('input', () => { if (selectedAgentId) drafts.set(selectedAgentId, messageInput.value); });
document.querySelector<HTMLButtonElement>('#new-chat')!.addEventListener('click', () => chatExperience.openPicker());
document.querySelectorAll<HTMLButtonElement>('[data-view]').forEach((button) => {
  button.addEventListener('click', () => { location.hash = button.dataset.view!; });
});
window.addEventListener('hashchange', () => selectView(location.hash.slice(1)));
selectView(location.hash.slice(1));
auditPairSelect.addEventListener('change', updateAuditChoices);
auditPairButton.addEventListener('click', () => {
  const connection = agentConnections.find((item) => item.id === auditPairSelect.value);
  if (connection) openAudit(connection.bossId, connection.subordinateId);
});
window.addEventListener('resize', resizeOffice);
new ResizeObserver(resizeOffice).observe(canvas);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && connectionMode && connectionDraftBossId) {
    clearConnectionDraft();
    feedback.textContent = 'Selección de jefe cancelada.';
  }
});
updateConnectionControls();
updateAuditChoices();
updateVisuals();
void pollOffice();
window.addEventListener('pagehide', () => {
  pageStopped = true;
  clearTimeout(pollTimer);
});
window.addEventListener('pageshow', () => {
  if (!pageStopped) return;
  pageStopped = false;
  void pollOffice();
});
