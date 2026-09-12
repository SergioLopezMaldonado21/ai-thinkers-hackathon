import {
  OPERATIONAL_ROLES,
  THINKING_ROLES,
  type AgentProfile,
  type OperationalRole,
  type ThinkingRole,
} from '../domain/agent-profile.js';
import { ValidationError } from '../core/errors.js';

export type CreateAgentRequest = AgentProfile;

export interface CreateAgentResponse {
  allowed: true;
  agent: {
    id: string;
    profile: AgentProfile;
  };
}

const MAX_SHORT_TEXT_LENGTH = 160;
const MAX_LONG_TEXT_LENGTH = 2_000;
const MAX_SKILLS = 20;

function objectField(payload: Record<string, unknown>, field: string): unknown {
  return Reflect.get(payload, field);
}

function requiredText(
  payload: Record<string, unknown>,
  field: string,
  maximumLength: number,
): string {
  const value = objectField(payload, field);
  if (typeof value !== 'string' || !value.trim()) {
    throw new ValidationError(`El campo ${field} es obligatorio.`, `${field.toUpperCase()}_REQUIRED`);
  }
  const normalized = value.trim();
  if (normalized.length > maximumLength) {
    throw new ValidationError(
      `El campo ${field} no puede superar ${maximumLength} caracteres.`,
      `${field.toUpperCase()}_TOO_LONG`,
    );
  }
  return normalized;
}

function requiredRole<T extends string>(
  payload: Record<string, unknown>,
  field: string,
  allowedValues: readonly T[],
): T {
  const value = objectField(payload, field);
  if (typeof value !== 'string' || !allowedValues.includes(value as T)) {
    throw new ValidationError(`El campo ${field} no contiene un rol válido.`, `${field.toUpperCase()}_INVALID`);
  }
  return value as T;
}

function requiredSkills(payload: Record<string, unknown>): string[] {
  const value = objectField(payload, 'skills');
  if (!Array.isArray(value) || value.length === 0) {
    throw new ValidationError('El campo skills debe incluir al menos una habilidad.', 'SKILLS_REQUIRED');
  }
  if (value.length > MAX_SKILLS) {
    throw new ValidationError(`El campo skills no puede superar ${MAX_SKILLS} elementos.`, 'SKILLS_TOO_MANY');
  }

  return value.map((skill) => {
    if (typeof skill !== 'string' || !skill.trim()) {
      throw new ValidationError('Cada habilidad debe contener texto.', 'SKILL_REQUIRED');
    }
    const normalized = skill.trim();
    if (normalized.length > MAX_SHORT_TEXT_LENGTH) {
      throw new ValidationError(
        `Cada habilidad no puede superar ${MAX_SHORT_TEXT_LENGTH} caracteres.`,
        'SKILL_TOO_LONG',
      );
    }
    return normalized;
  });
}

/** Validates the public POST /api/chats request contract. */
export function parseCreateAgentRequest(payload: unknown): CreateAgentRequest {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    throw new ValidationError('El cuerpo debe ser un objeto JSON.', 'CREATE_AGENT_BODY_INVALID');
  }
  const fields = payload as Record<string, unknown>;
  return {
    name: requiredText(fields, 'name', MAX_SHORT_TEXT_LENGTH),
    position: requiredText(fields, 'position', MAX_SHORT_TEXT_LENGTH),
    responsibilities: requiredText(fields, 'responsibilities', MAX_LONG_TEXT_LENGTH),
    limitations: requiredText(fields, 'limitations', MAX_LONG_TEXT_LENGTH),
    deliverables: requiredText(fields, 'deliverables', MAX_LONG_TEXT_LENGTH),
    skills: requiredSkills(fields),
    operationalRole: requiredRole<OperationalRole>(fields, 'operationalRole', OPERATIONAL_ROLES),
    thinkingRole: requiredRole<ThinkingRole>(fields, 'thinkingRole', THINKING_ROLES),
  };
}
