import { ConflictError, NotFoundError, ValidationError } from '../core/errors.js';

export type AgentId = string;
export type CommunicationEdgeId = string;

export interface AgentNode {
  id: AgentId;
  level: number;
  parentEdgeId: CommunicationEdgeId | null;
  /** Connection order. The orchestrator reads this array in reverse for LIFO. */
  childEdgeIds: CommunicationEdgeId[];
}

export interface CommunicationEdge {
  id: CommunicationEdgeId;
  bossId: AgentId;
  subordinateId: AgentId;
  stackPosition: number;
  maxConversations: number;
}

export interface AgentRelations {
  agentId: AgentId;
  level: number;
  bossId: AgentId | null;
  /** Oldest connection first. */
  subordinateIds: AgentId[];
  /** The order in which the orchestrator activates subordinates. */
  subordinateIdsLifo: AgentId[];
}

export interface AttachSubordinateInput {
  edgeId: CommunicationEdgeId;
  bossId: AgentId;
  subordinateId: AgentId;
  maxConversations?: number;
}

function requiredId(value: string, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ValidationError(`${field} debe contener un identificador.`, 'AGENT_TREE_ID_REQUIRED');
  }
  return value.trim();
}

function conversationLimit(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new ValidationError(
      'maxConversations debe ser un entero mayor o igual que 1.',
      'AGENT_TREE_CONVERSATION_LIMIT_INVALID',
    );
  }
  return value;
}

/**
 * Mutable builder for a strict rooted tree.
 *
 * Nodes can only enter through addRoot or attachSubordinate, so a non-root node
 * can never have two bosses and its level is always its boss level plus one.
 */
export class AgentTree {
  private readonly nodes = new Map<AgentId, AgentNode>();
  private readonly edges = new Map<CommunicationEdgeId, CommunicationEdge>();
  private rootId: AgentId | null = null;
  private nextStackPosition = 0;

  addRoot(rawAgentId: AgentId): AgentNode {
    const agentId = requiredId(rawAgentId, 'agentId');
    if (this.rootId !== null) {
      throw new ConflictError('El árbol ya tiene un jefe inicial.', 'AGENT_TREE_ROOT_EXISTS');
    }
    if (this.nodes.has(agentId)) {
      throw new ConflictError('El agente ya pertenece al árbol.', 'AGENT_TREE_AGENT_EXISTS');
    }

    const root: AgentNode = {
      id: agentId,
      level: 0,
      parentEdgeId: null,
      childEdgeIds: [],
    };
    this.nodes.set(agentId, root);
    this.rootId = agentId;
    return this.cloneNode(root);
  }

  attachSubordinate(input: AttachSubordinateInput): CommunicationEdge {
    const edgeId = requiredId(input.edgeId, 'edgeId');
    const bossId = requiredId(input.bossId, 'bossId');
    const subordinateId = requiredId(input.subordinateId, 'subordinateId');
    const maxConversations = conversationLimit(input.maxConversations ?? 1);

    if (bossId === subordinateId) {
      throw new ValidationError(
        'Un agente no puede ser su propio subordinado.',
        'AGENT_TREE_SELF_CONNECTION',
      );
    }
    if (this.edges.has(edgeId)) {
      throw new ConflictError('La conexión ya existe.', 'AGENT_TREE_EDGE_EXISTS');
    }

    const boss = this.nodes.get(bossId);
    if (!boss) {
      throw new NotFoundError(
        'El jefe debe pertenecer al árbol antes de conectar un subordinado.',
        'AGENT_TREE_BOSS_NOT_FOUND',
      );
    }
    if (this.nodes.has(subordinateId)) {
      throw new ConflictError(
        'El subordinado ya pertenece al árbol y no puede tener otro jefe.',
        'AGENT_TREE_SUBORDINATE_ALREADY_ATTACHED',
      );
    }

    const edge: CommunicationEdge = {
      id: edgeId,
      bossId,
      subordinateId,
      stackPosition: this.nextStackPosition++,
      maxConversations,
    };
    const subordinate: AgentNode = {
      id: subordinateId,
      level: boss.level + 1,
      parentEdgeId: edgeId,
      childEdgeIds: [],
    };

    this.edges.set(edgeId, edge);
    this.nodes.set(subordinateId, subordinate);
    boss.childEdgeIds.push(edgeId);
    return { ...edge };
  }

  getRootId(): AgentId {
    if (this.rootId === null) {
      throw new ValidationError('El árbol todavía no tiene un jefe inicial.', 'AGENT_TREE_ROOT_REQUIRED');
    }
    return this.rootId;
  }

  getNode(agentId: AgentId): AgentNode {
    const node = this.nodes.get(agentId);
    if (!node) {
      throw new NotFoundError('El agente no pertenece al árbol.', 'AGENT_TREE_AGENT_NOT_FOUND');
    }
    return this.cloneNode(node);
  }

  getEdge(edgeId: CommunicationEdgeId): CommunicationEdge {
    const edge = this.edges.get(edgeId);
    if (!edge) {
      throw new NotFoundError('La conexión no pertenece al árbol.', 'AGENT_TREE_EDGE_NOT_FOUND');
    }
    return { ...edge };
  }

  getChildEdgesLifo(agentId: AgentId): CommunicationEdge[] {
    const node = this.getNode(agentId);
    return [...node.childEdgeIds]
      .reverse()
      .map((edgeId) => this.getEdge(edgeId));
  }

  getRelations(agentId: AgentId): AgentRelations {
    const node = this.getNode(agentId);
    const bossId = node.parentEdgeId === null
      ? null
      : this.getEdge(node.parentEdgeId).bossId;
    const subordinateIds = node.childEdgeIds.map(
      (edgeId) => this.getEdge(edgeId).subordinateId,
    );

    return {
      agentId: node.id,
      level: node.level,
      bossId,
      subordinateIds,
      subordinateIdsLifo: [...subordinateIds].reverse(),
    };
  }

  listNodes(): AgentNode[] {
    return [...this.nodes.values()].map((node) => this.cloneNode(node));
  }

  listEdges(): CommunicationEdge[] {
    return [...this.edges.values()].map((edge) => ({ ...edge }));
  }

  private cloneNode(node: AgentNode): AgentNode {
    return { ...node, childEdgeIds: [...node.childEdgeIds] };
  }
}
