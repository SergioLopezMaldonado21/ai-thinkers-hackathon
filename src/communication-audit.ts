import './communication-audit.css';

export interface Communication {
  id: string;
  runId: string;
  edgeId: string;
  bossId: string;
  subordinateId: string;
  round: number;
  request: string;
  response: string | null;
  status: 'pending' | 'completed' | 'error';
  startedAt: string;
  completedAt: string | null;
}

export interface OfficeSnapshot {
  agents: Array<{ id: string; profile: { name: string } }>;
  communications: Communication[];
}

let instanceCount = 0;

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function timestamp(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Hora no disponible' : date.toLocaleString('es-MX');
}

/** Read-only audit of actual delegated messages, independent of personal chats. */
export function createCommunicationAudit(): {
  open(bossId: string, subordinateId: string): void;
  update(snapshot: OfficeSnapshot): void;
  close(): void;
} {
  const instanceId = ++instanceCount;
  const dialog = element('dialog', 'communication-audit');
  const header = element('header', 'communication-audit-header');
  const headingGroup = element('div', 'communication-audit-heading');
  const eyebrow = element('p', 'communication-audit-eyebrow', 'AUDITORÍA ENTRE AGENTES');
  const title = element('h2', 'communication-audit-title', 'Comunicación');
  title.id = `communication-audit-title-${instanceId}`;
  const subtitle = element('p', 'communication-audit-subtitle', 'Solicitudes del jefe y respuestas del subordinado. Solo lectura.');
  subtitle.id = `communication-audit-description-${instanceId}`;
  dialog.setAttribute('aria-labelledby', title.id);
  dialog.setAttribute('aria-describedby', subtitle.id);
  const closeButton = element('button', 'communication-audit-close', '×');
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', 'Cerrar auditoría de comunicación');
  closeButton.autofocus = true;
  const summary = element('p', 'communication-audit-summary');
  summary.setAttribute('role', 'status');
  summary.setAttribute('aria-live', 'polite');
  const messages = element('div', 'communication-audit-messages');
  messages.tabIndex = 0;
  messages.setAttribute('role', 'region');
  messages.setAttribute('aria-label', 'Historial de comunicación entre agentes');
  headingGroup.append(eyebrow, title, subtitle);
  header.append(headingGroup, closeButton);
  dialog.append(header, summary, messages);
  document.body.append(dialog);

  let snapshot: OfficeSnapshot | null = null;
  let selected: { bossId: string; subordinateId: string } | null = null;
  let previousSignature = '';

  function name(agentId: string): string {
    return snapshot?.agents.find((agent) => agent.id === agentId)?.profile.name || agentId;
  }

  function render(resetScroll = false): void {
    if (!selected) return;
    const bossName = name(selected.bossId);
    const subordinateName = name(selected.subordinateId);
    title.textContent = `${bossName} → ${subordinateName}`;
    const exchanges = snapshot?.communications
      .filter((entry) => entry.bossId === selected!.bossId && entry.subordinateId === selected!.subordinateId)
      .slice()
      .sort((a, b) => a.startedAt.localeCompare(b.startedAt)) ?? [];
    const signature = JSON.stringify([snapshot !== null, selected, bossName, subordinateName, exchanges]);
    if (signature === previousSignature && !resetScroll) return;
    previousSignature = signature;
    const oldScroll = messages.scrollTop;
    const atBottom = messages.scrollHeight - messages.clientHeight - oldScroll < 48;
    const fragment = document.createDocumentFragment();

    if (snapshot === null) {
      summary.textContent = 'Esperando el historial de la oficina…';
      fragment.append(element('p', 'communication-audit-empty', 'Cargando comunicaciones…'));
    } else if (exchanges.length === 0) {
      summary.textContent = '0 intercambios registrados';
      fragment.append(element('p', 'communication-audit-empty', 'Todavía no hay mensajes entre estos dos agentes. Aparecerán aquí cuando se consulten.'));
    } else {
      const pendingCount = exchanges.filter((entry) => entry.status === 'pending').length;
      summary.textContent = `${exchanges.length} intercambio${exchanges.length === 1 ? '' : 's'} registrado${exchanges.length === 1 ? '' : 's'} · ${pendingCount} pendiente${pendingCount === 1 ? '' : 's'}`;
      const runs = new Map<string, Communication[]>();
      for (const entry of exchanges) {
        const run = runs.get(entry.runId) ?? [];
        run.push(entry);
        runs.set(entry.runId, run);
      }
      for (const [runId, entries] of runs) {
        const run = element('section', 'communication-audit-run');
        run.append(element('h3', 'communication-audit-run-title', `Solicitud · ${runId}`));
        for (const entry of entries) {
          const exchange = element('article', 'communication-audit-exchange');
          const meta = element('div', 'communication-audit-meta');
          const statusLabels = { pending: 'Esperando respuesta', completed: 'Completado', error: 'Error' };
          meta.append(
            element('span', 'communication-audit-round', `Ronda ${entry.round}`),
            element('span', `communication-audit-status is-${entry.status}`, statusLabels[entry.status]),
          );
          const request = element('div', 'communication-audit-message is-request');
          request.append(
            element('h4', 'communication-audit-speaker', `${bossName} → ${subordinateName}`),
            element('p', 'communication-audit-text', entry.request),
            element('p', 'communication-audit-time', timestamp(entry.startedAt)),
          );
          const response = element('div', `communication-audit-message is-response${entry.status === 'error' ? ' is-error' : ''}`);
          response.append(
            element('h4', 'communication-audit-speaker', `${subordinateName} → ${bossName}`),
            element('p', 'communication-audit-text', entry.response ?? (entry.status === 'pending'
              ? 'Esperando respuesta del subordinado…'
              : entry.status === 'error' ? 'La consulta terminó con un error y no tiene respuesta registrada.' : 'Sin contenido de respuesta registrado.')),
          );
          if (entry.completedAt) response.append(element('p', 'communication-audit-time', timestamp(entry.completedAt)));
          exchange.append(meta, request, response);
          run.append(exchange);
        }
        fragment.append(run);
      }
    }

    messages.replaceChildren(fragment);
    // Keep the reader's place when polling updates an earlier exchange.
    messages.scrollTop = resetScroll || atBottom ? messages.scrollHeight : oldScroll;
  }

  function close(): void {
    if (dialog.open) dialog.close();
  }

  closeButton.addEventListener('click', close);
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) close();
  });

  return {
    open(bossId, subordinateId) {
      const changed = selected?.bossId !== bossId || selected?.subordinateId !== subordinateId;
      selected = { bossId, subordinateId };
      if (!dialog.open) dialog.showModal();
      render(changed);
    },
    update(nextSnapshot) {
      snapshot = nextSnapshot;
      if (dialog.open) render();
    },
    close,
  };
}
