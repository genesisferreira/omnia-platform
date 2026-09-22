export type OfficialClassification = {
  companySlug: string;
  companyName: string;
  categoryName: string;
  subcategoryName: string | null;
  knowledgeArea: string;
  allowedAgents: string[];
  securityClassification: 'PUBLIC' | 'STUDENT' | 'TEACHER_MANAGER' | 'CLIENT_PARTNER';
  technicalRiskLevel: 'low' | 'medium' | 'high';
  title: string;
  tags: string[];
};

function normalize(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Classificação heurística da carga oficial EPIC 10
 * (empresa / categoria / subcategoria / agentes).
 */
export function classifyOfficialDocument(args: {
  filename: string;
  textPreview?: string;
}): OfficialClassification {
  const name = normalize(args.filename);
  const preview = normalize(args.textPreview || '');
  const blob = `${name} ${preview}`.slice(0, 8000);

  if (
    blob.includes('plano de implantacao') ||
    blob.includes('omnia platform') ||
    name.includes('omnia-plataforma') ||
    name.includes('onmia')
  ) {
    return {
      companySlug: 'omnia-frigo-holding',
      companyName: 'Omnia Frigo Holding',
      categoryName: 'Institucional',
      subcategoryName: 'Plano de Implantação',
      knowledgeArea: 'institucional',
      allowedAgents: ['concierge', 'commercial', 'support', 'content-production', 'command'],
      securityClassification: 'TEACHER_MANAGER',
      technicalRiskLevel: 'low',
      title: 'Omnia Platform — Plano de Implantação Fase 1',
      tags: ['epic10', 'oficial', 'institucional', 'mvp'],
    };
  }

  if (
    blob.includes('transcritico') ||
    blob.includes('co2') ||
    blob.includes('neuro frigo') ||
    blob.includes('neurofrigo') ||
    name.includes('controle-ia') ||
    name.includes('refrigeracao')
  ) {
    return {
      companySlug: 'neurofrigo',
      companyName: 'Neurofrigo Command IA',
      categoryName: 'CO₂',
      subcategoryName: 'Controle com IA',
      knowledgeArea: 'neurofrigo',
      allowedAgents: [
        'refrigeration',
        'neurofrigo-technology',
        'electrical-controls',
        'tutor',
        'projects-lab',
        'content-production',
        'evaluator',
        'radar',
      ],
      securityClassification: 'STUDENT',
      technicalRiskLevel: 'medium',
      title: 'Neuro Frigo — Controle de IA para Refrigeração (CO₂ Transcrítico)',
      tags: ['epic10', 'oficial', 'co2', 'ia', 'comando-eletrico', 'curso'],
    };
  }

  if (name.endsWith('.md') || name.includes('readme') || name.includes('manifesto')) {
    return {
      companySlug: 'neurofrigo',
      companyName: 'Neurofrigo Command IA',
      categoryName: 'Neurofrigo',
      subcategoryName: 'Knowledge Hub',
      knowledgeArea: 'neurofrigo',
      allowedAgents: ['tutor', 'content-production', 'support', 'concierge'],
      securityClassification: 'PUBLIC',
      technicalRiskLevel: 'low',
      title: 'Knowledge Hub — Manifesto EPIC 10',
      tags: ['epic10', 'oficial', 'manifesto'],
    };
  }

  return {
    companySlug: 'neurofrigo',
    companyName: 'Neurofrigo Command IA',
    categoryName: 'Cursos',
    subcategoryName: null,
    knowledgeArea: 'cursos',
    allowedAgents: ['tutor', 'content-production', 'support'],
    securityClassification: 'STUDENT',
    technicalRiskLevel: 'low',
    title: args.filename.replace(/\.[^.]+$/, '') || 'Documento Knowledge Hub',
    tags: ['epic10', 'oficial'],
  };
}

export function isPendingArchive(filename: string): boolean {
  const n = filename.toLowerCase();
  return n.endsWith('.rar') || n.endsWith('.7z') || n.endsWith('.zip');
}

export function mimeForFilename(filename: string): string {
  const n = filename.toLowerCase();
  if (n.endsWith('.pdf')) return 'application/pdf';
  if (n.endsWith('.docx')) {
    return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  }
  if (n.endsWith('.pptx')) {
    return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
  }
  if (n.endsWith('.md') || n.endsWith('.markdown')) return 'text/markdown';
  if (n.endsWith('.txt')) return 'text/plain';
  if (n.endsWith('.rar')) return 'application/vnd.rar';
  return 'application/octet-stream';
}
