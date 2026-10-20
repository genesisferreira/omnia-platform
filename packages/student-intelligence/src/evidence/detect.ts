export function detectCompetencyFromText(text: string): string | null {
  const t = text.toLowerCase();
  if (/\bco\s*2\b|co₂|dioxido\s+de\s+carbono|transcr[ií]tico/i.test(t)) return 'co2';
  if (/eletric|tens[aã]o|corrente|motor\s+el[eé]tric/i.test(t)) return 'eletricidade';
  if (/comando|clp|partida|contatores?/i.test(t)) return 'comandos';
  if (/termodin|ciclo\s+de\s+carnot|entalpia|evapora/i.test(t)) return 'termodinamica';
  if (/automa[cç][aã]o|sensor|ihmi|plc|scada/i.test(t)) return 'automacao';
  if (/\bhvac\b|climatiza|ar\s+condicionado|ventil/i.test(t)) return 'hvac';
  if (/efici[eê]ncia\s+energ|cop\b|seer|consumo\s+energ/i.test(t)) {
    return 'eficiencia-energetica';
  }
  return null;
}
