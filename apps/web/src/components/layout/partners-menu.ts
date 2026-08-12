/**
 * Helpers do dropdown Parceiros (disclosure).
 * Fecha só quando o foco/clique sai do contentor — nunca no blur interno para os links.
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
