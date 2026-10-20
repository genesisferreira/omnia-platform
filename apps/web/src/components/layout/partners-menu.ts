/**
 * Helpers dos dropdowns do menu principal (padrão disclosure).
 * Um único menu aberto por vez; fecha quando o foco/clique sai do contentor do menu aberto.
 */

function isDomNode(value: EventTarget | null): value is Node {
  return (
    typeof value === 'object' &&
    value !== null &&
    'nodeType' in value &&
    typeof (value as Node).nodeType === 'number'
  );
}

export function isFocusLeavingContainer(
  container: HTMLElement | null,
  relatedTarget: EventTarget | null,
): boolean {
  if (!container) {
    return true;
  }

  if (!isDomNode(relatedTarget)) {
    return true;
  }

  return !container.contains(relatedTarget);
}

export function isPointerOutsideContainer(
  container: HTMLElement | null,
  target: EventTarget | null,
): boolean {
  if (!container) {
    return true;
  }

  if (!isDomNode(target)) {
    return true;
  }

  return !container.contains(target);
}

/** Clique no botão de um menu: abre esse e fecha qualquer outro; clicar no aberto fecha. */
export function toggleOpenMenu(current: string | null, key: string): string | null {
  return current === key ? null : key;
}

/** Margem mínima entre o painel e a borda da janela. */
export const MENU_VIEWPORT_MARGIN = 8;

/**
 * Alinha o painel à direita do botão quando, alinhado à esquerda, ele ultrapassaria a borda
 * direita da janela (evita menu cortado nos últimos itens do cabeçalho).
 */
export function shouldAlignMenuRight(
  triggerLeft: number,
  panelWidth: number,
  viewportWidth: number,
  margin = MENU_VIEWPORT_MARGIN,
): boolean {
  return triggerLeft + panelWidth > viewportWidth - margin;
}
