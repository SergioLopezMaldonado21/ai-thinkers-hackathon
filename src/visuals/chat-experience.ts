import type { Conversation } from '../conversation-store';
import './chat-experience.css';

/** Presentation only: the office keeps ownership of agents, requests and histories. */
type ChatAgent = { id: string; profile: { name: string; position: string } };
type ChatViewState = {
  agents: readonly ChatAgent[];
  selectedAgentId: string | null;
  activeAgentIds?: ReadonlySet<string>;
  loading?: boolean;
  historyError?: string;
};
type ChatExperienceOptions = {
  panel: HTMLElement;
  messages: HTMLElement;
  input: HTMLInputElement | HTMLTextAreaElement;
  getConversation: (agentId: string) => Conversation;
  onSelectAgent: (agentId: string) => void;
  onCreateAgent: () => void;
  onClose: () => void;
  createAvatar?: (agentId: string, name: string) => HTMLElement;
};

function element<Tag extends keyof HTMLElementTagNameMap>(tag: Tag, className: string, text?: string) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const normalizeSearch = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function createChatExperience(options: ChatExperienceOptions) {
  const { panel, messages, input } = options;
  let state: ChatViewState = { agents: [], selectedAgentId: null };
  let messagesSignature = '';
  let choicesSignature = '';
  let headerSignature = '';
  let focusBeforeOpen: HTMLElement | null = null;

  const avatar = (agent: ChatAgent, className: string) => {
    const host = element('span', className);
    host.setAttribute('aria-hidden', 'true');
    if (options.createAvatar) host.append(options.createAvatar(agent.id, agent.profile.name));
    else host.append(element('span', 'chat-avatar-fallback', agent.profile.name.slice(0, 1).toUpperCase()));
    return host;
  };

  panel.classList.add('chat-experience');
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-labelledby', 'chat-title');
  panel.inert = true;
  messages.setAttribute('role', 'log');
  messages.setAttribute('aria-label', 'Mensajes de la conversación');
  messages.setAttribute('aria-relevant', 'additions text');
  const header = panel.querySelector<HTMLElement>('.chat-header')!;
  const heading = header.querySelector<HTMLElement>('div')!;
  heading.classList.add('chat-heading');
  const headerAvatar = element('span', 'chat-header-avatar');
  headerAvatar.setAttribute('aria-hidden', 'true');
  header.prepend(headerAvatar);
  const subtitle = element('p', 'chat-agent-subtitle');
  heading.append(subtitle);
  const headerActions = element('div', 'chat-header-actions');
  const chooseChat = element('button', 'chat-switch-button', 'Chats');
  chooseChat.type = 'button';
  chooseChat.setAttribute('aria-label', 'Elegir o iniciar una conversación');
  chooseChat.setAttribute('aria-haspopup', 'dialog');
  headerActions.append(chooseChat);
  const closeButton = header.querySelector<HTMLButtonElement>('#close-chat');
  if (closeButton) headerActions.append(closeButton);
  header.append(headerActions);

  const composerHint = element('p', 'chat-composer-hint', 'Enter para enviar · Conversación personal');
  panel.querySelector('.message-form')?.after(composerHint);

  const picker = element('dialog', 'chat-picker');
  picker.setAttribute('aria-labelledby', 'chat-picker-title');
  const pickerHeader = element('header', 'chat-picker-header');
  const pickerHeading = element('div', 'chat-picker-heading');
  pickerHeading.append(element('p', 'chat-picker-eyebrow', 'TU EQUIPO, A UNA CONVERSACIÓN'));
  const pickerTitle = element('h2', '', 'Empieza una conversación');
  pickerTitle.id = 'chat-picker-title';
  pickerHeading.append(pickerTitle);
  const pickerClose = element('button', 'chat-picker-close', '×');
  pickerClose.type = 'button';
  pickerClose.setAttribute('aria-label', 'Cerrar selector de conversaciones');
  pickerHeader.append(pickerHeading, pickerClose);
  const intro = element('p', 'chat-picker-intro', 'Elige a alguien de tu oficina. Su conversación y su historial te esperan aquí.');
  const searchLabel = element('label', 'chat-picker-search-label', 'Buscar agente');
  const search = element('input', 'chat-picker-search');
  search.type = 'search';
  search.placeholder = 'Nombre o puesto…';
  search.autocomplete = 'off';
  searchLabel.append(search);
  const choiceCount = element('p', 'chat-picker-count');
  choiceCount.setAttribute('role', 'status');
  const choices = element('div', 'chat-picker-list');
  choices.setAttribute('role', 'list');
  const pickerFooter = element('footer', 'chat-picker-footer');
  pickerFooter.append(element('span', '', '¿Necesitas otro talento?'));
  const createAgent = element('button', 'chat-picker-create', '+ Crear agente');
  createAgent.type = 'button';
  pickerFooter.append(createAgent);
  picker.append(pickerHeader, intro, searchLabel, choiceCount, choices, pickerFooter);
  document.body.append(picker);

  function renderChoices() {
    const searchText = normalizeSearch(search.value.trim());
    const filtered = state.agents.filter((agent) => normalizeSearch(`${agent.profile.name} ${agent.profile.position}`).includes(searchText));
    const signature = JSON.stringify([searchText, state.selectedAgentId, filtered.map((agent) => {
      const conversation = options.getConversation(agent.id);
      return [agent.id, agent.profile.name, agent.profile.position, conversation.pending || state.activeAgentIds?.has(agent.id), conversation.messages[conversation.messages.length - 1]];
    })]);
    if (signature === choicesSignature) return;
    choicesSignature = signature;
    const focusedId = choices.contains(document.activeElement)
      ? (document.activeElement as HTMLElement).dataset.chatAgentId : undefined;
    choices.replaceChildren();
    choiceCount.textContent = `${filtered.length} ${filtered.length === 1 ? 'agente disponible en tu oficina' : 'agentes disponibles en tu oficina'}`;
    if (!filtered.length) {
      const empty = element('div', 'chat-picker-empty');
      empty.append(
        element('span', 'chat-picker-empty-symbol', searchText ? '⌕' : '✦'),
        element('h3', '', searchText ? 'No encontramos ese agente' : 'Tu próxima idea empieza aquí'),
        element('p', '', searchText ? 'Prueba con otro nombre o puesto.' : 'Crea tu primer agente para empezar a conversar y trabajar juntos.'),
      );
      choices.append(empty);
      return;
    }
    for (const agent of filtered) {
      const conversation = options.getConversation(agent.id);
      const pending = conversation.pending || Boolean(state.activeAgentIds?.has(agent.id));
      const item = element('div', 'chat-picker-list-item');
      item.setAttribute('role', 'listitem');
      const button = element('button', 'chat-picker-agent');
      button.type = 'button';
      button.dataset.chatAgentId = agent.id;
      button.classList.toggle('is-selected', state.selectedAgentId === agent.id);
      if (state.selectedAgentId === agent.id) button.setAttribute('aria-current', 'true');
      const copy = element('span', 'chat-picker-agent-copy');
      copy.append(element('strong', 'chat-picker-agent-name', agent.profile.name));
      copy.append(element('span', 'chat-picker-agent-position', agent.profile.position));
      const lastMessage = conversation.messages[conversation.messages.length - 1];
      const preview = pending ? 'Trabajando…' : lastMessage
        ? `${lastMessage.role === 'user' ? 'Tú: ' : lastMessage.role === 'error' ? 'Error: ' : ''}${lastMessage.text}`
        : 'Inicia una conversación';
      copy.append(element('span', 'chat-picker-agent-preview', preview));
      const badge = element('span', `chat-picker-agent-status${pending ? ' is-working' : ''}`, pending ? 'En curso' : 'Abrir');
      button.append(avatar(agent, 'chat-picker-avatar'), copy, badge);
      button.addEventListener('click', () => {
        picker.close();
        options.onSelectAgent(agent.id);
      });
      item.append(button);
      choices.append(item);
    }
    if (focusedId && picker.open) {
      Array.from(choices.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.dataset.chatAgentId === focusedId)?.focus();
    }
  }

  function renderMessages(agent: ChatAgent, conversation: Conversation, changedAgent: boolean) {
    const pending = conversation.pending || Boolean(state.activeAgentIds?.has(agent.id));
    const signature = JSON.stringify([agent.id, agent.profile.name, conversation.messages, pending, state.loading, state.historyError]);
    if (signature === messagesSignature) return;
    messagesSignature = signature;
    const nearBottom = messages.scrollHeight - messages.scrollTop - messages.clientHeight < 90;
    messages.replaceChildren();
    if (state.loading) {
      const loading = element('p', 'chat-history-status', 'Cargando conversación…');
      loading.setAttribute('role', 'status');
      messages.append(loading);
    }
    if (state.historyError) {
      const error = element('p', 'chat-history-error', state.historyError);
      error.setAttribute('role', 'alert');
      messages.append(error);
    }
    if (!conversation.messages.length && !pending && !state.loading) {
      const empty = element('div', 'chat-welcome');
      empty.append(avatar(agent, 'chat-welcome-avatar'));
      empty.append(element('h3', '', `Hola, soy ${agent.profile.name}`));
      empty.append(element('p', '', agent.profile.position));
      empty.append(element('p', 'chat-welcome-caption', 'Cuéntame qué tienes en mente y empezamos.'));
      const suggestions = element('div', 'chat-suggestions');
      for (const prompt of ['¿En qué puedes ayudarme?', 'Ayúdame a organizar una tarea']) {
        const button = element('button', 'chat-suggestion', prompt);
        button.type = 'button';
        button.addEventListener('click', () => {
          if (input.disabled) return;
          input.value = prompt;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.focus();
        });
        suggestions.append(button);
      }
      empty.append(suggestions);
      messages.append(empty);
    }
    for (const message of conversation.messages) {
      const item = element('div', `message ${message.role}`);
      item.append(element('span', 'chat-message-author', message.role === 'user' ? 'Tú' : message.role === 'error' ? 'No se pudo completar' : agent.profile.name));
      item.append(element('p', 'chat-message-text', message.text));
      messages.append(item);
    }
    if (pending) {
      const thinking = element('div', 'message agent pending chat-thinking');
      thinking.setAttribute('role', 'status');
      thinking.append(element('span', '', conversation.pending ? `${agent.profile.name} está respondiendo` : `${agent.profile.name} está trabajando`));
      const dots = element('span', 'chat-thinking-dots');
      dots.setAttribute('aria-hidden', 'true');
      dots.append(element('i', ''), element('i', ''), element('i', ''));
      thinking.append(dots);
      messages.append(thinking);
    }
    if (changedAgent || nearBottom) requestAnimationFrame(() => { messages.scrollTop = messages.scrollHeight; });
  }

  function update(nextState: ChatViewState) {
    const changedAgent = nextState.selectedAgentId !== state.selectedAgentId;
    if (changedAgent && nextState.selectedAgentId && !state.selectedAgentId) {
      focusBeforeOpen = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    }
    state = nextState;
    panel.inert = !state.selectedAgentId;
    const agent = state.agents.find((candidate) => candidate.id === state.selectedAgentId);
    if (agent) {
      const conversation = options.getConversation(agent.id);
      const pending = conversation.pending || Boolean(state.activeAgentIds?.has(agent.id));
      const nextHeaderSignature = JSON.stringify([agent.id, agent.profile.name, agent.profile.position]);
      if (headerSignature !== nextHeaderSignature) {
        headerSignature = nextHeaderSignature;
        headerAvatar.replaceChildren(avatar(agent, 'chat-current-avatar'));
        panel.querySelector<HTMLElement>('#chat-title')!.textContent = agent.profile.name;
      }
      subtitle.textContent = pending ? 'Trabajando contigo…' : agent.profile.position;
      subtitle.classList.toggle('is-working', pending);
      renderMessages(agent, conversation, changedAgent);
    } else {
      messagesSignature = '';
      if (changedAgent && focusBeforeOpen?.isConnected) focusBeforeOpen.focus();
    }
    if (picker.open) renderChoices();
  }

  function openPicker() {
    if (picker.open) return;
    search.value = '';
    choicesSignature = '';
    renderChoices();
    picker.showModal();
    search.focus();
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && state.selectedAgentId && !event.defaultPrevented && !document.querySelector('dialog[open]')) {
      event.preventDefault();
      options.onClose();
    }
  };
  chooseChat.addEventListener('click', openPicker);
  pickerClose.addEventListener('click', () => picker.close());
  search.addEventListener('input', renderChoices);
  createAgent.addEventListener('click', () => {
    picker.close();
    options.onCreateAgent();
  });
  document.addEventListener('keydown', onKeyDown);

  return {
    update,
    openPicker,
    destroy() {
      document.removeEventListener('keydown', onKeyDown);
      picker.remove();
    },
  };
}
