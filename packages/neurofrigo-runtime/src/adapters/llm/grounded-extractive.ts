import type { HealthStatus, LLMCompletion } from '../../domain/types';
import type { LLMProviderPort } from '../../ports';
import { synthesizeConversationalAnswer } from '../../conversation/synthesize-answer';

/**
 * Provider default — sintetiza resposta conversacional ancorada nas evidências.
 * Nunca devolve raw chunks / markers / [chunk:id] como corpo principal.
 */
export class GroundedExtractiveProvider implements LLMProviderPort {
  private readonly model: string;
  private readonly name: string;

  constructor(opts?: { model?: string; name?: string }) {
    this.model = opts?.model ?? 'grounded-extractive-v2';
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
    const assistantKey = this.parseAssistantKey(input.system);
    const history = this.parseHistory(input.user);

    let text = synthesizeConversationalAnswer({
      question,
      evidence: sources.map((s) => ({ id: s.id, text: s.text })),
      intent,
      assistantKey,
      history,
    });

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

  private parseAssistantKey(system: string): string | null {
    const m = /Assistente:\s*([a-z0-9_-]+)/i.exec(system);
    return m?.[1]?.toLowerCase() || null;
  }

  private parseQuestion(user: string): string {
    const m = /PERGUNTA\n([\s\S]*)$/m.exec(user);
    return (m?.[1] || user).trim();
  }

  private parseHistory(user: string): Array<{ question: string; answer: string }> {
    const block = /HISTÓRICO DA SESSÃO\n([\s\S]*?)(?:\n\nFONTES|\n\nPERGUNTA)/m.exec(user)?.[1];
    if (!block || /nenhum/i.test(block)) return [];
    const out: Array<{ question: string; answer: string }> = [];
    const turns = block.split(/\n(?=Usuário:)/i);
    for (const turn of turns) {
      const q = /Usuário:\s*(.+)/i.exec(turn)?.[1]?.trim();
      const a = /Assistente:\s*([\s\S]+)/i.exec(turn)?.[1]?.trim();
      if (q && a) out.push({ question: q, answer: a.slice(0, 500) });
    }
    return out;
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
