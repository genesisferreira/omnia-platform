/** Knowledge Hub domain constants — no LLM / embeddings. */

export const KNOWLEDGE_STATUSES = [
  'draft',
  'in_review',
  'approved',
  'processing',
  'indexed',
  'published',
  'rejected',
  'archived',
  'expired',
  'processing_failed',
  'suspended',
] as const;
export type KnowledgeStatus = (typeof KNOWLEDGE_STATUSES)[number];

export const PUBLICATION_STATUSES = ['unpublished', 'published', 'archived'] as const;
export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number];

export const PROCESSING_STATUSES = [
  'idle',
  'queued',
  'running',
  'succeeded',
  'failed',
  'not_implemented',
  'controlled_mock',
] as const;
export type ProcessingStatus = (typeof PROCESSING_STATUSES)[number];

export const SECURITY_CLASSIFICATIONS = [
  'PUBLIC',
  'CLIENT_PARTNER',
  'STUDENT',
  'TEACHER_MANAGER',
  'INTERNAL_RESTRICTED',
] as const;
export type SecurityClassification = (typeof SECURITY_CLASSIFICATIONS)[number];

export const SOURCE_TYPES = [
  'rich_text',
  'markdown',
  'txt',
  'pdf',
  'docx',
  'image',
  'external_link',
  'blog_post',
  'course_ref',
  'lesson_ref',
  'technical_manual',
  'apostila',
  'procedure',
  'standard',
  'case_study',
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number];

export const KNOWLEDGE_AREAS = [
  'refrigeracao',
  'automacao',
  'eletrica',
  'eficiencia',
  'seguranca',
  'neurofrigo',
  'cursos',
  'institucional',
  'comercial',
  'engenharia',
  'marketing',
] as const;
export type KnowledgeArea = (typeof KNOWLEDGE_AREAS)[number];

export const TECHNICAL_RISK_LEVELS = ['low', 'medium', 'high', 'critical'] as const;
export type TechnicalRiskLevel = (typeof TECHNICAL_RISK_LEVELS)[number];

export const PROCESSING_OPERATIONS = [
  'extract',
  'clean',
  'classify',
  'chunk',
  'embed',
  'index',
  'deindex',
  'reindex',
  'archive',
] as const;
export type ProcessingOperation = (typeof PROCESSING_OPERATIONS)[number];

export const AGENT_KEYS = [
  'concierge',
  'tutor',
  'refrigeration',
  'neurofrigo-technology',
  'electrical-controls',
  'evaluator',
  'radar',
  'projects-lab',
  'content-production',
  'commercial',
  'support',
  'command',
] as const;
export type AgentKey = (typeof AGENT_KEYS)[number];

export const SUGGESTED_CATEGORY_NAMES = [
  'Refrigeração Industrial',
  'Refrigeração Comercial',
  'CO₂',
  'Amônia',
  'Túneis de Congelamento',
  'Câmaras Frigoríficas',
  'Compressores',
  'Automação',
  'Elétrica Industrial',
  'Comandos Elétricos',
  'CLP',
  'SCADA',
  'Instrumentação',
  'Modbus',
  'BACnet',
  'OPC-UA',
  'Eficiência Energética',
  'Segurança',
  'Neurofrigo',
  'Cursos',
  'Institucional',
  'Comercial',
  'Engenharia',
  'Marketing',
] as const;

/** Chat público / Tutor nunca recebe INTERNAL_RESTRICTED. */
export const CHAT_FORBIDDEN_CLASSIFICATIONS: readonly SecurityClassification[] = [
  'INTERNAL_RESTRICTED',
];

export const DEFAULT_COMMAND_ALLOWED_ROLES = ['super_admin'] as const;
