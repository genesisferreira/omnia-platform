import type { HealthStatus, LLMCompletion } from '../../domain/types';
import type { LLMProviderPort } from '../../ports';

/**
 * Provider default — resposta ancorada exclusivamente nos chunks recuperados.
 */
export class GroundedExtractiveProvider implements LLMProviderPort {
  private readonly model: string;
  private readonly name: string;

  constructor(opts?: { model?: string; name?: string }) {
    this.model = opts?.model ?? 'grounded-extractive-v1';
    this.name = opts?.name ?? 'grounded';
  }

  metadata() {
    return { name: this.name, model: this.model };
  }

  async health(): Promise<HealthStatus> {
    return { ok: true, detail: `${this.name}/${this.model} ready` };
  }

  async complete(input: {
    system: string;
    user: string;
    maxTokens: number;
  }): Promise<LLMCompletion> {
    const sources = this.parseSources(input.user);
    const question = this.parseQuestion(input.user);
    const intent = this.parseIntent(input.system);

    let text: string;
    if (!sources.length) {
      text =
        'Não encontrei essa informação no conteúdo autorizado deste curso. Posso responder apenas com base no material publicado.';
    } else {
      const bullets = sources.slice(0, 4).map((s, i) => {
        const excerpt = s.text.slice(0, 260).trim().replace(/\s+/g, ' ');
        return `${i + 1}. ${excerpt}${s.text.length > 260 ? '…' : ''} [chunk:${s.id}]`;
      });

      if (intent.includes('procedural') || intent.includes('troubleshooting')) {
        text = [
          `Com base no material autorizado sobre “${question.slice(0, 100)}”:`,
          '',
          ...bullets,
          '',
          'Observação técnica: confirme os parâmetros e procedimentos descritos no material do curso.',
        ].join('\n');
      } else if (intent.includes('comparative')) {
        text = [
          `Comparativo com base no material:`,
          '',
          ...bullets,
        ].join('\n');
      } else {
        text = [
          `Pontos principais do material sobre “${question.slice(0, 100)}”:`,
          '',
          ...bullets.map((b) => b.replace(/^\d+\.\s/, '- ')),
        ].join('\n');
      }
    }

    if (text.length > input.maxTokens * 4) {
      text = text.slice(0, input.maxTokens * 4);
    }

    const promptTokens = Math.ceil((input.system.length + input.user.length) / 4);
    const completionTokens = Math.ceil(text.length / 4);

    return {
      text,
      model: this.model,
      provider: this.name,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      finishReason: 'stop',
    };
  }

  private parseIntent(system: string): string {
    const m = /Intenção detectada:\s*(\w+)/i.exec(system);
    return (m?.[1] || '').toLowerCase();
  }

  private parseQuestion(user: string): string {
    const m = /PERGUNTA\n([\s\S]*)$/m.exec(user);
    return (m?.[1] || user).trim();
  }

  private parseSources(user: string): Array<{ id: string; text: string }> {
    const block = /FONTES\n([\s\S]*?)\n\nPERGUNTA/m.exec(user)?.[1] || '';
    if (!block || block.includes('(nenhuma)')) return [];
    const parts = block.split(/\n(?=\[\d+\])/);
    const out: Array<{ id: string; text: string }> = [];
    for (const part of parts) {
      const idMatch = /chunk:([^\s\]]+)/.exec(part);
      if (!idMatch) continue;
      const lines = part.split('\n').slice(1);
      out.push({ id: idMatch[1]!, text: lines.join('\n').trim() });
    }
    return out;
  }
}
