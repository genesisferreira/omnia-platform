/** Tipos do pipeline Knowledge Intelligence (sem embeddings). */

export const KI_RESOURCE_TYPES = [
  'pdf',
  'txt',
  'markdown',
  'docx',
  'pptx',
  'html',
  'video_transcript',
  'ocr',
] as const;
export type KiResourceType = (typeof KI_RESOURCE_TYPES)[number];

/** Formatos com extractor implementado nesta entrega. */
export const KI_SUPPORTED_EXTRACT_TYPES = ['pdf', 'txt', 'markdown'] as const;
export type KiSupportedExtractType = (typeof KI_SUPPORTED_EXTRACT_TYPES)[number];

export const KI_PROCESSING_STATUSES = [
  'pending',
  'extracting',
  'normalizing',
  'chunking',
  'indexing_hub',
  'queued',
  'completed',
  'failed',
] as const;
export type KiProcessingStatus = (typeof KI_PROCESSING_STATUSES)[number];

export const KI_QUEUE_STATUSES = ['pending', 'processing', 'completed', 'failed'] as const;
export type KiQueueStatus = (typeof KI_QUEUE_STATUSES)[number];

export const KI_RUN_STATUSES = ['pending', 'running', 'completed', 'failed'] as const;
export type KiRunStatus = (typeof KI_RUN_STATUSES)[number];

export type ExtractMeta = {
  pages: number | null;
  byteSize: number;
  language: string | null;
  checksum: string;
  encoding: string;
  mimeType: string | null;
  filename: string | null;
};

export type ExtractResult = {
  text: string;
  meta: ExtractMeta;
};

export type ChunkConfig = {
  /** Tamanho alvo em caracteres (~4 chars/token). */
  maxChars: number;
  overlapChars: number;
};

export const DEFAULT_CHUNK_CONFIG: ChunkConfig = {
  maxChars: 1200,
  overlapChars: 150,
};

export type TextChunk = {
  chunkIndex: number;
  chunkText: string;
  tokenEstimate: number;
  startOffset: number;
  endOffset: number;
};

export type ChunkProvenance = {
  courseId?: string | number | null;
  moduleId?: string | number | null;
  lessonId?: string | number | null;
  learningResourceId?: string | number | null;
  ownerCompanyId?: string | number | null;
  instructorId?: string | number | null;
  language?: string | null;
  version?: string | null;
  tags?: string[];
  category?: string | null;
};

export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}

export function isSupportedExtractType(value: string): value is KiSupportedExtractType {
  return (KI_SUPPORTED_EXTRACT_TYPES as readonly string[]).includes(value);
}
