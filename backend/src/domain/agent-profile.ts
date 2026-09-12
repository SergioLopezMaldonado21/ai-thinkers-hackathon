export const OPERATIONAL_ROLES = [
  'lead_manager',
  'researcher_intel',
  'secretary_executive_assistant',
  'scribe_recorder',
  'coordinator',
  'communicator_correspondent',
  'liaison',
  'office_manager',
  'bookkeeper',
  'clerk',
  'archivist',
  'reviewer_quality_control',
  'receptionist',
  'troubleshooter',
  'people_manager_hr',
  'messenger',
  'gatekeeper',
  'chief_of_staff',
] as const;

export const THINKING_ROLES = [
  'analyst',
  'skeptic',
  'visionary',
  'pragmatist',
  'empath_user_advocate',
  'synthesizer',
] as const;

export type OperationalRole = (typeof OPERATIONAL_ROLES)[number];
export type ThinkingRole = (typeof THINKING_ROLES)[number];

/**
 * Immutable configuration supplied when an agent is created. The operational
 * and thinking role identifiers map one-to-one to Descriptions/*.md.txt.
 */
export interface AgentProfile {
  name: string;
  position: string;
  responsibilities: string;
  limitations: string;
  deliverables: string;
  skills: string[];
  operationalRole: OperationalRole;
  thinkingRole: ThinkingRole;
}
