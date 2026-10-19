export const MARKETPLACE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const MARKETPLACE_DATASHEET_MAX_BYTES = 10 * 1024 * 1024;
export const MARKETPLACE_LISTING_MAX_IMAGES = 8;
/** Corpo multipart máximo aceito pela rota de upload (maior arquivo + folga dos campos). */
export const MARKETPLACE_UPLOAD_MAX_BODY_BYTES = MARKETPLACE_DATASHEET_MAX_BYTES + 256 * 1024;

export const MARKETPLACE_PDF_UPLOAD_DISABLED_MESSAGE =
  'O envio de ficha técnica em PDF está temporariamente desabilitado.';

/**
 * Upload de ficha técnica em PDF do Marketplace. Desligado por padrão: só liga com
 * `MARKETPLACE_PDF_UPLOAD_ENABLED=true` explícito no ambiente do servidor.
 */
export function isMarketplacePdfUploadEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.MARKETPLACE_PDF_UPLOAD_ENABLED?.trim().toLowerCase() === 'true';
}

export type MarketplaceFileType = {
  kind: 'image' | 'pdf';
  mime: 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';
  ext: 'jpg' | 'png' | 'webp' | 'pdf';
};

function startsWith(buffer: Uint8Array, bytes: readonly number[], offset = 0): boolean {
  if (buffer.length < offset + bytes.length) return false;
  return bytes.every((byte, index) => buffer[offset + index] === byte);
}

/**
 * Tipo real pelo conteúdo (assinatura binária). Ignora nome e MIME declarados, então SVG, HTML
 * e executáveis renomeados para `.jpg` ou `.pdf` são rejeitados.
 */
export function detectMarketplaceFileType(buffer: Uint8Array): MarketplaceFileType | null {
  if (startsWith(buffer, [0xff, 0xd8, 0xff]))
    return { kind: 'image', mime: 'image/jpeg', ext: 'jpg' };
  if (startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { kind: 'image', mime: 'image/png', ext: 'png' };
  }
  if (
    startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(buffer, [0x57, 0x45, 0x42, 0x50], 8)
  ) {
    return { kind: 'image', mime: 'image/webp', ext: 'webp' };
  }
  if (startsWith(buffer, [0x25, 0x50, 0x44, 0x46, 0x2d]))
    return { kind: 'pdf', mime: 'application/pdf', ext: 'pdf' };
  return null;
}
