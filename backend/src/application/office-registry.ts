import type { ChatCompletionGateway } from '../domain/chat.js';
import { ConflictError, NotFoundError, ValidationError } from '../core/errors.js';
import { ConversationService, type IdFactory } from './conversation-service.js';
import { OfficeCoordinationService } from './office-coordination-service.js';

export interface OfficeMetadata {
  id: string;
  name: string;
  emoji: string;
  description: string;
  createdAt: string;
}

export interface OfficeContext {
  metadata: OfficeMetadata;
  conversations: ConversationService;
  office: OfficeCoordinationService;
}

const DEFAULT_OFFICE_ID = 'default';

function requiredText(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new ValidationError(`El campo ${field} es obligatorio.`, `${field.toUpperCase()}_REQUIRED`);
  }
  if (value.trim().length > maxLength) {
    throw new ValidationError(`El campo ${field} no puede superar ${maxLength} caracteres.`, `${field.toUpperCase()}_TOO_LONG`);
  }
  return value.trim();
}

/** Owns one isolated conversation and coordination context per office. */
export class OfficeRegistry {
  private readonly offices = new Map<string, OfficeContext>();

  constructor(
    private readonly completionGateway: ChatCompletionGateway,
    private readonly createId: IdFactory,
  ) {
    this.add({
      id: DEFAULT_OFFICE_ID,
      name: 'Mi oficina',
      emoji: '🏢',
      description: 'Tu oficina principal',
      createdAt: new Date().toISOString(),
    });
  }

  get defaultOfficeId(): string {
    return DEFAULT_OFFICE_ID;
  }

  list(): OfficeMetadata[] {
    return [...this.offices.values()].map(({ metadata }) => structuredClone(metadata));
  }

  get(officeId: string): OfficeContext {
    const context = this.offices.get(officeId);
    if (!context) throw new NotFoundError('La oficina no existe.', 'OFFICE_NOT_FOUND');
    return context;
  }

  create(payload: unknown): OfficeContext {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new ValidationError('Se requieren los datos de la oficina.', 'OFFICE_INVALID');
    }
    const input = payload as Record<string, unknown>;
    const name = requiredText(input.name, 'name', 80);
    const duplicate = this.list().some((office) => office.name.localeCompare(name, 'es', { sensitivity: 'accent' }) === 0);
    if (duplicate) throw new ConflictError('Ya existe una oficina con ese nombre.', 'OFFICE_NAME_EXISTS');
    const emoji = typeof input.emoji === 'string' && input.emoji.trim() ? input.emoji.trim().slice(0, 8) : '🏢';
    const description = typeof input.description === 'string' ? input.description.trim().slice(0, 240) : '';
    return this.add({ id: `office_${this.createId()}`, name, emoji, description, createdAt: new Date().toISOString() });
  }

  private add(metadata: OfficeMetadata): OfficeContext {
    const conversations = new ConversationService(this.completionGateway, this.createId);
    const context = { metadata, conversations, office: new OfficeCoordinationService(conversations, this.createId) };
    this.offices.set(metadata.id, context);
    return context;
  }
}
