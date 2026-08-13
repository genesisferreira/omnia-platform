import { applyStatePatch } from './conversation-state';
import type { ConversationState } from './dialogue-types';
import { normalizeUserUtterance } from './dialogue-acts';

function pushFact(facts: string[], fact: string): string[] {
  if (facts.includes(fact)) return facts;
  return [...facts, fact].slice(-24);
}

/**
 * Extract durable user facts from the utterance and merge into state.
 */
export function extractAndApplyUserFacts(
  state: ConversationState,
  question: string,
): ConversationState {
  const q = normalizeUserUtterance(question);
  let next = { ...state };
  const facts = [...(state.knownUserFacts || state.knownFacts || [])];

  const years = /(\d+)\s*anos?/i.exec(q);
  if (years) {
    const n = Number(years[1]);
    next = applyStatePatch(next, {
      experienceYears: n,
      userExperienceYears: n,
      experienceLevel: n >= 5 ? 'intermediate' : n >= 2 ? 'intermediate' : 'beginner',
      // Keep catalog metadata separate — do not force course level mutation.
      userLevel: next.userLevel,
    });
    facts.push(`experienceYears=${n}`);
  }

  if (/j[aá]\s+trabalho|trabalho h[aá]|trabalho com|j[aá] atuo/i.test(q) && !years) {
    next = applyStatePatch(next, {
      experienceLevel: next.experienceLevel || 'intermediate',
    });
    facts.push('experience=working');
  }

  if (/sou iniciante|estou come[cç]ando|sem experi[eê]ncia/i.test(q)) {
    next = applyStatePatch(next, {
      experienceLevel: 'beginner',
      userLevel: 'beginner',
    });
    facts.push('experienceLevel=beginner');
  }

  if (/refrigera[cç][aã]o comercial|\bcomercial\b/i.test(q) && !/industrial/i.test(q)) {
    next = applyStatePatch(next, {
      technicalArea: 'commercial_refrigeration',
      interestArea: next.interestArea,
      userInterest: 'commercial_refrigeration',
    });
    facts.push('technicalArea=commercial_refrigeration');
  }

  if (/industrial/i.test(q) && /migrar|quero ir|quero migrar|passar para|ir para/i.test(q)) {
    next = applyStatePatch(next, {
      userGoal: 'transition_to_industrial_refrigeration',
      conversationGoal: 'transition_to_industrial_refrigeration',
      interestArea: 'industrial_refrigeration',
    });
    facts.push('userGoal=transition_to_industrial_refrigeration');
  } else if (/industrial/i.test(q)) {
    next = applyStatePatch(next, {
      technicalArea: next.technicalArea || 'industrial_refrigeration',
      interestArea: 'industrial_refrigeration',
      userInterest: 'industrial_refrigeration',
    });
    facts.push('interestArea=industrial_refrigeration');
  }

  if (/climatiza/i.test(q)) {
    next = applyStatePatch(next, {
      technicalArea: 'hvac',
      userInterest: 'hvac',
    });
    facts.push('technicalArea=hvac');
  }

  const stores = /(\d+)\s*lojas?/i.exec(q);
  if (stores) {
    const n = Number(stores[1]);
    next = applyStatePatch(next, {
      commercialContext: {
        storeCount: n,
        numberOfUnits: n,
        sector: next.commercialContext?.sector ?? null,
        goal: next.commercialContext?.goal ?? null,
        hasColdRooms: next.commercialContext?.hasColdRooms ?? null,
        pain: next.commercialContext?.pain ?? null,
      },
    });
    facts.push(`numberOfUnits=${n}`);
  }

  if (/todas t[eê]m c[aâ]mara|c[aâ]mara fria|c[aâ]maras? frias?/i.test(q)) {
    next = applyStatePatch(next, {
      commercialContext: {
        ...(next.commercialContext || {}),
        hasColdRooms: true,
      },
    });
    facts.push('hasColdRooms=true');
  }

  if (/consumo|energia|conta de energia|gasto aument/i.test(q)) {
    next = applyStatePatch(next, {
      commercialContext: {
        ...(next.commercialContext || {}),
        goal: 'energy_reduction',
        pain: 'energy_cost',
        sector: /supermercado/i.test(q) ? 'supermarket' : (next.commercialContext?.sector ?? null),
      },
      userGoal: next.userGoal || 'reduce_energy_cost',
    });
    facts.push('pain=energy_cost');
  }

  const setpoint =
    /(?:deveria|setpoint|desejad[ao]).*?(-?\d+)\s*°?C?/i.exec(q) || /chegar a\s*(-?\d+)/i.exec(q);
  if (setpoint) {
    next = applyStatePatch(next, {
      engineeringContext: {
        ...(next.engineeringContext || {}),
        setpointC: Number(setpoint[1]),
      },
    });
    facts.push(`setpointC=${setpoint[1]}`);
  }

  const actual =
    /fica em\s*(-?\d+)/i.exec(q) ||
    /atual(?:mente)?\s*(-?\d+)/i.exec(q) ||
    /est[aá] em\s*(-?\d+)/i.exec(q);
  if (actual && !/psi/i.test(q)) {
    next = applyStatePatch(next, {
      engineeringContext: {
        ...(next.engineeringContext || {}),
        actualTempC: Number(actual[1]),
        symptom: next.engineeringContext?.symptom || q,
      },
    });
    facts.push(`actualTempC=${actual[1]}`);
  }

  const ref = /\b(R404A|R134a|R22|R290|R744|CO2)\b/i.exec(q);
  if (ref) {
    next = applyStatePatch(next, {
      engineeringContext: {
        ...(next.engineeringContext || {}),
        refrigerant: ref[1]!.toUpperCase().replace('CO2', 'R744'),
      },
    });
    facts.push(`refrigerant=${ref[1]}`);
  }

  const suc = /suc[cç][aã]o\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i.exec(q);
  const disc = /(?:descarga|condensa[cç][aã]o)\s*[:=]?\s*(\d+(?:[.,]\d+)?)/i.exec(q);
  const barePsi = [...q.matchAll(/(\d+(?:[.,]\d+)?)\s*psi/gi)].map((x) =>
    Number(String(x[1]).replace(',', '.')),
  );
  if (suc || disc || barePsi.length) {
    let suctionPsi = suc
      ? Number(String(suc[1]).replace(',', '.'))
      : (next.engineeringContext?.suctionPsi ?? null);
    let dischargePsi = disc
      ? Number(String(disc[1]).replace(',', '.'))
      : (next.engineeringContext?.dischargePsi ?? null);
    if (suc == null && disc == null && barePsi.length) {
      if (/descarga|condensa/i.test(q)) {
        dischargePsi = barePsi[0] ?? dischargePsi;
      } else if (/suc[cç]/i.test(q)) {
        suctionPsi = barePsi[0] ?? suctionPsi;
      } else if (barePsi.length >= 2) {
        suctionPsi = barePsi[0] ?? suctionPsi;
        dischargePsi = barePsi[1] ?? dischargePsi;
      } else if (suctionPsi == null) {
        suctionPsi = barePsi[0] ?? null;
      } else if (dischargePsi == null) {
        dischargePsi = barePsi[0] ?? null;
      }
    }
    next = applyStatePatch(next, {
      engineeringContext: {
        ...(next.engineeringContext || {}),
        suctionPsi,
        dischargePsi,
      },
    });
  }

  return applyStatePatch(next, {
    knownUserFacts: facts.reduce((acc, f) => pushFact(acc, f), [] as string[]),
    knownFacts: facts.reduce((acc, f) => pushFact(acc, f), [...(next.knownFacts || [])]),
  });
}
