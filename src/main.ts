import './style.css';
import { ConversationStore, type Conversation } from './conversation-store';

type CreatedAgent = { id: string };
type MessageResponse = { threadId: string; reply: string };

const canvas = document.querySelector<HTMLElement>('#canvas')!;
const createButton = document.querySelector<HTMLButtonElement>('#create-agent')!;
const agentCount = document.querySelector<HTMLElement>('#agent-count')!;
const feedback = document.querySelector<HTMLElement>('#feedback')!;
const chatPanel = document.querySelector<HTMLElement>('#chat-panel')!;
const chatTitle = document.querySelector<HTMLElement>('#chat-title')!;
const messagesElement = document.querySelector<HTMLElement>('#messages')!;
const messageForm = document.querySelector<HTMLFormElement>('#message-form')!;
const messageInput = document.querySelector<HTMLInputElement>('#message-input')!;
const sendButton = document.querySelector<HTMLButtonElement>('#send-message')!;
const closeChat = document.querySelector<HTMLButtonElement>('#close-chat')!;

const conversations = new ConversationStore();
const agentNodes = new Map<string, HTMLButtonElement>();
let selectedAgentId: string | null = null;
let totalAgents = 0;
let spawnIndex = 0;

function getConversation(threadId: string): Conversation {
  return conversations.get(threadId);
}

function updateCount() {
  agentCount.textContent = `${totalAgents} ${totalAgents === 1 ? 'agente' : 'agentes'}`;
}

function updateComposer() {
  const pending = selectedAgentId ? getConversation(selectedAgentId).pending : false;
  messageInput.disabled = pending;
  sendButton.disabled = pending;
  messageInput.placeholder = pending ? 'Espera la respuesta de este agente…' : 'Escribe un mensaje…';
  messageForm.setAttribute('aria-busy', String(pending));
}

function renderConversation() {
  messagesElement.replaceChildren();
  if (!selectedAgentId) return;
  const conversation = getConversation(selectedAgentId);

  if (!conversation.messages.length && !conversation.pending) {
    const empty = document.createElement('p');
    empty.className = 'empty-chat';
    empty.textContent = 'Envía un mensaje para iniciar la conversación.';
    messagesElement.append(empty);
  }
  for (const message of conversation.messages) {
    const item = document.createElement('p');
    item.className = `message ${message.role}`;
    item.textContent = message.text;
    messagesElement.append(item);
  }
  if (conversation.pending) {
    const pending = document.createElement('p');
    pending.className = 'message agent pending';
    pending.setAttribute('role', 'status');
    pending.textContent = 'El agente está respondiendo…';
    messagesElement.append(pending);
  }
  updateComposer();
  requestAnimationFrame(() => { messagesElement.scrollTop = messagesElement.scrollHeight; });
}

function refreshThread(threadId: string) {
  const pending = getConversation(threadId).pending;
  const node = agentNodes.get(threadId);
  node?.classList.toggle('is-responding', pending);
  node?.setAttribute('aria-busy', String(pending));
  if (selectedAgentId === threadId) renderConversation();
}

function openConversation(agentId: string) {
  selectedAgentId = agentId;
  getConversation(agentId);
  chatTitle.textContent = agentId;
  chatPanel.classList.add('is-open');
  chatPanel.setAttribute('aria-hidden', 'false');
  renderConversation();
  if (!messageInput.disabled) messageInput.focus();
}

function closeConversation() {
  selectedAgentId = null;
  chatPanel.classList.remove('is-open');
  chatPanel.setAttribute('aria-hidden', 'true');
}

function createAgentNode(agent: CreatedAgent) {
  const node = document.createElement('button');
  node.className = 'agent-node';
  node.type = 'button';
  node.dataset.agentId = agent.id;
  node.setAttribute('aria-label', `Agente ${agent.id}. Haz clic para conversar o arrástralo para moverlo.`);
  node.innerHTML = '<span class="agent-core"></span><span class="agent-tooltip"></span>';
  node.querySelector<HTMLElement>('.agent-tooltip')!.textContent = agent.id;
  const rect = canvas.getBoundingClientRect();
  const offset = (spawnIndex++ % 6) * 28;
  node.style.left = `${Math.min(rect.width - 62, Math.max(26, rect.width / 2 - 26 + offset))}px`;
  node.style.top = `${Math.min(rect.height - 62, Math.max(42, rect.height / 2 - 26 + offset))}px`;

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
  });
  const endDrag = (event: PointerEvent) => {
    if (node.hasPointerCapture(event.pointerId)) node.releasePointerCapture(event.pointerId);
    node.classList.remove('is-dragging');
    if (!moved) openConversation(agent.id);
  };
  node.addEventListener('pointerup', endDrag);
  node.addEventListener('pointercancel', endDrag);
  canvas.append(node);
  agentNodes.set(agent.id, node);
  getConversation(agent.id);
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

async function requestAgent() {
  createButton.disabled = true;
  feedback.textContent = 'Creando agente…';
  try {
    const response = await fetch('/api/chats', { method: 'POST' });
    if (!response.ok) throw new Error(await parseErrorResponse(response));
    const result = await response.json() as { allowed: boolean; agent?: CreatedAgent };
    if (!result.allowed || typeof result.agent?.id !== 'string' || !result.agent.id) throw new Error('El backend no devolvió un agente válido.');
    if (agentNodes.has(result.agent.id)) throw new Error('El backend devolvió un agente que ya existe en el canvas.');
    createAgentNode(result.agent);
    totalAgents += 1;
    updateCount();
    feedback.textContent = `Agente ${result.agent.id} creado.`;
  } catch (error) {
    feedback.textContent = error instanceof TypeError ? 'No fue posible conectar con el backend.' : error instanceof Error ? error.message : 'No se pudo crear el agente.';
  } finally {
    createButton.disabled = false;
  }
}

async function sendMessage(event: SubmitEvent) {
  event.preventDefault();
  const threadId = selectedAgentId;
  const text = messageInput.value.trim();
  if (!threadId || !text) return;
  const conversation = getConversation(threadId);
  if (conversation.pending) return;

  if (!conversations.startTurn(threadId, text)) return;
  messageInput.value = '';
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

createButton.addEventListener('click', requestAgent);
messageForm.addEventListener('submit', sendMessage);
closeChat.addEventListener('click', closeConversation);
