import type {
  AgentId,
  AgentTree,
  CommunicationEdge,
  CommunicationEdgeId,
} from '../domain/agent-tree.js';
import { ValidationError } from '../core/errors.js';

export type AgentReplyStatus = 'ok' | 'error';
export type EdgeExecutionStatus = 'ready' | 'waitingResponse' | 'answered' | 'closed';

export interface AgentReply {
  agentId: AgentId;
  status: AgentReplyStatus;
  content: string;
}

export interface AgentExecutorContext {
  runId: string;
  round: number;
  bossId: AgentId | null;
  subordinateReplies: readonly AgentReply[];
}

export interface AgentExecutor {
  execute(
    agentId: AgentId,
    request: string,
    context: AgentExecutorContext,
  ): Promise<string>;
}

export interface EdgeExecutionState {
  edgeId: CommunicationEdgeId;
  bossId: AgentId;
  subordinateId: AgentId;
  conversationsUsed: number;
  maxConversations: number;
  status: EdgeExecutionStatus;
  activeRequestId: string | null;
}

export interface ConversationRecord {
  requestId: string;
  runId: string;
  round: number;
  edgeId: CommunicationEdgeId;
  bossId: AgentId;
  subordinateId: AgentId;
  request: string;
  response: AgentReply;
}

export type OrchestratorEvent =
  | {
      type: 'agent.started' | 'agent.completed';
      runId: string;
      round: number;
      agentId: AgentId;
      bossId: AgentId | null;
    }
  | {
      type: 'conversation.requested';
      runId: string;
      round: number;
      requestId: string;
      edgeId: CommunicationEdgeId;
      bossId: AgentId;
      subordinateId: AgentId;
    }
  | {
      type: 'conversation.responded';
      runId: string;
      round: number;
      requestId: string;
      edgeId: CommunicationEdgeId;
      bossId: AgentId;
      subordinateId: AgentId;
      status: AgentReplyStatus;
    };

export interface AgentTreeRunOptions {
  /** Number of whole-tree refinement rounds requested by the caller. */
  rounds?: number;
  onEvent?: (event: OrchestratorEvent) => void;
}

export interface AgentTreeRunResult {
  runId: string;
  completedRounds: number;
  rootReply: AgentReply;
  conversations: ConversationRecord[];
  edges: EdgeExecutionState[];
}

export type OrchestratorIdFactory = () => string;

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'El agente terminó con un error desconocido.';
}

function positiveRounds(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new ValidationError(
      'rounds debe ser un entero mayor o igual que 1.',
      'AGENT_TREE_ROUNDS_INVALID',
    );
  }
  return value;
}

function childRequest(task: string, edge: CommunicationEdge, round: number): string {
  return [
    `Solicitud jerárquica de ${edge.bossId} para ${edge.subordinateId}.`,
    `Ronda ${round}.`,
    'Trabaja en el objetivo siguiente y responde únicamente a tu jefe directo:',
    task,
  ].join('\n');
}

function agentRequest(
  task: string,
  agentId: AgentId,
  subordinateReplies: readonly AgentReply[],
  round: number,
): string {
  if (subordinateReplies.length === 0) return task;

  const reports = subordinateReplies.map((reply) => [
    `Subordinado: ${reply.agentId}`,
    `Estado: ${reply.status}`,
    reply.content,
  ].join('\n')).join('\n\n');

  return [
    `Objetivo para ${agentId}, ronda ${round}:`,
    task,
    '',
    'Respuestas de tus subordinados directos:',
    reports,
    '',
    'Integra estas respuestas y produce una sola respuesta para tu jefe directo.',
  ].join('\n');
}

/** Executes a rooted agent tree with downward requests and upward responses. */
export class AgentTreeOrchestrator {
  constructor(
    private readonly tree: AgentTree,
    private readonly executor: AgentExecutor,
    private readonly createId: OrchestratorIdFactory,
  ) {}

  async run(rawTask: string, options: AgentTreeRunOptions = {}): Promise<AgentTreeRunResult> {
    if (typeof rawTask !== 'string' || !rawTask.trim()) {
      throw new ValidationError('La tarea debe contener texto.', 'AGENT_TREE_TASK_REQUIRED');
    }

    const task = rawTask.trim();
    const requestedRounds = positiveRounds(options.rounds ?? 1);
    const rootId = this.tree.getRootId();
    const runId = `run_${this.createId()}`;
    const conversations: ConversationRecord[] = [];
    const edgeStates = new Map<CommunicationEdgeId, EdgeExecutionState>(
      this.tree.listEdges().map((edge) => [edge.id, {
        edgeId: edge.id,
        bossId: edge.bossId,
        subordinateId: edge.subordinateId,
        conversationsUsed: 0,
        maxConversations: edge.maxConversations,
        status: 'ready',
        activeRequestId: null,
      }]),
    );

    let rootReply: AgentReply = {
      agentId: rootId,
      status: 'error',
      content: 'La ejecución no inició.',
    };
    let completedRounds = 0;

    for (let round = 1; round <= requestedRounds; round += 1) {
      if (round > 1 && !this.hasReachableBudget(rootId, edgeStates)) break;

      const roundTask = round === 1
        ? task
        : [
            task,
            '',
            `Ronda de refinamiento ${round}.`,
            'Resultado anterior del jefe inicial:',
            rootReply.content,
          ].join('\n');

      rootReply = await this.executeNode({
        agentId: rootId,
        bossId: null,
        task: roundTask,
        runId,
        round,
        edgeStates,
        conversations,
        onEvent: options.onEvent,
      });
      completedRounds = round;
    }

    return {
      runId,
      completedRounds,
      rootReply,
      conversations,
      edges: [...edgeStates.values()].map((edge) => ({ ...edge })),
    };
  }

  private async executeNode(input: {
    agentId: AgentId;
    bossId: AgentId | null;
    task: string;
    runId: string;
    round: number;
    edgeStates: Map<CommunicationEdgeId, EdgeExecutionState>;
    conversations: ConversationRecord[];
    onEvent?: (event: OrchestratorEvent) => void;
  }): Promise<AgentReply> {
    const {
      agentId,
      bossId,
      task,
      runId,
      round,
      edgeStates,
      conversations,
      onEvent,
    } = input;
    onEvent?.({ type: 'agent.started', runId, round, agentId, bossId });

    const subordinateReplies = await Promise.all(
      this.tree.getChildEdgesLifo(agentId).map(async (edge): Promise<AgentReply | null> => {
        const edgeState = edgeStates.get(edge.id);
        if (!edgeState || edgeState.conversationsUsed >= edgeState.maxConversations) {
          if (edgeState) edgeState.status = 'closed';
          return null;
        }

        const requestId = `request_${this.createId()}`;
        const request = childRequest(task, edge, round);
        edgeState.status = 'waitingResponse';
        edgeState.activeRequestId = requestId;
        onEvent?.({
          type: 'conversation.requested',
          runId,
          round,
          requestId,
          edgeId: edge.id,
          bossId: edge.bossId,
          subordinateId: edge.subordinateId,
        });

        const response = await this.executeNode({
          agentId: edge.subordinateId,
          bossId: edge.bossId,
          task: request,
          runId,
          round,
          edgeStates,
          conversations,
          onEvent,
        });

        edgeState.conversationsUsed += 1;
        edgeState.activeRequestId = null;
        edgeState.status = edgeState.conversationsUsed >= edgeState.maxConversations
          ? 'closed'
          : 'answered';
        conversations.push({
          requestId,
          runId,
          round,
          edgeId: edge.id,
          bossId: edge.bossId,
          subordinateId: edge.subordinateId,
          request,
          response,
        });
        onEvent?.({
          type: 'conversation.responded',
          runId,
          round,
          requestId,
          edgeId: edge.id,
          bossId: edge.bossId,
          subordinateId: edge.subordinateId,
          status: response.status,
        });
        return response;
      }),
    );

    const availableReplies = subordinateReplies.filter(
      (reply): reply is AgentReply => reply !== null,
    );
    let reply: AgentReply;
    try {
      const content = await this.executor.execute(
        agentId,
        agentRequest(task, agentId, availableReplies, round),
        { runId, round, bossId, subordinateReplies: availableReplies },
      );
      reply = {
        agentId,
        status: 'ok',
        content: content.trim() || 'El agente respondió sin contenido.',
      };
    } catch (error) {
      reply = { agentId, status: 'error', content: errorText(error) };
    }

    onEvent?.({ type: 'agent.completed', runId, round, agentId, bossId });
    return reply;
  }

  private hasReachableBudget(
    agentId: AgentId,
    edgeStates: ReadonlyMap<CommunicationEdgeId, EdgeExecutionState>,
  ): boolean {
    return this.tree.getChildEdgesLifo(agentId).some((edge) => {
      const state = edgeStates.get(edge.id);
      if (!state || state.conversationsUsed >= state.maxConversations) return false;
      return true;
    });
  }
}
