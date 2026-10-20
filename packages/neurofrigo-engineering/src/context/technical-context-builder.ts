import type { EngineeringProfile, TechnicalContext, TechnicalHint } from '../domain/types';

/**
 * TechnicalContextBuilder — monta contexto técnico a partir do perfil + hint.
 * Não acessa banco; não duplica ContextBuilder do Runtime.
 */
export function buildTechnicalContext(input: {
  profile: EngineeringProfile;
  technicalHint?: TechnicalHint | null;
}): TechnicalContext {
  const hint = input.technicalHint || {};
  const specialty = (hint.specialty || input.profile.specialty || 'HVAC-R').trim();
  const equipment = (hint.equipment || '').trim();
  const documentCategory = (hint.documentCategory || '').trim();
  const technologyLine = (hint.technologyLine || '').trim();

  const lines = [
    `Empresa: ${input.profile.companyName}`,
    `Área técnica: ${input.profile.technicalArea}`,
    `Especialidade: ${specialty}`,
    `Idioma: ${input.profile.language}`,
    `Linhas tecnológicas autorizadas: ${input.profile.technologyLines.join(', ') || 'n/d'}`,
    `Permissões: ${input.profile.permissions.join(', ') || 'published+allowAiUse'}`,
  ];
  if (equipment) lines.push(`Equipamento relacionado: ${equipment}`);
  if (documentCategory) lines.push(`Categoria de documento: ${documentCategory}`);
  if (technologyLine) lines.push(`Linha tecnológica em foco: ${technologyLine}`);
  if (input.profile.engineeringPolicy.trim()) {
    lines.push(`Política de engenharia:\n${input.profile.engineeringPolicy.trim()}`);
  }
  lines.push(
    'Regras: nunca inventar normas, dimensionamentos ou diagnósticos definitivos; use somente FONTES autorizadas do Knowledge Hub; não cite documentos internos restritos; confirme sempre a necessidade de inspeção técnica em campo.',
  );

  return {
    companyName: input.profile.companyName,
    technicalArea: input.profile.technicalArea,
    specialty,
    language: input.profile.language,
    technologyLines: input.profile.technologyLines,
    permissions: input.profile.permissions,
    engineeringPolicy: input.profile.engineeringPolicy,
    hint,
    summaryText: lines.join('\n'),
  };
}
