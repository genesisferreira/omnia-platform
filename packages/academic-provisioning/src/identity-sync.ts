import type { IdentityLinkPort } from './ports';
import type { IdentityLookupResult } from './types';

/**
 * Deduplicação de identidade Omnia ↔ Moodle.
 * Em dry-run: apenas consulta links ativos existentes; não cria IdentityLink.
 */
export class IdentitySync {
  constructor(private readonly links: IdentityLinkPort) {}

  async resolveExisting(omniaUserId: string): Promise<IdentityLookupResult> {
    if (!omniaUserId?.trim()) {
      return { exists: false };
    }
    return this.links.findActive(omniaUserId.trim());
  }

  /**
   * Se já existe link ativo, retorna moodleUserId para no-op idempotente.
   */
  async shouldSkipCreate(omniaUserId: string): Promise<{
    skip: boolean;
    moodleUserId?: number | null;
    reason?: string;
  }> {
    const link = await this.resolveExisting(omniaUserId);
    if (link.exists && link.moodleUserId != null) {
      return {
        skip: true,
        moodleUserId: link.moodleUserId,
        reason: 'identity_link_already_active',
      };
    }
    return { skip: false };
  }
}
