/**
 * @omnia/ai-core — Motor de IA da Omnia Platform.
 *
 * Arquitetura definitiva (Sprint 1.1):
 * - providers/        — Interface unificada LLM
 * - router/           — Roteamento DeepSeek ↔ OpenAI
 * - agents/           — Agentes por domínio
 * - assistant/        — Assistente Omnia (UX)
 * - prompts/          — Prompt library versionada
 * - knowledge/        — Base de conhecimento
 * - rag/              — Retrieval-Augmented Generation
 * - embeddings/       — Geração de vetores
 * - vector-store/     — Armazenamento vetorial
 * - memory/           — Memória curto/longo prazo
 * - sessions/         — Sessões de conversa
 * - context/          — Contexto dinâmico
 * - tools/            — Function calling
 * - workflow-engine/  — Orquestração de chains
 * - models/           — Configuração de modelos
 *
 * Conectores raw: @omnia/integrations
 * Documentação: AI_ARCHITECTURE.md
 */
export {};
