import type { SiteResolutionResult } from '../site-resolver';

export type SiteRequestContext = {
  hostname: string;
  resolution: SiteResolutionResult;
};
