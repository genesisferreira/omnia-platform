import type { RuntimeAnswer } from '@omnia/neurofrigo-runtime';

import type {
  CommercialRecommendation,
  CommercialRecommendations,
  SalesContext,
} from '../domain/types';

function emptyRecs(): CommercialRecommendations {
  return {
    products: [],
    services: [],
    courses: [],
    trainings: [],
    consulting: [],
  };
}

function pushUnique(list: CommercialRecommendation[], item: CommercialRecommendation, max = 5) {
  if (list.length >= max) return;
  const key = item.title.toLowerCase();
  if (list.some((x) => x.title.toLowerCase() === key)) return;
  list.push(item);
}

/**
 * Extrai recomendações somente a partir de texto de fontes + títulos de cursos publicados.
 * Nunca inventa itens fora do material.
 */
export function buildCommercialRecommendations(input: {
  answer: RuntimeAnswer;
  salesContext: SalesContext;
  publishedCourseTitles?: string[];
}): CommercialRecommendations {
  const out = emptyRecs();
  const sources = input.answer.sources || [];
  if (!sources.length) return out;

  const courseTitles = (input.publishedCourseTitles || []).map((t) => t.trim()).filter(Boolean);

  for (const src of sources) {
    const text = (src.text || '').replace(/\s+/g, ' ').trim();
    if (!text) continue;
    const chunkId = src.chunkId ? String(src.chunkId) : null;
    const lower = text.toLowerCase();

    for (const line of input.salesContext.businessLines) {
      if (line && lower.includes(line.toLowerCase())) {
        pushUnique(out.products, {
          type: 'product',
          title: line,
          reason: 'Mencionado nas fontes recuperadas.',
          sourceChunkId: chunkId,
        });
      }
    }
    for (const cat of input.salesContext.allowedCatalog) {
      if (cat && lower.includes(cat.toLowerCase())) {
        const type: CommercialRecommendation['type'] = /curso|trein/i.test(cat)
          ? 'course'
          : /consult/i.test(cat)
            ? 'consulting'
            : /servi[cç]o/i.test(cat)
              ? 'service'
              : 'product';
        const bucket =
          type === 'course'
            ? out.courses
            : type === 'consulting'
              ? out.consulting
              : type === 'service'
                ? out.services
                : out.products;
        pushUnique(bucket, {
          type,
          title: cat,
          reason: 'Presente no catálogo permitido e nas FONTES.',
          sourceChunkId: chunkId,
        });
      }
    }

    if (/treinament|capacita[cç][aã]o|curso/i.test(text)) {
      pushUnique(out.trainings, {
        type: 'training',
        title: text.slice(0, 80),
        reason: 'Treinamento referido nas FONTES.',
        sourceChunkId: chunkId,
      });
    }
    if (/consultoria/i.test(text)) {
      pushUnique(out.consulting, {
        type: 'consulting',
        title: 'Consultoria (conforme FONTES)',
        reason: 'Consultoria referida nas FONTES.',
        sourceChunkId: chunkId,
      });
    }
    if (/suporte|servi[cç]o|implanta[cç][aã]o/i.test(text)) {
      pushUnique(out.services, {
        type: 'service',
        title: text.slice(0, 80),
        reason: 'Serviço referido nas FONTES.',
        sourceChunkId: chunkId,
      });
    }

    for (const title of courseTitles) {
      if (lower.includes(title.toLowerCase().slice(0, Math.min(24, title.length)))) {
        pushUnique(out.courses, {
          type: 'course',
          title,
          reason: 'Curso publicado alinhado às FONTES.',
          sourceChunkId: chunkId,
        });
      }
    }
  }

  return out;
}
