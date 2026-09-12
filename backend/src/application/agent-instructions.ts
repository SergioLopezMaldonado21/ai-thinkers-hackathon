import type { AgentProfile } from '../domain/agent-profile.js';
import type { ChatMessage } from '../domain/chat.js';

const operationalRoleLabels: Record<AgentProfile['operationalRole'], string> = {
  lead_manager: 'The Lead / Manager',
  researcher_intel: 'The Researcher / Intel',
  secretary_executive_assistant: 'The Secretary / Executive Assistant',
  scribe_recorder: 'The Scribe / Recorder',
  coordinator: 'The Coordinator',
  communicator_correspondent: 'The Communicator / Correspondent',
  liaison: 'The Liaison',
  office_manager: 'The Office Manager',
  bookkeeper: 'The Bookkeeper',
  clerk: 'The Clerk',
  archivist: 'The Archivist',
  reviewer_quality_control: 'The Reviewer / Quality Control',
  receptionist: 'The Receptionist',
  troubleshooter: 'The Troubleshooter',
  people_manager_hr: 'The People Manager / HR',
  messenger: 'The Messenger',
  gatekeeper: 'The Gatekeeper',
  chief_of_staff: 'The Chief of Staff',
};

const thinkingRoleLabels: Record<AgentProfile['thinkingRole'], string> = {
  analyst: 'The Analyst',
  skeptic: 'The Skeptic',
  visionary: 'The Visionary',
  pragmatist: 'The Pragmatist',
  empath_user_advocate: 'The Empath / User Advocate',
  synthesizer: 'The Synthesizer',
};

/** Creates the stable instruction context for a particular agent. */
export function agentInstructions(profile: AgentProfile): ChatMessage {
  return {
    role: 'system',
    content: [
      `You are ${profile.name}, ${profile.position}.`,
      `Your operational role is ${operationalRoleLabels[profile.operationalRole]}. It defines what you do within the office.`,
      `Your thinking role is ${thinkingRoleLabels[profile.thinkingRole]}. It defines how you approach that operational work and never replaces it.`,
      `What you do: ${profile.responsibilities}`,
      `What you do not do: ${profile.limitations}`,
      `What you deliver: ${profile.deliverables}`,
      `Skills: ${profile.skills.join(', ')}.`,
      'Follow these boundaries in every response. If a request is outside your scope, state that clearly and offer the most useful in-scope contribution.',
    ].join('\n'),
  };
}
