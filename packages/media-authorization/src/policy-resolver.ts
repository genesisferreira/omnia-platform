import type { MediaCapabilities, MediaContext, MediaPolicyInput, MediaPurpose } from './types';

export type ResolvedMediaPolicy = {
  capabilities: MediaCapabilities;
  watermarkRequired: boolean;
  ttlSeconds: number;
  policySource: 'global' | 'course' | 'material' | 'user' | 'controlled';
  denyReason?:
    | 'DENIED_DOWNLOAD_POLICY'
    | 'DENIED_PRINT_POLICY'
    | 'DENIED_SHARE_POLICY'
    | 'DENIED_VIEW_POLICY'
    | 'DENIED_ROLE'
    | 'DENIED_MISSING_CONTEXT';
};

/**
 * Resolve capacidades a partir da política efetiva (material > curso > global).
 * Download/print/share negados por default corporativo (D007).
 */
export class MediaPolicyResolver {
  resolve(context: MediaContext, policy: MediaPolicyInput): ResolvedMediaPolicy {
    if (!context.omniaUserId?.trim() || !context.assetId?.trim()) {
      return {
        capabilities: { canView: false, canDownload: false, canPrint: false, canShare: false },
        watermarkRequired: true,
        ttlSeconds: policy.mediaTtlSeconds || 300,
        policySource: 'controlled',
        denyReason: 'DENIED_MISSING_CONTEXT',
      };
    }

    if (policy.forceDenyView) {
      return {
        capabilities: { canView: false, canDownload: false, canPrint: false, canShare: false },
        watermarkRequired: true,
        ttlSeconds: policy.mediaTtlSeconds || 300,
        policySource: 'material',
        denyReason: 'DENIED_VIEW_POLICY',
      };
    }

    const downloadsAllowed =
      policy.materialDownloadsAllowed != null
        ? policy.materialDownloadsAllowed
        : policy.downloadsAllowed;

    const canPrint = policy.materialCanPrint === true;
    const canShare = policy.materialCanShare === true;

    const capabilities: MediaCapabilities = Object.freeze({
      canView: true,
      canDownload: Boolean(downloadsAllowed),
      canPrint,
      canShare,
    });

    const purposeDeny = this.denyForPurpose(context.purpose, capabilities);
    if (purposeDeny) {
      return {
        capabilities,
        watermarkRequired: policy.watermarkEnabled !== false,
        ttlSeconds: Math.max(30, policy.mediaTtlSeconds || 300),
        policySource:
          policy.materialDownloadsAllowed != null ||
          policy.materialCanPrint != null ||
          policy.materialCanShare != null
            ? 'material'
            : 'global',
        denyReason: purposeDeny,
      };
    }

    return {
      capabilities,
      watermarkRequired: policy.watermarkEnabled !== false,
      ttlSeconds: Math.max(30, policy.mediaTtlSeconds || 300),
      policySource:
        policy.materialDownloadsAllowed != null ||
        policy.materialCanPrint != null ||
        policy.materialCanShare != null
          ? 'material'
          : 'global',
    };
  }

  private denyForPurpose(
    purpose: MediaPurpose,
    caps: MediaCapabilities,
  ): ResolvedMediaPolicy['denyReason'] | undefined {
    if (purpose === 'download' && !caps.canDownload) return 'DENIED_DOWNLOAD_POLICY';
    if (purpose === 'print' && !caps.canPrint) return 'DENIED_PRINT_POLICY';
    if (purpose === 'share' && !caps.canShare) return 'DENIED_SHARE_POLICY';
    if ((purpose === 'view' || purpose === 'preview') && !caps.canView) {
      return 'DENIED_VIEW_POLICY';
    }
    return undefined;
  }
}
