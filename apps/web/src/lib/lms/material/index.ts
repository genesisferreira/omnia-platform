export type {
  MaterialDescriptor,
  MaterialMetadata,
  MaterialPermissions,
  MaterialRendererKey,
  MaterialSource,
  MaterialType,
  MaterialUiState,
  ResolvedMaterial,
} from './types';

export {
  buildMaterialsFromLesson,
  findMaterialNeighbors,
  resolveMaterial,
  type BuildMaterialsInput,
  type ResolveMaterialInput,
} from './resolve-material';

export {
  createControlledSecurityPorts,
  createStubSecurityPorts,
  type MaterialSecurityPorts,
  type MediaAuthorizationPort,
  type MediaAuthorizeRequest,
  type MediaAuthorizeResult,
  type ProtectedViewerPort,
  type SignedUrlPort,
  type WatermarkPort,
} from './security-ports';
