import type { RuntimeAnswer } from '@omnia/neurofrigo-runtime';

import type {
  EngineeringRecommendation,
  EngineeringRecommendations,
  TechnicalContext,
} from '../domain/types';

function emptyRecs(): EngineeringRecommendations {
  return {
    courses: [],
    trainings: [],
    documents: [],
    procedures: [],
    norms: [],
  };
}

function pushUnique(list: EngineeringRecommendation[], item: EngineeringRecommendation, max = 5) {
  if (list.length >= max) return;
  const key = item.title.toLowerCase();
  if (list.some((x) => x.title.toLowerCase() === key)) return;
  list.push(item);
}

/**
 * Recomendações somente a partir de fontes + títulos de cursos publicados.
 */
export function buildEngineeringRecommendations(input: {
  answer: RuntimeAnswer;
  technicalContext: TechnicalContext;
  publishedCourseTitles?: string[];
}): EngineeringRecommendations {
  const out = emptyRecs();
  const sources = input.answer.sources || [];
  if (!sources.length) return out;

  const courseTitles = (input.publishedCourseTitles || []).map((t) => t.trim()).filter(Boolean);

  for (const src of sources) {
    const text = (src.text || '').replace(/\s+/g, ' ').trim();
    if (!text) continue;
    const chunkId = src.chunkId ? String(src.chunkId) : null;
    const lower = text.toLowerCase();

    for (const line of input.technicalContext.technologyLines) {
      if (line && lower.includes(line.toLowerCase())) {
        pushUnique(out.documents, {
          type: 'document',
          title: line,
          reason: 'Linha tecnológica referida nas FONTES.',
          sourceChunkId: chunkId,
        });
      }
    }

    if (/norma|iso|ashrae|nbr|anvisa|inmetro/i.test(text)) {
      pushUnique(out.norms, {
        type: 'norm',
        title: text.slice(0, 100),
        reason: 'Norma/procedimento referido nas FONTES (não inventado).',
        sourceChunkId: chunkId,
      });
    }
    if (/procedimento|checklist|passo\s+a\s+passo|manuten[cç][aã]o/i.test(text)) {
      pushUnique(out.procedures, {
        type: 'procedure',
        title: text.slice(0, 100),
        reason: 'Procedimento referido nas FONTES.',
        sourceChunkId: chunkId,
      });
    }
    if (/treinament|capacita[cç][aã]o|curso/i.test(text)) {
      pushUnique(out.trainings, {
        type: 'training',
        title: text.slice(0, 80),
        reason: 'Treinamento referido nas FONTES.',
        sourceChunkId: chunkId,
      });
    }
    if (/documento|manual|especifica[cç][aã]o|datasheet/i.test(text)) {
      pushUnique(out.documents, {
        type: 'document',
        title: text.slice(0, 80),
        reason: 'Documentação referida nas FONTES.',
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
