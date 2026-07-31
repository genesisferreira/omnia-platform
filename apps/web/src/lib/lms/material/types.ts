/**
 * Material Experience — tipos canônicos (Épico C).
 * Nunca acoplar a payloads Moodle brutos.
 */

export type MaterialType =
  | 'text'
  | 'html'
  | 'image'
  | 'pdf'
  | 'video'
  | 'h5p'
  | 'external_link'
  | 'file'
  | 'unknown';

export type MaterialUiState =
  | 'loading'
  | 'skeleton'
  | 'error'
  | 'offline'
  | 'forbidden'
  | 'blocked'
  | 'unavailable'
  | 'empty'
  | 'ready';

export type MaterialPermissions = {
  canView: boolean;
  canDownload: boolean;
  canComplete: boolean;
  reason?: string;
};

export type MaterialMetadata = {
  id: string;
  name: string;
  type: MaterialType;
  description?: string | null;
  sizeBytes?: number | null;
  estimatedMinutes?: number | null;
  lastAccessedAt?: string | null;
  statusLabel: string;
  mimeType?: string | null;
};

export type MaterialSource = {
  /** Conteúdo textual ou HTML (já sanitizado na borda se HTML). */
  body?: string | null;
  /** URL externa autorizada (nunca Moodle). */
  externalUrl?: string | null;
  /** Preview URL futura (signed) — null no MVP. */
  previewUrl?: string | null;
  /** Asset id futuro para Media Authorization. */
  assetId?: string | null;
};

export type MaterialDescriptor = {
  id: string;
  courseId: number;
  activityId: number;
  sectionId?: number | null;
  type: MaterialType;
  metadata: MaterialMetadata;
  source: MaterialSource;
  permissions: MaterialPermissions;
  /** Mensagem de fallback / placeholder. */
  fallbackMessage?: string | null;
};

export type ResolvedMaterial = MaterialDescriptor & {
  state: MaterialUiState;
  rendererKey: MaterialType;
  previewAvailable: boolean;
};

export type MaterialRendererKey = MaterialType;
