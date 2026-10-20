import { naturalizeUserText } from './naturalize-text';

const FORBIDDEN_ENGINE = [
  /j[aá] apresentei/i,
  /para n[aã]o repetir/i,
  /como j[aá] falei/i,
  /pontos principais do material/i,
  /EPIC16_PUBLIC/i,
  /\[chunk:/i,
  /\bRAG\b/,
  /\bCitations\b/,
  /\bRouting\b/,
];

/**
 * Final gate before user-facing text leaves the runtime.
 */
export function validateAndRewriteResponse(input: {
  text: string;
  catalogLevels?: Array<{ title: string; level?: string | null }>;
  claimedLevelLabel?: string | null;
}): { text: string; rewriteTriggered: boolean; violations: string[] } {
  let text = naturalizeUserText(input.text);
  const violations: string[] = [];

  if (/^#{1,6}\s|##\s/m.test(text)) {
    violations.push('NO_INTERNAL_MARKDOWN_STRUCTURE');
    text = text.replace(/^#{1,6}\s*/gm, '').replace(/##\s*[^\n]+/g, '');
  }
  for (const re of FORBIDDEN_ENGINE) {
    if (re.test(text)) {
      violations.push('NO_INTERNAL_ENGINE_LANGUAGE');
      text = naturalizeUserText(text);
      break;
    }
  }
  if (/Omnia Frigo Holding\s+A\s+Omnia Frigo Holding/i.test(text)) {
    violations.push('NO_RAW_CHUNK');
    text = naturalizeUserText(text);
  }

  // Recommendation integrity: never claim Intermediate for a beginner-only catalog pick.
  if (input.catalogLevels?.length) {
    const beginnerOnly = input.catalogLevels.every((c) =>
      /beginner|inician|intro|b[aá]sic|fundament/i.test(`${c.level || ''} ${c.title}`),
    );
    if (beginnerOnly && /intermedi[aá]rio/i.test(text) && /recomend|indicad|curso/i.test(text)) {
      violations.push('NO_METADATA_MUTATION');
      text = text.replace(/intermedi[aá]rio/gi, 'introdutório / Iniciante no catálogo');
    }
  }

  text = naturalizeUserText(text).trim();
  if (!text) {
    text = 'Posso continuar — me diga o próximo ponto que você quer esclarecer.';
    violations.push('EMPTY_AFTER_SANITIZE');
  }

  return {
    text,
    rewriteTriggered: violations.length > 0,
    violations,
  };
}
